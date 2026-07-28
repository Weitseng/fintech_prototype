/* ============================================================
   引擎層（三人共用，異動請走 PR 讓大家 review，避免各自為政）
   - 商品資料容器、全域對話狀態、畫面渲染工具、試算卡元件、共用結尾流程
   - 「提問→試算→清單→CTA」這套連接流程在 flow.js（同樣是共用，不分人）
   - 三人各自的內容只寫在 content-attr-a.js／content-attr-b.js／content-attr-c.js
   ============================================================ */

/* ================= 商品資料區（凱基智富管家） =================
   PRODUCT_DATA／RECO_REASON 依「使用者屬性」分 key：
   - deposit（屬性 C）由 content-attr-c.js 填入
   - bond（屬性 B）由 content-attr-b.js 填入
   - fund（屬性 A）由 content-attr-a.js 填入
   - combo（屬性 AB，橫跨債券＋基金）內容橫跨兩人，暫由三人共同維護，先放在這裡
   這裡只宣告容器＋combo，不要在這裡加 deposit/bond/fund，請到對應的 content-attr-*.js 加。
*/
const PRODUCT_DATA={
  combo:{key:'combo',name:'債券＋基金搭配',tag:'債券＋基金',rate:0.0525,color:'#5c34c2',colorDark:'#3d2488'}
};
const RECO_REASON={
  combo:`## 為什麼這個方向適合您
您希望兩者兼顧、想要搭配一下，債券＋基金的組合正好能同時兼顧穩定配息與成長潛力。

- **債券部位**：提供相對穩定的配息與明確的到期時間，作為這筆資金的穩定基礎；波動主要來自利率變動，以及（若為外幣計價）匯率變化，相對可預期
- **基金部位**：參與市場整體成長機會，不押注單一標的，長期潛力通常高於定存或債券，但淨值也會隨市場上下波動
- **搭配的用意**：債券與基金的漲跌不會完全同步，用債券分散基金的波動風險，同時保留一定的成長彈性，適合還在摸索自己風險偏好的您

這樣的組合，能讓這筆資金同時兼顧穩定與成長兩種特性；實際比例會依您的使用時間與風險承受度做調整，等一下的試算也能讓您自己拖動拉桿微調。`
};

/* ================= 全域對話狀態 =================
   欄位皆由 flow.js（共用流程）讀寫，三人的 content-attr-*.js 不需要碰這裡。
   新增欄位時請放進 resetAll()：
   assetRange, cashRatio, q1, depositWeight, q2, q3, attribute,
   recoType, path, h1Amt, h1Ratio, h2Items, h2Reason, recoTypeH, selectedProductCode
*/
let S={};
const screen=()=>document.getElementById('screen');
const ctrls=()=>document.getElementById('controls');
/* 每次有新內容加入時，不要整頁捲到最底，而是把「剛新增的這則」捲到畫面最上方，
   讓使用者看得到新資訊的開頭，其餘的自己往下滑。預設抓 chatBox 最後一個子節點當錨點，
   絕大多數呼叫端都是「先 appendChild，再呼叫 down()」，所以這個預設值幾乎都正確，
   不需要每個呼叫端自己傳錨點進來 */
const SCROLL_TOP_OFFSET=12;
const AT_BOTTOM_THRESHOLD=40;
let scrollBtn=null,scrollSpacer=null;
/* scrollSpacer：chatBox 之後、跟它同層的一塊空白墊高區，高度固定跟著 #screen 的 clientHeight 走。
   沒有這塊墊高，當「最新一則訊息」本身很短、後面累積的內容還不夠多時，
   瀏覽器的 scrollTop 會被夾在「內容自然結尾」，捲不到讓那則訊息頂到畫面最上方——
   於是就會像使用者回報的那樣，捲動之後還是看得到上一輪的問答。
   有了這塊墊高，永遠有「足夠多」可以捲的空間，任何一則訊息都能被頂到最上方，
   墊高本身會被捲出視窗外，使用者不會意識到它的存在（只會感覺到「下面先留白，等新回覆補上來」，
   這也是 Claude 官方 App 本身的捲動方式）。
   判斷「是否已經在最底部」／「捲到底部」都刻意用 chatBox 實際內容的下緣去算，
   而不是直接看 scrollHeight——否則這塊墊高會讓畫面永遠判斷成「還沒到底」。 */
function syncSpacer(){
  if(!scrollSpacer)return;
  scrollSpacer.style.height=screen().clientHeight+'px';
}
function down(anchor){
  const s=screen();
  syncSpacer();
  const el=anchor||(chatBox&&chatBox.lastElementChild);
  if(el){
    const cRect=s.getBoundingClientRect(),eRect=el.getBoundingClientRect();
    s.scrollTop=Math.max(0,s.scrollTop+(eRect.top-cRect.top)-SCROLL_TOP_OFFSET);
  }else{
    s.scrollTop=s.scrollHeight;
  }
  updateScrollBtn();
}
function isScreenAtBottom(){
  if(!chatBox)return true;
  const s=screen(),cRect=s.getBoundingClientRect(),chatRect=chatBox.getBoundingClientRect();
  return chatRect.bottom-cRect.bottom<AT_BOTTOM_THRESHOLD;
}
function updateScrollBtn(){
  if(!scrollBtn)return;
  scrollBtn.classList.toggle('show',!isScreenAtBottom());
}
function scrollToBottom(){
  const s=screen(),cRect=s.getBoundingClientRect(),chatRect=chatBox.getBoundingClientRect();
  s.scrollTop=Math.max(0,s.scrollTop+(chatRect.bottom-cRect.bottom));
  updateScrollBtn();
}
/* 換上新按鈕後多做一次「強制重繪」：把 min-height 解除、換上新內容這一連串樣式變動，
   在部分瀏覽器環境下版面計算是對的（DOM／CSSOM 都正確），但畫面沒有真的重繪，
   新按鈕會變成看不見的「隱形」內容，要等使用者之後不相關的操作才會補繪出來。
   用短暫切換 display 觸發一次同步 reflow，逼瀏覽器把這塊區域重新畫出來 */
function forceRepaint(el){el.style.display='none';void el.offsetHeight;el.style.display='';}
function setControls(node){freeOverride=null;const c=ctrls();c.style.minHeight='';c.style.display='';c.innerHTML='';if(node)c.appendChild(node);forceRepaint(c);down();}
/* 清空按鈕時先把目前高度凍結成 min-height，不要讓 #controls 立刻塌陷——
   否則 flex:1 的 #screen 會瞬間長高吃掉那塊空間，導致剛才 meSay() 算好要捲到「提問頂端」的位置整個失準
   （版面高度變了，同一個 scrollTop 對應到的畫面完全不同）。等 setControls() 換上新按鈕時才解除凍結，
   讓新內容自己決定高度（變高會撐開、變矮也不會在中途硬縮） */
function clearControls(){const c=ctrls();c.style.minHeight=c.offsetHeight+'px';c.innerHTML='';}
function wrap(){return document.createElement('div');}
function assetMid(){return {'100 萬以下':800000,'100 萬 – 200 萬':1500000,'200 萬以上':3200000}[S.assetRange]||1000000;}

function resetAll(){
  S={assetRange:null,cashRatio:null,q1:null,depositWeight:'mid',q2:null,q3:null,
     attribute:null,recoType:null,horizonOverride:false,path:null,h1Amt:null,h1Ratio:null,h2Items:null,h2Reason:null,recoTypeH:null,selectedProductCode:null};
  clearControls();stepA();
}

/* ================= Markdown 輔助（AI 訊息用） =================
   讓 aiSay() 的內容可以寫標題（#／##／###）、清單（- ）、粗體（**重點**）、斜體（*文字*）。
   既有的原始 HTML（如 <b>、<br>）不會被破壞，會原樣穿透。
*/
function mdInline(text){
  return text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
}
function mdToHtml(src){
  const lines=String(src).split(/\n/);
  const out=[];let inList=false;
  const closeList=()=>{if(inList){out.push('</ul>');inList=false;}};
  lines.forEach(raw=>{
    const line=raw.trim();
    if(line===''){closeList();return;}
    let m;
    if((m=line.match(/^###\s+(.*)/))){closeList();out.push(`<h3 class="md-h3">${mdInline(m[1])}</h3>`);return;}
    if((m=line.match(/^##\s+(.*)/))){closeList();out.push(`<h2 class="md-h2">${mdInline(m[1])}</h2>`);return;}
    if((m=line.match(/^#\s+(.*)/))){closeList();out.push(`<h1 class="md-h1">${mdInline(m[1])}</h1>`);return;}
    if((m=line.match(/^[-*]\s+(.*)/))){
      if(!inList){out.push('<ul class="md-ul">');inList=true;}
      out.push(`<li>${mdInline(m[1])}</li>`);return;
    }
    if((m=line.match(/^>\s?(.*)/))){closeList();out.push(`<div class="md-quote">${mdInline(m[1])}</div>`);return;}
    closeList();out.push(`<p class="md-p">${mdInline(line)}</p>`);
  });
  closeList();
  return out.join('');
}

/* ================= 對話輔助（共用渲染工具） ================= */
let chatBox=null,activeChoices=[],freeOverride=null,suppressNextEcho=false;
function enterChat(){showInput();activeChoices=[];const s=screen();s.innerHTML='';
  chatBox=wrap();chatBox.className='chat';s.appendChild(chatBox);
  scrollSpacer=document.createElement('div');scrollSpacer.className='scroll-spacer';s.appendChild(scrollSpacer);
  const scrollWrap=document.createElement('div');scrollWrap.className='scroll-bottom-wrap';
  scrollBtn=document.createElement('button');
  scrollBtn.type='button';scrollBtn.className='scroll-bottom-btn';scrollBtn.setAttribute('aria-label','回到最下方');
  scrollBtn.textContent='↓';scrollBtn.onclick=scrollToBottom;
  scrollWrap.appendChild(scrollBtn);s.appendChild(scrollWrap);
  syncSpacer();
  s.onscroll=updateScrollBtn;
  stageC();}
/* opts.label：依情境自訂 loading 文字（保底預設「管家思考中」，理論上每個呼叫都該自帶 label，
   保底值只是防呆，不該常態出現）；
   opts.heavy：標記為「理論上較複雜」的任務（資產分析、彙整、試算……），loading 總長拉到 BASE_DELAY+HEAVY_EXTRA，
   讓使用者感受到系統有在運算，即使回覆內容其實是預先寫好的。
   即使沒標 heavy，單則訊息字數超過 LONG_MSG_LEN 也會自動視為複雜內容，一併加長 */
const LONG_MSG_LEN=120;
const BASE_DELAY=900;
const HEAVY_EXTRA=1300;
const MSG_GAP=400;
function aiSay(msgs,done,opts){
  opts=opts||{};
  const label=opts.label||'管家思考中';
  let i=0;(function next(){
    if(i>=msgs.length){if(done)done();return;}
    const t=document.createElement('div');t.className='typing';
    t.innerHTML=`<span class="typing-label">${label}</span><span class="typing-dots"><span class="d"></span><span class="d"></span><span class="d"></span></span>`;
    /* 這裡故意不呼叫 down()：如果使用者才剛回答完問題，meSay() 已經把畫面捲到「提問＋回答」對齊頂端，
       這裡如果又捲一次會把那組畫面往上推、蓋掉剛才特地留住的提問。等真正的訊息換上來才需要捲動。 */
    chatBox.appendChild(t);
    const heavy=opts.heavy||msgs[i].length>LONG_MSG_LEN;
    setTimeout(()=>{t.remove();const m=document.createElement('div');m.className='ai-msg';
      m.innerHTML=mdToHtml(msgs[i]);chatBox.appendChild(m);down();i++;setTimeout(next,MSG_GAP);},BASE_DELAY+(heavy?HEAVY_EXTRA:0));
  })();
}
/* 需要使用者實際回答的提問句：用醒目的引言卡呈現（跟 aiSay 內文用 "> " 語法的效果一致），
   跟一般敘述性訊息區分開，讓使用者一眼看出「這句是要請你選」，不會被前面的說明文字稀釋掉 */
function aiAsk(question){
  const m=document.createElement('div');m.className='ai-msg';
  m.innerHTML=`<div class="md-quote">${mdInline(question)}</div>`;
  chatBox.appendChild(m);down();
}
/* 使用者送出回答後，畫面要捲到「使用者這則回答本身」的頂端（參考 Claude App 手機版的捲動方式）——
   之前的提問／整段對話歷史捲出視窗外，不干擾閱讀；下面留白，AI 開始輸出新內容時再自然接續、
   使用者也可以自己往下滑先看。這裡延到 requestAnimationFrame 才捲：呼叫端的慣例是
   「meSay() 接著馬上 clearControls()」，#controls 清空的瞬間 #screen 版面會重新計算，
   要等版面穩定之後才捲，才不會捲完又被版面變動蓋掉（見 clearControls()／setControls() 的說明）。 */
function meSay(text){if(suppressNextEcho){suppressNextEcho=false;return;}
  const bubbleRow=renderComponent('message/chat-bubble',text);
  requestAnimationFrame(()=>down(bubbleRow));
}
function choiceBtn(label,sub,onClick,keywords){const b=document.createElement('button');
  b.className='choice';b.innerHTML=label+(sub?'<small>'+sub+'</small>':'');
  b.onclick=()=>onClick(b);
  if(keywords)activeChoices.push({el:b,keywords});
  return b;}
/* ---- 限縮式自由輸入引擎 ---- */
function showInput(){const b=document.getElementById('inputbar');if(b)b.style.display='flex';}
function hideInput(){const b=document.getElementById('inputbar');if(b){b.style.display='none';const ci=b.querySelector('.icb-input');if(ci)ci.value='';}}
function matchChoices(text){const live=activeChoices.filter(c=>document.body.contains(c.el));
  for(const c of live){if((c.keywords||[]).some(k=>text.includes(k)))return c;}return null;}
function clarify(){aiSay(["為了幫您快速聚焦，您的想法比較接近下方哪一個選項呢？您可以直接點選，或換個說法再告訴我。"],null,{label:'管家確認中'});}
function handleFree(text){
  if(freeOverride){meSay(text);const h=freeOverride;freeOverride=null;h(text);return;}
  const c=matchChoices(text);
  if(c){meSay(text);suppressNextEcho=true;c.el.click();return;}
  meSay(text);clarify();
}
/* 資產配置圓餅圖已改用 chart/pie 元件（js/component-library.js）呈現，見 flow.js 的 stageC() */

/* ================= 試算共用工具 ================= */
function fmt(n){return Math.round(n).toLocaleString('en-US');}
function fmtPct(n){return (Math.round(n*100)/100).toString();}
/* 依 D-1（資金動用時間）決定留在活存的比例：可用時間越短，活存佔比越高 */
function keepPctFor(){return {high:70,mid:40,low:15}[S.depositWeight||'mid'];}
function investRationale(tag){
  const reason={high:'考量這筆資金可能在一年內就會用到',mid:'考量這筆資金的使用時間還不確定',low:'考量這筆資金一年以上都不會用到'}[S.depositWeight||'mid'];
  const keepPct=keepPctFor(),investPct=100-keepPct;
  return `${reason}，我建議先保留約 <b>${keepPct}%</b> 於活存以備不時之需，其餘約 <b>${investPct}%</b> 配置於${tag}——這是下方試算的預設比例，您也可以自行拖動拉桿調整成您覺得合適的配置。`;
}
/* 試算卡（債券／基金／外匯定存 vs 活存）已改用 card/calculator 元件（js/component-library.js）呈現，
   見 flow.js 的 enterProductCalc() */

/* 說明後的下一步選單（list/next-step 元件）：呼叫端傳入 heading／items（可帶 keywords），
   這裡包住每個 item 的 onSelect，負責「選好後」的對話流程業務邏輯：
   1) 整組選單（標題＋選項）從畫面移除　2) 用 aiAsk() 把標題留下來，變成一則普通的提問訊息，
      這樣才有東西可以讓 meSay() 之後捲動對齊（見 meSay() 的 questionEl 邏輯）
   3) 用 meSay() 補一個使用者訊息氣泡（內容為選到的標題）
   4) 才呼叫原本要做的事。元件本身只單純呼叫 onSelect，不知道這些流程規則。
   keywords 也接上 activeChoices 讓自由輸入能命中；按鈕一旦被移出畫面，
   matchChoices() 的 document.body.contains 檢查會自然把它排除，不需要另外清理。 */
function showNextSteps(heading,items){
  let el;
  const wrapped=items.map(item=>({
    ...item,
    onSelect:()=>{
      el.remove();
      aiAsk(heading);
      meSay(item.title);
      if(item.onSelect)item.onSelect();
    }
  }));
  el=renderComponent('list/next-step',heading,wrapped);
  const btns=el.querySelectorAll('.nsl-item');
  items.forEach((item,i)=>{if(item.keywords)activeChoices.push({el:btns[i],keywords:item.keywords});});
  return el;
}
/* ================= 完成（共用結尾流程） =================
   「立即申購」／「諮詢理專」共用同一個結尾：QR Code 滿意度回饋卡（card/feedback-qr，見
   js/component-library.js），不再各自顯示商品摘要小卡或前導訊息，直接呈現回饋卡。
   action 參數目前沒有拿來分流文案，先保留簽章以維持呼叫端相容，之後若兩條路要顯示不同內容再用。 */
function finishFlow(action){
  renderComponent('card/feedback-qr');
  clearControls();
  freeOverride=()=>aiSay(["本次分析已完成，如需重新開始，請點選上方的「再體驗一次」按鈕。"]);
}
