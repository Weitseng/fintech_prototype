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
/* 每次有新內容加入時，不要整頁捲到最底，而是把「剛新增的這則」（或整輪容器，見 currentTurnEl）
   捲到畫面最上方，讓使用者看得到新資訊的開頭，其餘的自己往下滑。預設抓 chatBox 最後一個
   子節點當錨點，絕大多數呼叫端都是「先 appendChild，再呼叫 down()」，所以這個預設值幾乎都正確，
   不需要每個呼叫端自己傳錨點進來。

   這裡故意不額外撐墊高區來「保證捲得到頂」：曾經試過用一塊會動態撐到全螢幕高的空白
   （min-height／墊高區）確保任何錨點都能被頂到最上緣，但那個機制有兩個代價——
   一是回覆內容比一個畫面短時，提問跟下方按鈕之間會多出一大塊沒有意義的空白；
   二是等到之後把那塊墊高收掉時（不收就永遠留著死區），捲動位置會在同一瞬間被瀏覽器
   夾回真正的內容範圍，使用者會看到明顯的一次跳動，操作幾輪下來就像在「來回閃爍」。
   兩個問題都是「人為撐出不存在的空間」這個做法本身造成的。

   改成完全交給瀏覽器原生的 scrollTop 夾限（assign 超出範圍的值，瀏覽器會自動夾到
   [0, scrollHeight-clientHeight]）：內容夠長（通常是已經累積了不少歷史對話）時，
   夾限不會生效，錨點就會如預期貼齊畫面最上緣；內容還很短（例如對話剛開始沒多久）時，
   夾限會自然生效，畫面改成「儘量往上、貼著目前最新內容的實際結尾」，也就是多帶一點
   上一輪的尾巴把畫面填滿——不是精確頂到最上緣，但沒有死區、也不需要事後再修正一次
   造成跳動，兩種情況都是瀏覽器一次到位算出來的最終位置。 */
const SCROLL_TOP_OFFSET=12;
const AT_BOTTOM_THRESHOLD=40;
let scrollBtn=null;
/* currentTurnEl：目前「這一輪對話」（助理提問＋使用者回覆＋接續的 AI 回覆）的容器，
   由 startTurn() 建立、由 appendToChat() 當作新內容的掛載點，直到下一輪 startTurn() 換手。
   down() 預設把「這個容器」當錨點（見上方 chatBox.lastElementChild），
   讓提問跟回覆能一起被捲動、一起判斷要不要頂到最上緣，不需要每則訊息各自處理。 */
function startTurn(){
  const prevContainer=currentTurnEl||chatBox;
  const prevEl=prevContainer&&prevContainer.lastElementChild;
  const turn=wrap();turn.className='turn';
  if(prevEl)turn.appendChild(prevEl);
  chatBox.appendChild(turn);
  currentTurnEl=turn;
  return turn;
}
/* 這一輪已經定案（選項按鈕／下一步清單已經出現，換使用者操作）：#controls 的 min-height
   要在這裡解除——那是另一個獨立機制（見 clearControls() 的註解）：使用者點選項按鈕的瞬間，
   會先把 #controls 目前高度凍結成 min-height 再清空，避免版面在「按鈕消失、新內容還沒填滿」
   的空檔瞬間塌陷；等新一輪的按鈕用 setControls() 換上來時，才會解除凍結。但如果這一輪改用
   showNextSteps()／list-next-step（選項直接嵌在對話裡，不經過 #controls），就永遠不會呼叫到
   setControls()，於是這個凍結高度沒人解除，在 #screen 跟輸入列之間留下一塊完全空白、
   跟上一組按鈕一樣高的死區——這正是使用者回報「底部一大塊白色遮蔽」的實際成因。
   settleTurn() 是每一輪唯一保證會執行到的「定案」時機，所以在這裡一併解除，
   不用個別在每個不經過 #controls 的呼叫端補寫一次。 */
function settleTurn(){
  ctrls().style.minHeight='';
}
/* 統一的「加入聊天記錄」入口：畫面上所有訊息／卡片／圖表都應該透過這裡加入，
   而不要直接 chatBox.appendChild(...)——如果目前有開著的一輪（currentTurnEl），
   新內容要接在該容器內部，才能維持「同一輪的東西長在同一個容器裡」；
   還沒有任何一輪時（例如剛進入對話、第一句開場白）才退回直接加到 chatBox。 */
function appendToChat(el){
  (currentTurnEl||chatBox).appendChild(el);
  return el;
}
function down(anchor){
  const s=screen();
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
function setControls(node){freeOverride=null;const c=ctrls();c.style.minHeight='';c.style.display='';c.innerHTML='';if(node)c.appendChild(node);forceRepaint(c);down();settleTurn();}
/* 這裡故意不凍結高度：舊版做法是先把 #controls 目前高度凍結成 min-height 再清空，
   等 setControls() 換上新按鈕才解除——理由是怕 #controls 立刻塌陷，讓 flex:1 的 #screen
   瞬間長高，把「剛才算好的捲動位置」弄不準。但這個凍結經常撐得比實際需要的久很多：
   選完選項後，往往還要接好幾段 aiSay() 陸續把回覆講完，才會走到下一次 setControls()，
   這段時間 #controls 都空著卻繼續佔用舊按鈕的高度，等於把 #screen 實際可視高度硬生生
   縮小一截——down() 拿到的是這個被縮小過的高度去算「捲到頂端」，自然容易捲不夠、
   捲完看起來卡在畫面中間偏下，下面留一大塊空白：這正是使用者回報的「附圖切到、
   下面一塊白色」的實際成因，跟捲動公式本身無關，是 #controls 佔位的問題。
   現在 down() 已經改成每段訊息都會重新呼叫（見 aiSay()），本身就會不斷用當下最新的
   #screen 高度重算，不再需要靠凍結高度去保護「剛算好、怕被弄不準」的舊有假設，
   所以拿掉凍結，讓 #controls 清空後立刻塌陷、#screen 立刻拿回應有的可視高度即可。 */
function clearControls(){ctrls().innerHTML='';}
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
function enterChat(){showInput();activeChoices=[];currentTurnEl=null;const s=screen();s.innerHTML='';
  chatBox=wrap();chatBox.className='chat';s.appendChild(chatBox);
  const scrollWrap=document.createElement('div');scrollWrap.className='scroll-bottom-wrap';
  scrollBtn=document.createElement('button');
  scrollBtn.type='button';scrollBtn.className='scroll-bottom-btn';scrollBtn.setAttribute('aria-label','回到最下方');
  scrollBtn.textContent='↓';scrollBtn.onclick=scrollToBottom;
  scrollWrap.appendChild(scrollBtn);s.appendChild(scrollWrap);
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
    appendToChat(t);
    const heavy=opts.heavy||msgs[i].length>LONG_MSG_LEN;
    setTimeout(()=>{
      /* 每一段訊息換上來都呼叫 down()：down() 現在一律用「這一輪的容器」（currentTurnEl）
         當錨點，而不是每則訊息各自的元素，所以重複呼叫是安全的——容器的頂端位置
         不會因為裡面又長了一段新內容而改變，唯一會變的只有「瀏覽器允不允許捲到那個位置」
         （scrollHeight 夠不夠）。這一輪剛開始、內容還很短時，可能捲不到容器頂端，
         畫面會被瀏覽器夾在目前能到的最下面；之後每補上一段新內容，捲動範圍就跟著變大，
         重新呼叫 down() 才會有機會捲得比上次更靠近頂端——如果不重捲，畫面會卡在
         剛開始那個「還沒捲到位」的位置不動，看起來就像使用者回報的「內容被切在很上面、
         下面留一大塊空白」。反過來說，如果內容本身已經長過一個畫面高，容器早就頂到最上面了，
         重複呼叫只是算出同一個位置，不會有任何跳動——這跟舊版「每則訊息各自當錨點」
         不一樣，那樣才會把使用者正在讀的前一段推到畫面外，這裡因為錨點永遠是同一個容器，
         不會有這個問題。 */
      t.remove();const m=document.createElement('div');m.className='ai-msg';
      m.innerHTML=mdToHtml(msgs[i]);appendToChat(m);
      down();
      i++;setTimeout(next,MSG_GAP);
    },BASE_DELAY+(heavy?HEAVY_EXTRA:0));
  })();
}
/* 需要使用者實際回答的提問句：用醒目的引言卡呈現（跟 aiSay 內文用 "> " 語法的效果一致），
   跟一般敘述性訊息區分開，讓使用者一眼看出「這句是要請你選」，不會被前面的說明文字稀釋掉。
   這裡故意不呼叫 down()：這句通常是這一輪 AI 回覆的最後一段（緊接著選項按鈕），
   呼叫端接下來一定會呼叫 setControls()（會自己 down()）或 meSay()（開新一輪時會自己 down()），
   這裡自己再捲一次只會是多餘、甚至提早把畫面捲到還沒填滿選項的半成品狀態。 */
function aiAsk(question){
  const m=document.createElement('div');m.className='ai-msg';
  m.innerHTML=`<div class="md-quote">${mdInline(question)}</div>`;
  appendToChat(m);updateScrollBtn();
}
/* 使用者送出回答後，開啟「這一輪」的新容器（startTurn()：把上一輪留下的提問一起帶過來），
   再把使用者這則回覆放進去，畫面捲到「提問＋這則回覆」一起對齊容器頂端（參考 Claude App
   手機版的捲動方式）——再往前的對話歷史捲出視窗外，不干擾閱讀；AI 開始輸出新內容時
   直接接在下面即可，之後每段訊息都會重新呼叫 down()（見 aiSay()），畫面不會卡住不動，
   使用者也可以自己往下滑先看。這裡延到 requestAnimationFrame 才捲：呼叫端的慣例是「meSay() 接著馬上 clearControls()」，
   #controls 清空的瞬間 #screen 版面會重新計算，要等版面穩定之後才捲，
   才不會捲完又被版面變動蓋掉（見 clearControls()／setControls() 的說明）。 */
function meSay(text){if(suppressNextEcho){suppressNextEcho=false;return;}
  startTurn();
  renderComponent('message/chat-bubble',text);
  requestAnimationFrame(()=>down(currentTurnEl));
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
