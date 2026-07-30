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

   這裡曾經試過完全不撐墊高區、直接交給瀏覽器原生的 scrollTop 夾限：內容夠長時夾限不會生效，
   錨點能如預期貼齊畫面最上緣；但內容還很短、或畫面本身很高（例如平板橫向）時，夾限會提早生效，
   導致捲不上去——這一輪連同它前面好幾輪還沒問完的舊對話會一起塞在畫面裡，使用者要在一堆
   已經答完的舊問答中自己找出「現在真正該看的是哪一句」，畫面越高（可視範圍能塞進的歷史越多）
   這個問題越明顯，跟這裡想做到的「新一輪一定從最上面開始」互相矛盾。

   改回用 scrollSpacer 撐出足夠的捲動空間（見 syncSpacer()），確保任何一輪都能被真的頂到最上緣，
   把前面的舊回合整個推出可視範圍——代價是這一輪內容比一個畫面短時，最下面會多出一段空白
   （直到下一輪開始前都會存在），换来的是使用者永遠不用在畫面上大海撈針找「現在是哪一句」。
   這裡不會有舊版擔心的「事後收掉墊高造成跳動」問題：spacer 高度固定跟著 #screen.clientHeight走，
   下一輪 startTurn() 換手、down() 重新計算時，捲動位置是「重新算一次貼齊新錨點頂端」，
   不是「收掉墊高、被動夾回」，所以不會有那次額外的跳動。 */
const SCROLL_TOP_OFFSET=12;
const AT_BOTTOM_THRESHOLD=40;
let scrollBtn=null,scrollSpacer=null;
/* maxScrollTop：使用者手動捲動（滑鼠滾輪／觸控）目前允許捲到的最深位置，由 down() 每次
   算完「這一輪該停在哪」之後同步更新。scrollSpacer 會刻意撐出比實際內容更多的捲動空間
   （見 syncSpacer()），讓 down() 能把新一輪頂到最上緣；但那塊多出來的空間本身是空白的，
   如果不設上限，使用者自己往下滑就會滑進那塊空白，畫面變成整頁空白只剩下面的選項——
   這裡把「手動捲動」跟「down() 算好的停留位置」分開處理：down() 可以自由把 scrollTop
   設到需要的位置（包含借用 spacer 的空間），但使用者自己往下滑時，一旦超過 down() 算好
   的這個位置就沒有意義了（後面全是空白），所以用 clampScroll() 擋下來，不擋往上滑
   （往上重讀歷史對話還是要能自由捲動）。開場的資產初步分析（currentTurnEl 還不存在時）
   不套用這個上限——那段本來就不會借用 spacer（見 down() 開頭），維持瀏覽器原生捲動範圍即可。 */
let maxScrollTop=Infinity;
function clampScroll(){
  const s=screen();
  if(s.scrollTop>maxScrollTop)s.scrollTop=maxScrollTop;
  updateScrollBtn();
}
/* scrollSpacer：chatBox 之後、跟它同層的一塊空白墊高區，高度固定跟著 #screen 的 clientHeight 走
   （見 down() 開頭呼叫的 syncSpacer()）。沒有這塊墊高，當「最新一輪」本身很短、或 #screen
   可視高度很高（畫面能塞進的歷史夠多）時，scrollTop 會被瀏覽器夾在「內容自然結尾」，捲不到讓
   這一輪頂到畫面最上方——於是舊回合會一直跟新的一起擠在畫面裡。有了這塊墊高，永遠有「足夠多」
   可以捲的空間，任何一輪都能被頂到最上方；墊高本身會被捲出視窗外，使用者不會意識到它的存在
   （只會感覺到「這輪比較短時，下面先留白」）。判斷「是否已經在最底部」／「捲到底部」都刻意用
   chatBox 實際內容的下緣去算，而不是直接看 scrollHeight——否則這塊墊高會讓畫面永遠判斷成
   「還沒到底」。 */
function syncSpacer(){
  if(!scrollSpacer)return;
  scrollSpacer.style.height=screen().clientHeight+'px';
}
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
  turnLoadingShown=false;
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
/* 錨點（通常是 currentTurnEl）比 #screen 可視高度還高時，把它的頂端硬頂到畫面最上緣，
   只會讓使用者看到這一輪最開頭的說明文字，真正要看的東西——結尾的提問句、試算卡、
   下一步清單——反而被擠到可視範圍以下，要使用者自己往下滑才找得到，跟這裡想做到的
   「新資訊一律不用手動捲就看得到」互相矛盾。改成：裝得下就頂到頂端（維持原本「從頭開始讀」
   的體驗）；裝不下時改成貼齊底部，讓這一輪目前最新、使用者接下來要處理的內容一定在可視
   範圍內，代價是使用者得自己往上捲才能重讀這一輪開頭——這個取捨跟一般聊天介面「內容太長
   就跟著最新內容」的預期一致，好過看不到新資訊。 */
const SCROLL_BOTTOM_PAD=16;
function down(anchor){
  const s=screen();
  /* 一開始的資產初步分析（stageC()：問候語＋圓餅圖＋現金分析＋第一題）都還在 currentTurnEl
     建立之前——這一段是使用者進來後第一次看到的畫面，本身就是由上往下一段段長出來的單一整體，
     不是「新一輪把舊一輪推出畫面」的情境，不需要、也不該每跳出一句新訊息就把畫面重新頂到頂端
     （那樣反而會把使用者才剛看到的圓餅圖推出畫面上緣）。這裡直接維持原生 scrollTop（=0，
     還沒被捲過），讓內容照順序疊在固定畫面上即可；等使用者選了第一題、startTurn() 建立
     currentTurnEl 之後，才開始套用「新一輪頂到最上緣」的邏輯（見下方）。 */
  if(!currentTurnEl){maxScrollTop=Infinity;updateScrollBtn();return;}
  syncSpacer();
  const el=anchor||(chatBox&&chatBox.lastElementChild);
  if(el){
    const cRect=s.getBoundingClientRect(),eRect=el.getBoundingClientRect();
    if(eRect.height<=s.clientHeight){
      s.scrollTop=Math.max(0,s.scrollTop+(eRect.top-cRect.top)-SCROLL_TOP_OFFSET);
    }else{
      /* 貼齊底部時故意用 chatBox（而非錨點自己）的下緣去算：錨點是 chatBox 最後一個子節點，
         它的下緣跟 chatBox 的下緣之間還隔著 .chat 的 padding-bottom，如果拿錨點自己的下緣
         去貼齊畫面下緣，會少貼那段 padding，導致貼完之後 isScreenAtBottom()（本來就是拿
         chatBox 下緣去判斷）以為「還沒到底」，讓「回到最下方」按鈕跟著冒出來，剛好蓋在
         剛貼齊畫面下緣的選項上——用同一顆 chatBox 下緣去算，兩邊判斷基準才會一致 */
      const chatRect=chatBox.getBoundingClientRect();
      s.scrollTop=Math.max(0,s.scrollTop+(chatRect.bottom-cRect.bottom)-SCROLL_BOTTOM_PAD);
    }
  }else{
    s.scrollTop=s.scrollHeight;
  }
  /* down() 算完就是這一輪該停留的最深位置——再往下全是 scrollSpacer 借來的空白，同步成
     maxScrollTop，讓使用者自己往下滑時會被 clampScroll() 擋在這裡，不會滑進空白裡（見上方
     maxScrollTop 宣告處的說明） */
  maxScrollTop=s.scrollTop;
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
  maxScrollTop=Math.max(maxScrollTop,s.scrollTop);
  updateScrollBtn();
}
/* down() 貼齊底部只在乎「最新內容有沒有露出」，內容一旦長過一個畫面很多（例如商品卡片列
   後面接著試算卡＋下一步清單），貼齊底部會把 anchorEl 整個推到畫面上緣以上，完全看不到。
   有些情境希望即使內容很長，還是能在畫面最上緣留一點 anchorEl 的邊緣當作「這是延伸自哪張
   卡片」的視覺提示（見 flow.js enterProductCalc()）。這裡在 down() 都捲完之後再補一次修正：
   只有在目前捲動位置已經把 anchorEl 整個推出畫面時才往回捲一點，捲到「anchorEl 下緣距離
   畫面頂端還留 pxVisible px」為止；如果 anchorEl 本來就還看得到（貼齊頂端那種情況），
   就不去動它，避免蓋掉 down() 原本算好的位置。 */
function peekAnchorAbove(anchorEl,pxVisible){
  if(!anchorEl)return;
  const s=screen();
  const sRect=s.getBoundingClientRect(),aRect=anchorEl.getBoundingClientRect();
  const desiredTop=s.scrollTop+(aRect.bottom-sRect.top)-pxVisible;
  if(s.scrollTop>desiredTop){
    /* 這裡只把「目前顯示的位置」往上調一點露出錨點邊緣，不能跟著調降 maxScrollTop——
       maxScrollTop 代表的是 down() 算出來的「這一輪貼齊底部應該停在哪」，也就是使用者
       應該能自由捲到、看見試算結果／下一步清單的深度。如果這裡也把 maxScrollTop 一併
       改成這個較淺的位置，會讓 clampScroll() 誤以為「這裡就是底了」，使用者手動往下滑
       一超過這個位置就會被彈回來，變成得先點「回到最下方」按鈕（會用 Math.max 修正回
       正確深度）才能繼續往下捲——這正是使用者回報的「往下滑會卡住」的成因。只調整
       scrollTop、留著 maxScrollTop 不動，使用者從一開始的 peek 位置就能一路自由捲到底。 */
    s.scrollTop=Math.max(0,desiredTop);
    updateScrollBtn();
  }
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
/* 商品卡片（.pcard-btn／「商品詳情」「立即試算」）留在對話紀錄裡是永久可點的，不像一般
   選項按鈕選完就會被 clearControls() 清掉——如果使用者對著同一張卡、或不同幾張卡連續
   快速點擊，會在前一次內容都還沒打完的情況下又觸發一次 enterProductDetail／
   enterProductCalc，兩三輪回覆疊在一起，畫面會變得很亂（見 flow.js 裡的用法）。
   這裡用一個全站共用的忙碌旗標擋掉這種情況：任一次商品詳情／試算開始處理，就先鎖住旗標，
   等這一輪內容（含下一步清單）完整渲染完了才解鎖——按鈕本身不套用停用樣式，卡片看起來
   隨時可以點，使用者稍後也確實仍然可以再點同一張卡重複操作，只是同一時間不能疊加觸發
   第二次（忙碌時點擊會被靜靜忽略，不會有任何視覺回饋）。 */
let cardBusy=false;
function setCardBusy(v){cardBusy=v;}
/* turnLoadingShown：這一輪是否已經出現過一次 loading。同一輪常常是好幾個 aiSay() 呼叫
   接力串起來（例如先講一句開場、再串接下一句分析結果），如果每個 aiSay() 呼叫都各自判斷
   「我是不是這一輪第一個」，彼此看不到對方，還是會一輪出現好幾次 loading。改成這個跨呼叫
   共用的旗標，由 startTurn() 在每一輪開始時重置成 false，aiSay() 只有在旗標還是 false 時
   才顯示 loading、顯示完就設成 true，之後不管接了幾個 aiSay()，都只會直接接著印字，
   不會再跳出 loading，直到使用者下一次操作、startTurn() 重置旗標為止。 */
let turnLoadingShown=false;
function enterChat(){showInput();activeChoices=[];currentTurnEl=null;maxScrollTop=Infinity;turnLoadingShown=false;const s=screen();s.innerHTML='';
  chatBox=wrap();chatBox.className='chat';s.appendChild(chatBox);
  const disclaimer=document.createElement('p');disclaimer.className='analysis-disclaimer';
  disclaimer.innerHTML='本服務內容由 AI 自動生成，建議使用前請詳閱<span class="link">《AI 智富管家使用同意條款》</span>';
  chatBox.appendChild(disclaimer);
  scrollSpacer=document.createElement('div');scrollSpacer.className='scroll-spacer';s.appendChild(scrollSpacer);
  const scrollWrap=document.createElement('div');scrollWrap.className='scroll-bottom-wrap';
  scrollBtn=document.createElement('button');
  scrollBtn.type='button';scrollBtn.className='scroll-bottom-btn';scrollBtn.setAttribute('aria-label','回到最下方');
  scrollBtn.textContent='↓';scrollBtn.onclick=scrollToBottom;
  scrollWrap.appendChild(scrollBtn);s.appendChild(scrollWrap);
  s.onscroll=clampScroll;
  stageC();}
/* opts.label：依情境自訂 loading 文字（保底預設「管家思考中」，理論上每個呼叫都該自帶 label，
   保底值只是防呆，不該常態出現）；
   opts.heavy：標記為「理論上較複雜」的任務（資產分析、彙整、試算……），開頭 loading 總長拉到
   BASE_DELAY+HEAVY_EXTRA，讓使用者感受到系統有在運算，即使回覆內容其實是預先寫好的。
   即使沒標 heavy，第一句字數超過 LONG_MSG_LEN 也會自動視為複雜內容，一併加長。
   loading 只在「這一輪對話」開頭出現一次（見 turnLoadingShown）——不管這一輪背後接了
   幾個 aiSay() 呼叫、每個呼叫裡又有幾句話，都只有最開頭那一句話之前會出現 loading，
   之後不管是同一個 aiSay() 陣列裡的後續句子、還是接續呼叫的下一個 aiSay()，都直接接著
   上一句逐字印出，模擬 Claude 那種「開頭想一下、之後內容就一路生成下去」的節奏，
   不會每句話、每次呼叫都重新「思考」一次。 */
const LONG_MSG_LEN=120;
const BASE_DELAY=900;
const HEAVY_EXTRA=1300;
const MSG_GAP=400;
/* 逐字印出單一句：先用 mdToHtml() 把整段 markdown 一次轉成最終的排版結構
   （標題、粗體、清單、斜體……該有的標籤與樣式從第一個字開始就是對的），
   再用 TreeWalker 抓出這個結構裡所有的文字節點，把內容清空、逐字補回去——
   等於是「排版先長出來，文字才一個字一個字填進正確的位置」，不會讓使用者看到
   **、# 這類還沒轉換的原始 markdown 語法，填完最後一個字，畫面就已經是最終樣子，
   不需要再多一次「換上最終 HTML」的替換動作。
   每個字的間隔不是固定值，而是「整段印完的總時長」除以字數：固定間隔在長文字
   （例如試算說明、比較表）上會拖得非常久，讓使用者等到不耐煩；改成總時長有上下限
   （TYPE_MIN_MS ~ TYPE_MAX_MS），字數愈多、單字間隔愈短，整段落地的時間就不會
   隨字數線性增加。
   down() 沒有每個字都呼叫——逐字捲動太頻繁會造成明顯的抖動/效能負擔，這裡改成
   每隔幾個字才重算一次捲動位置，捲動仍會跟著文字增長往下走，只是不逐字同步。 */
const TYPE_MIN_MS=280;
const TYPE_MAX_MS=1800;
const TYPE_PER_CHAR=16;
const TYPE_SCROLL_EVERY=3;
/* mdToHtml() 一次把整段結構（標題／段落／每個 <li>）都插進 DOM，逐字動畫只清空、
   再補回「文字節點」的內容——但區塊本身（例如 <li> 的項目符號、標題的行高）從第一格
   就已經存在，不受文字節點清空影響，會整批立刻顯示。於是使用者會看到「上一段話都還
   沒打完，下面清單的項目符號已經全部跳出來」。這裡額外把每個區塊元素（標題／段落／
   引言／清單項目）先設成 display:none，直到該區塊自己的文字節點真正開始被填入
   （也就是輪到它「登場」的那一刻）才解除隱藏，讓區塊跟文字同步逐一出現，不再搶跑。 */
const TYPE_BLOCK_SEL='.md-h1,.md-h2,.md-h3,.md-p,.md-quote,.md-ul li';
function typeOut(text,cb){
  const m=document.createElement('div');m.className='ai-msg';appendToChat(m);
  m.innerHTML=mdToHtml(text);
  const blocks=Array.from(m.querySelectorAll(TYPE_BLOCK_SEL));
  blocks.forEach(b=>{b.style.display='none';});
  const blockOf=node=>{let el=node.parentElement;while(el&&el!==m){if(blocks.includes(el))return el;el=el.parentElement;}return null;};
  const walker=document.createTreeWalker(m,NodeFilter.SHOW_TEXT);
  const nodes=[];let wn;while((wn=walker.nextNode()))nodes.push(wn);
  const nodeBlocks=nodes.map(blockOf);
  const fullTexts=nodes.map(n=>n.textContent);
  nodes.forEach(n=>{n.textContent='';});
  const totalChars=fullTexts.reduce((a,s)=>a+s.length,0);
  if(totalChars===0){blocks.forEach(b=>{b.style.display='';});down();cb();return;}
  const total=Math.min(TYPE_MAX_MS,Math.max(TYPE_MIN_MS,totalChars*TYPE_PER_CHAR));
  const perChar=Math.max(4,total/totalChars);
  let shown=0;(function step(){
    shown++;
    let remain=shown;
    for(let k=0;k<nodes.length;k++){
      const len=fullTexts[k].length;
      const piece=remain>=len?fullTexts[k]:fullTexts[k].slice(0,Math.max(0,remain));
      nodes[k].textContent=piece;
      if(piece.length>0&&nodeBlocks[k]&&nodeBlocks[k].style.display==='none')nodeBlocks[k].style.display='';
      remain-=len;
    }
    if(shown%TYPE_SCROLL_EVERY===0||shown>=totalChars)down();
    if(shown<totalChars)setTimeout(step,perChar);else cb();
  })();
}
function aiSay(msgs,done,opts){
  opts=opts||{};
  const label=opts.label||'管家思考中';
  let i=0;(function next(){
    if(i>=msgs.length){if(done)done();return;}
    const startTyping=()=>{typeOut(msgs[i],()=>{i++;setTimeout(next,MSG_GAP);});};
    if(i>0||turnLoadingShown){startTyping();return;}
    turnLoadingShown=true;
    const t=document.createElement('div');t.className='typing';
    const orbHost=document.createElement('span');orbHost.className='typing-orb';t.appendChild(orbHost);
    const orb=mountShapingOrb(orbHost,{size:24,speed:5,color:'#0044AD',density:1.05,dotScale:2.15});
    const labelText=label+'...';
    const labelEl=document.createElement('span');labelEl.className='typing-label t-shimmer';
    labelEl.textContent=labelText;labelEl.setAttribute('data-text',labelText);
    t.appendChild(labelEl);
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
      orb.destroy();t.remove();
      startTyping();
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
