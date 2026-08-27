/* ============================================================
   共用流程層（三人共用，異動請走 PR 讓大家 review）
   開場、提問、屬性分流、商品清單→試算→CTA 的整套連接邏輯都在這裡，
   確保不論分流到屬性 A/B/C/AB，走起來的節奏與語氣都一致。
   - 只使用 engine.js／catalog.js 提供的工具，商品內容一律讀 PRODUCT_DATA / RECO_CARD / CATALOG
   - 三人各自的內容放在 content-attr-a.js／content-attr-b.js／content-attr-c.js，不要寫在這裡
   - 階段性小結不用卡片，直接用 aiSay + **粗體** 融入對話；不要顯示屬性標籤（A/B/C/AB）。
     stageE() 的初步推薦改用 card/recommendation 卡片（RECO_CARD）取代大段文字說明；
     其他階段性小結（如 h2Reason）仍維持敘述性文字，不受影響
   - 全程用「您」稱呼使用者；每個提問前盡量說明「為什麼問這個」，每個結論後盡量說明「為什麼是這個結論」，
     避免讓使用者覺得資訊是憑空出現、或感覺是在硬推商品
   - 選項按鈕的「顯示文字」跟「內部存值（S.q1/S.q2/S.q3）」是分開的：
     顯示文字可以自然順暢，但存進 S 的值必須維持原本的短字串，後面 riskToleranceFromQ2()等
     地方都是拿這個短字串做精準比對，改文案時不要連內部值一起改
   - 【AI_Behavior_Instruction v1.1 §6.5】ch_d1/ch_d2 每題答完都已經用一句話講過那題答案的
     含義（時間彈性、風險考量），stageE() 開場不要再把 S.q1/S.q2 的含義整段重述一次——
     那是同一個概念講第三遍，改成直接帶出方向，讓對話往前推進而不是原地重複
   ============================================================ */

/* ================= 階段 A｜開始體驗頁 ================= */
function stepA(){
  clearControls();ctrls().style.minHeight='';ctrls().style.display='none';hideInput();
  document.querySelector('.reset').style.display='none';
  const p=wrap();p.className='selpage opening-page';
  p.innerHTML=`
    <div class="selpage-hero">
      <video class="selpage-hero-video" autoplay muted loop playsinline>
        <source src="assets/opening-animation.mp4" type="video/mp4">
      </video>
    </div>
    <div class="selpage-intro">
      <h1>幫您檢視目前的閒置資金，找出更合適的運用方式。</h1>
      <div class="lead">花 2 分鐘，讓「AI 智富管家」幫您盤點閒置資金，找出更適合的資金運用方式。</div>
    </div>
    <div id="startBtnMount" style="text-align:center;margin-top:var(--spacing-40)"></div>`;
  destroyActiveLottieIcons();screen().innerHTML='';screen().appendChild(p);
  p.querySelector('#startBtnMount').appendChild(renderComponent('button/primary','開始體驗',{onClick:()=>enterChat()}));
}

/* stepB() 資產情境兩題的正式 icon（取代原本 8 個選項共用的錢袋佔位圖）：
   來源是 Figma 檔案 pzGDt95JRVQKMWzlcKvYBF 裡跟每個選項對應的 Selection/Option icon node，
   已用 Figma MCP（download_assets，defaultFormat:svg）逐一匯出成 SVG 檔，存在 assets/ 底下
   （沿用專案既有的 assets/*.svg 靜態圖檔慣例，例如 assets/feedback-celebrate.svg／
   assets/logo-icon.svg 也是同一種 <img src="assets/xxx.svg"> 引入方式）。
   每個 icon 都是彩色插圖（綠色錢袋／黃色金幣／藍色錶包等），不是走 currentColor 的單色線框
   icon，色碼比對過 One KGI Design Guideline 的 Base Palette 後全部對應到既有色票（例如
   #55A784＝--color-teal-600、#FFE669＝--color-yellow-300、#0044AD＝--color-sky-blue-600……），
   沒有引入 Figma 匯出時的隨意色碼；亮色插圖在暗色卡片背景（--color-container-card-white／
   --color-container-general-light-active）上對比已經足夠，不需要再疊加 filter 或改寫 fill。
   4 種狀態下 icon 本身刻意保持不變色——這跟原始 Selection/Option 稿（node 370:3005）裡
   Enabled/Hover/Pressed/Selected 四態的 icon 圖層本來就完全相同、只有卡片背景/邊框在變是
   一致的，不是這裡漏做，Design Guideline 對「插畫型」icon 沒有要求要跟著卡片主色換色
   （那是線框型單色 icon 才會用 currentColor 做的事）。
   匯出時已把 Figma frame 自己的背景填色（一律是 #1E1E1E，Figma 匯出整個 frame 時會把
   frame 本身的填色一起烤進 SVG，不是設計稿真正的一部分）跟被設計師標記為 id="hide" 的
   圖層（4 個現金比例 icon 都有，一個橙色菱形徽章＋一條藍色曲線，屬於稿子裡本來就標記
   不顯示的裝飾/註記圖層）都拿掉，只留下真正會顯示的圖示內容，avoid 卡片變成一整塊
   實心背景蓋住卡片本身的顏色。
   8 個 icon 的 viewBox 統一都是「0 0 80 80」（跟 .selopt-icon 容器同尺寸），不需要另外
   校正尺寸或對齊。 */
const ASSET_RANGE_ICONS={
  '50 萬以下':'<img src="assets/icon-asset-under-50w.svg" alt="">',        // Figma node 370:2936 Fund50
  '50–100 萬':'<img src="assets/icon-asset-50-100w.svg" alt="">',          // Figma node 370:2934 Fund50-100
  '100 萬 – 200 萬':'<img src="assets/icon-asset-100-200w.svg" alt="">',   // Figma node 370:2935 Fund100-200
  '200 萬以上':'<img src="assets/icon-asset-over-200w.svg" alt="">'        // Figma node 370:2933 Fund200
};
const CASH_RATIO_ICONS={
  /* 4 個現金占比選項全部改用 Lottie 動畫（設計端提供的水位動畫，資料存在
     assets/lottie/cash-*.js，用 index.html 的 <script> 標籤載入成
     window.__LOTTIE_DATA['cash-95-plus' / 'cash-50-95' / 'cash-5-50' / 'cash-under-5']，
     播放邏輯見 initLottieIcon()）。markup 裡疊放原本的靜態 SVG 當 fallback：找不到對應
     資料、或執行環境沒有 window.lottie 時，fallback 維持顯示，圖示位置不會空白；css 用
     grid 疊層讓 canvas 蓋在 fallback 上面，畫得出來才會真的蓋過去（詳見 initLottieIcon
     的說明）。 */
  '95% 以上':'<span class="selopt-icon-lottie" data-lottie-key="cash-95-plus"><img src="assets/icon-cash-ratio-over-95.svg" alt="" class="selopt-icon-fallback"></span>',
  '50–95%':'<span class="selopt-icon-lottie" data-lottie-key="cash-50-95"><img src="assets/icon-cash-ratio-50-95.svg" alt="" class="selopt-icon-fallback"></span>',
  '5–50%':'<span class="selopt-icon-lottie" data-lottie-key="cash-5-50"><img src="assets/icon-cash-ratio-5-50.svg" alt="" class="selopt-icon-fallback"></span>',
  '5% 以下':'<span class="selopt-icon-lottie" data-lottie-key="cash-under-5"><img src="assets/icon-cash-ratio-under-5.svg" alt="" class="selopt-icon-fallback"></span>'
};

/* 掃描選項卡容器裡帶 data-lottie-key 的圖示 span，用 lottie-web 播放動畫。預設播一次
   不循環、播完停在最後一幀（不重置回第一幀）；呼叫端在 markup 加 data-lottie-loop="true"
   則改成無限循環播放（例如 fbqr-icon-lottie 的慶祝動畫），不會停在最後一幀也不會發
   complete 事件。lottie 全域變數來自 index.html 用 <script> 載入的 js/vendor/lottie.min.js；
   沒載到就直接跳過。dataset.lottieInit 避免同一張卡片重複初始化。
   renderer 用 'canvas' 而非預設的 'svg'：現金占比選項卡的動畫來源是逐格點陣圖序列（90 個
   frame_NNN.png layer，每個只在自己那一格 hold 一幀），SVG renderer 每一幀都要整棵
   <svg> 子樹換掉當幀的 <image> 節點，遇過換節點速度跟不上導致某一幀短暫全空的情形；
   canvas renderer 是同一塊 <canvas> 直接畫點陣圖，沒有這種 DOM 節點抽換的空窗期，向量
   動畫（例如慶祝圖示）用 canvas renderer 一樣正常，故統一都用 canvas 不用另外判斷。
   有疊放靜態 <img> fallback 的呼叫端（例如 .selopt-icon-lottie）：fallback 自始至終都
   留在 DOM 裡、從來不會被隱藏——真正提供「不會空白」保證的是 css/component-library.css
   的 xxx-icon-lottie{display:grid} 疊層，fallback 跟之後 lottie 附加進來的 <canvas>
   疊在同一個 grid cell，canvas 預設透明，畫得出來的時候自然蓋過 fallback，畫不出來時
   透明的 canvas 讓底下的 fallback 直接透出來。若呼叫端刻意不放 fallback（例如
   fbqr-icon-lottie 的慶祝動畫，需求是「拿掉原本圖示，只顯示動畫」），失敗時就會維持
   空白，這是呼叫端明確要的行為，不在這裡另外補防護。
   動畫資料改用 <script> 標籤（把 JSON 包成 window.__LOTTIE_DATA['xxx']= 賦值，見
   index.html）在頁面載入時就準備好，這裡直接同步讀取 window.__LOTTIE_DATA[key]，
   不再用 fetch()／lottie 內建的 path（XHR）在執行期另外抓 .json 檔：這個專案常會直接
   用瀏覽器開本機 index.html（file:// 開頭的網址）預覽，file:// 底下 fetch／XHR 抓本機
   檔案會被瀏覽器 CORS 規則擋下來（瀏覽器本身的安全限制，程式改不了），但 <script>
   標籤載入本機檔案不受這個限制——這也是這個專案其他 js/*.js 檔案本來就能正常運作的
   原因，動畫資料比照辦理就不會受 file:// 影響。 */
/* 現金占比選項卡的 4 個 Lottie 動畫是逐格點陣圖序列（每個 90 frame、320x320 PNG），單一
   動畫檔（assets/lottie/cash-*.js）就有 1.1～1.2MB base64，4 張卡片同時播放等於同時把
   90*4=360 張點陣圖解碼進記憶體；lottie.loadAnimation() 建立的 anim 執行個體如果沒有明確
   呼叫 .destroy()，即使容器 <canvas> 已經被移出畫面（例如 stepB() 選完進入下一頁，
   screen().innerHTML='' 把整個 #screen 清空），lottie 內部的 rAF 動畫迴圈跟已解碼的圖片
   資料並不會自動釋放——會一路留在記憶體裡到頁面重整為止。桌機瀏覽器記憶體餘裕大，不容易
   感覺到；iPad Safari（WKWebView）對單一分頁的記憶體上限緊得多，選完資產卡片進入對話後，
   這些從沒釋放的動畫持續佔用記憶體，到流程最後 render 結尾的 Confetti 動畫（js/component-
   library.js renderFeedbackQrCard）時，記憶體已經被前面 4 個動畫榨乾，導致 Confetti（甚至
   前面現金占比卡片本身）在部分平板／手機上直接播不出來、也不丟出任何 JS 錯誤（WebKit 在
   記憶體壓力下對圖片解碼的失敗模式就是安靜地不畫，不是丟例外）。
   activeLottieAnims 追蹤目前所有還在播放中的 anim 執行個體，destroyActiveLottieIcons()
   在每次要清空 #screen 換頁之前呼叫（見 stepA()／stepB()／engine.js enterChat()），確保
   上一頁的動畫記憶體在下一頁開始播放新動畫之前就先釋放，不會一路累積到結尾。 */
let activeLottieAnims=[];
function destroyActiveLottieIcons(){
  activeLottieAnims.forEach(anim=>{try{anim.destroy();}catch(e){}});
  activeLottieAnims=[];
}
function initLottieIcon(el){
  if(el.dataset.lottieInit)return;
  el.dataset.lottieInit='1';
  const key=el.dataset.lottieKey;
  const data=key&&window.__LOTTIE_DATA&&window.__LOTTIE_DATA[key];
  if(!data||typeof lottie==='undefined')return;
  const loop=el.dataset.lottieLoop==='true';
  try{
    const anim=lottie.loadAnimation({container:el,renderer:'canvas',loop,autoplay:true,animationData:data});
    activeLottieAnims.push(anim);
    if(!loop)anim.addEventListener('complete',()=>anim.goToAndStop(Math.max(0,anim.totalFrames-1),true));
    anim.addEventListener('data_failed',()=>{anim.destroy();console.warn('[lottie] data_failed：',key);});
  }catch(e){console.warn('[lottie] 初始化失敗：',key,e);}
}
function initLottieIcons(container){
  container.querySelectorAll('[data-lottie-key]').forEach(initLottieIcon);
}

/* 單選題選項群組：改用通用的 selection/option-group 元件（js/component-library.js），
   拿掉舊版 .choice 純文字＋數字序號清單。container 沿用 stepB() 既有的掛載點（#rangeOpts／
   #cashOpts），onPick(x) 只回傳選中選項的 label 字串——維持跟舊版 buildSingleSelectList()
   完全相同的呼叫慣例，S.assetRange／S.cashRatio／checkReady() 這套既有的表單狀態管理完全不用改。
   icons 是 {label:icon} 的對照表（見上面 ASSET_RANGE_ICONS／CASH_RATIO_ICONS），選項字串本身
   仍是 stepB() 原本就有的那組陣列，不用把選項改寫成物件陣列——之後某個選項要換圖示，
   只需要改對照表裡那一筆，不用動 stepB() 呼叫這裡的程式碼。
   direction:'row' 讓 4 張卡片依可視寬度自動換行（見 css/component-library.css .selopt-group.row），
   不用另外手動排版。 */
function buildSingleSelectOptionGroup(container,options,icons,onPick,ariaLabel){
  const items=options.map(label=>({icon:icons[label],label,onSelect:x=>onPick(x.label)}));
  container.appendChild(renderComponent('selection/option-group',items,{direction:'row',ariaLabel}));
  initLottieIcons(container);
}

/* ================= 階段 B｜設定資產情境 ================= */
function stepB(){
  clearControls();
  document.querySelector('.reset').style.display='';
  const p=wrap();p.className='selpage';
  p.innerHTML=`
    <div class="kicker">開始之前</div>
    <h1>我們想先了解您在凱基銀行目前的資產狀況。</h1>
    <div class="lead">這些資訊僅用於本次試算，能協助我依您目前的情況提供較貼近現況的建議。</div>
    <div class="q">1. 您在本行的總資產，大約落在哪個級距？</div>
    <div id="rangeOpts"></div>
    <div class="q">2. 其中隨時能動用的現金（活存／定存）大概占多少比例？</div>
    <div id="cashOpts"></div>
    <div id="startBtnMount" style="text-align:center;margin-top:var(--spacing-40)"></div>`;
  destroyActiveLottieIcons();screen().innerHTML='';screen().appendChild(p);
  const ro=p.querySelector('#rangeOpts'),co=p.querySelector('#cashOpts');
  const startBtn=renderComponent('button/primary','立即分析',{disabled:true,onClick:()=>enterChat()});
  p.querySelector('#startBtnMount').appendChild(startBtn);
  const checkReady=()=>{startBtn.disabled=!(S.assetRange&&S.cashRatio);};
  buildSingleSelectOptionGroup(ro,['50 萬以下','50–100 萬','100 萬 – 200 萬','200 萬以上'],ASSET_RANGE_ICONS,x=>{S.assetRange=x;checkReady();},'總資產級距');
  buildSingleSelectOptionGroup(co,['5% 以下','5–50%','50–95%','95% 以上'],CASH_RATIO_ICONS,x=>{S.cashRatio=x;checkReady();},'現金占比');
}

/* ================= 階段 C｜智富管家分析 ================= */
function idleEstimate(){
  const base=assetMid();
  const pct={'95% 以上':0.97,'50–95%':0.72,'5–50%':0.28,'5% 以下':0.03}[S.cashRatio]||0.5;
  const est=base*pct;
  return {lo:Math.round(est*0.8/50000)*50000,hi:Math.round(est*1.2/50000)*50000,pct:Math.round(pct*100)};
}
/* 【定存到期情境｜示範數值】固定示範用：到期已 3 個月、到期前後利率為示範數字，之後
   接上使用者實際的定存到期日／實際利率時，這幾個常數要換成動態帶入，計算方式不用改。
   principal 沿用 idleEstimate() 算出的閒置金額中點，讓這筆「到期定存」跟圓餅圖的
   「現金留存」是同一筆錢，兩個視覺化不會各講各的、對不起數字。 */
const MATURED_MONTHS=3;
const MATURED_DEPOSIT_RATE=0.03;  // 到期前：一般台幣定存利率（示範值）
const IDLE_DEMAND_RATE=0.008;     // 到期後：資金轉入一般活存的利率（示範值），遠低於定存
/* 橫軸改用實際月份（幾月）取代「到期前／1個月後」這種相對描述，使用者一眼就能對應
   到自己記憶中的時間點，不用先在腦中換算「現在」是哪個月。從本月往回推算，monthsAgo=0
   是本月；設回每月 1 號再減月份，避免遇到大月最後一天減月份時被 JS Date 自動進位到下個月。 */
function monthLabel(monthsAgo){
  const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-monthsAgo);
  return `${d.getMonth()+1}月`;
}
/* 到期當月的定存利息仍是照定存利率領到的（到期日當天才轉為活存），到期後的閒置月份
   才會是活存利率——原本到期當月（splitIndex 那個月）就已經算進 after，等於到期那個月
   還沒領到定存利息就被算成活存，多算了一個月的落差，也會跟「已經到期 N 個月了」的文案
   對不起來（N 個月閒置應該從到期隔月才開始算）。改成到期當月仍用 before，從下個月開始
   才是連續 N 個月的 after。 */
function maturedDepositIncome(est){
  const principal=Math.round((est.lo+est.hi)/2);
  const before=principal*MATURED_DEPOSIT_RATE/12;
  const after=principal*IDLE_DEMAND_RATE/12;
  const points=[{label:monthLabel(MATURED_MONTHS+1),value:before},{label:monthLabel(MATURED_MONTHS),value:before}];
  for(let m=MATURED_MONTHS-1;m>=0;m--){
    points.push({label:monthLabel(m),value:after});
  }
  return {principal,before,after,points,splitIndex:1};
}
/* 【AI_Behavior_Instruction v1.1 §9.4 Information Organization】先直接告訴使用者發生了什麼事
   （您有一筆定存已經到期），再說明影響，而不是直接丟一個「## 標題」報告式開場——後者跳過了
   「先講清楚是什麼事」這一步，跟圓餅圖之間的銜接會顯得突然。 */
function maturedDepositInsight(income){
  const beforeAmt=`NT$${fmt(Math.round(income.before))}`,afterAmt=`NT$${fmt(Math.round(income.after))}`;
  return `依您的資產情境來看，您有一筆定存已經到期 **${MATURED_MONTHS} 個月**了，這段時間資金一直停留在一般活存，被動收益明顯下降：到期前這筆約 **NT$${fmt(income.principal)}** 的資金每月約有 **${beforeAmt}** 的利息收入，到期後只剩約 **${afterAmt}**。`;
}
function stageC(){
  const est=idleEstimate();
  const income=maturedDepositIncome(est);
  const myGen=flowGen;
  aiSay(["您好，我是凱基銀行的智富管家，已經為您調閱本行的投資商品、定存、活存與轉帳明細，先幫您做個初步資產分析。"],()=>{
    setTimeout(()=>{
      if(myGen!==flowGen)return;
      /* 圓餅圖（資產現況）＋折線圖（到期後被動收益趨勢）先後接續呈現，兩張圖都看完
         再接結論文字，而不是圖中間插一段文字打斷——兩張圖本來就是同一件事的兩個角度
         （現況／趨勢），連著看更容易一次建立完整印象。
         兩張圖原本是同一個 tick 內連續呼叫，畫面上會同時「爆出來」，看不出兩者是先後
         兩個獨立資訊；改用 setTimeout 讓折線圖延遲一小段再出現（.pie-card／.linechart-card
         都已加上跟站內其他卡片一致的 animation:fade .4s ease），視覺上才有「先看完現況、
         再接著看趨勢」的先後順序感，延遲值抓在淡入動畫跑完（.4s）之後一點點，不是憑感覺亂抓。 */
      renderComponent('chart/pie',100-est.pct,assetMid(),{title:'目前資產配置'});
      setTimeout(()=>{
        if(myGen!==flowGen)return;
        renderComponent('chart/line',income.points,{splitIndex:income.splitIndex,splitLabel:'定存到期',ariaLabel:'定存到期後每月被動收益趨勢',title:'每月被動收益趨勢'});
        /* 結論文字的 aiSay() 也要挪進這個 setTimeout 裡、接在折線圖後面才呼叫——
           這一輪稍早的 cube-loader 已經把 turnLoadingShown 設成 true，aiSay() 內部
           看到這個旗標就會直接開始逐字打字、不會再多等 BASE_DELAY，如果沒搬進來，
           結論文字會在折線圖淡入之前（甚至同一 tick）就搶先開始打字，畫面上會變成
           「文字先動、圖後補上」，順序反而更亂，跟折線圖延遲出現的用意互相矛盾。 */
        aiSay([maturedDepositInsight(income)],()=>{
          /* 這一題改用 popover/option-select（浮動選單，覆蓋在輸入框之上，見對應 Figma
             node 306:1102「問題回答優化」），不再走 #controls／setControls()：
             選完之後才用 aiAsk()＋meSay() 把「問題標題＋所選回答」補進聊天紀錄，
             畫面呈現方式跟其他既有提問（如 showNextSteps()）一致，不影響版面高度。 */
          const question="對於這筆閒置資金，您平時比較想怎麼運用它呢？";
          const opts=[
            {label:'先放著，可能是備用金或短期要用',
             ack:'*短期預留的資金通常要兼顧彈性與穩定，*例如學費、結婚基金等支出。這段期間仍可透過部分配置提升資金效率，不必全放在低利率帳戶。',
             kw:['先放著','放著','放着','不動','先不用','放著就好','備用金','緊急預備金','學費','結婚','短期會用到']},
            {label:'想加減賺一點零用錢，風險不要太高',
             ack:'*了解，這屬於穩健增值的方向。*我會以控制風險為優先，協助您比較穩健撥息或保本型的工具。',
             kw:['零用錢','零花','加減賺','賺一點','小賺','零頭','風險不要太高']},
            {label:'想讓這筆錢成長更多，可以承擔一些風險',
             ack:'*了解，這屬於積極成長的方向。*我會在您能接受的風險範圍內，協助您比較具備成長潛力的工具。',
             kw:['提升價值','價值提升','增值','成長','積極','提高','承擔風險']},
            {label:'還沒想法，想先聽看看建議',
             ack:'*沒問題，我們可以先從幾個簡單的問題開始，*逐步釐清較適合您的規劃方向。',
             kw:['聽聽','建議','聽看看','都可以','幫我','不知道','聽你的']}
          ];
          /* opts.other 目前 disabled:true（展場期間暫停自行輸入，比照 #inputbar 既有的展覽期間鎖住
             慣例），輸入框只顯示、不能打字送出，下面這段 onSubmit 目前不會被觸發。保留這段
             kw 比對＋退回「還沒想法，想先聽看看建議」的邏輯不動，之後展場結束要重新開放自由
             輸入時，只要把 disabled 拿掉就會是原本設計好的行為，不用重寫這段。 */
          const popover=renderComponent('popover/option-select',question,opts,opt=>{
            popover.remove();
            aiAsk(question);
            meSay(opt.label);
            aiSay([opt.ack],()=>ch_d1(),{label:'管家正在理解分析'});
          },{
            other:{
              disabled:true,
              onSubmit:text=>{
                popover.remove();
                aiAsk(question);
                meSay(text);
                const matched=opts.find(o=>(o.kw||[]).some(k=>text.includes(k)));
                const picked=matched||opts[opts.length-1];
                aiSay([picked.ack],()=>ch_d1(),{label:'管家正在理解分析'});
              }
            }
          });
        },{label:'為您分析資產配置中',heavy:true});
      },450);
    },700);
  },{loader:'cube',loadingMs:9000,cubeSubtitle:[
    '正在查詢您的投資商品明細…',
    '正在核對定存到期資訊…',
    '正在核對活期存款餘額…',
    '正在彙整近期轉帳明細…',
    '正在整合您的資產數據，請稍候…'
  ]});
}

/* ================= 階段 D｜了解投資屬性（三題釐清） =================
   每題選完的階段性小結，不用卡片、不寫「小結」，直接用 aiSay + **粗體** 融入對話
   ch_d1 開頭先帶出「配置」的概念，讓使用者知道這幾題是為了什麼、也預告最後會有拉桿可以調整比例
   每題的按鈕「顯示文字」寫成順口的完整回答，但存進 S.q1/S.q2/S.q3 的仍是原本的短字串（見檔頭說明）*/
/* ch_d1／ch_d2／ch_d3／stageH1／stageH1b 這五題都改用 popover/option-select（浮動選單，
   同 stageC() 的作法，見對應 Figma node 306:1102）：原本「> 問題句」那行從 aiSay() 陣列裡拿掉，
   改成選完之後才用 aiAsk()＋meSay() 把「問題標題＋所選回答」補進聊天紀錄，不再走
   #controls／setControls()／wrap()／choiceBtn()。問題文字、選項文字、後續分析文案／
   keywords 皆逐字保留，只是把顯示時機從「按鈕之前」搬到「選完之後」。 */
function ch_d1(){
  aiSay([
    "接下來想請教您幾個問題，幫您抓出合適的**資金配置方式**——穩定型與成長型各放多少比例，讓資金運用更有效率。"
  ],()=>{
    const question="首先想了解，這筆資金大概多久之後可能會用到呢？";
    const opts=[
      {label:'大概一年內就會用到',val:'一年內',wt:'high',kw:['一年內','1年內','很快','馬上','短期','隨時','近期']},
      {label:'應該一年以上都不會用到',val:'一年以上',wt:'low',kw:['一年以上','1年以上','很久','長期','不會用','都用不到','放很久']},
      {label:'還不確定，要看情況',val:'還不確定',wt:'mid',kw:['還不確定','不確定','不一定','看情況','說不準','不知道']}
    ];
    const ch_d1Summary=val=>val==='一年以上'?'這筆資金的時間彈性較大，適合作中長期規劃，也有更大的空間參與市場成長':val==='一年內'?'這筆資金隨時可能派上用場，會優先以「靈活性與安全性」為考量':'這筆資金會採均衡配置，兼顧收益與調度彈性';
    const popover=renderComponent('popover/option-select',question,opts,opt=>{
      popover.remove();S.q1=opt.val;S.depositWeight=opt.wt;
      aiAsk(question);meSay(opt.label);
      aiSay([`*${ch_d1Summary(opt.val)}*。`],()=>ch_d2(),{label:'管家正在理解分析'});
    },{
      other:{
        disabled:true,
        onSubmit:text=>{
          popover.remove();
          const matched=opts.find(o=>(o.kw||[]).some(k=>text.includes(k)));
          const picked=matched||opts[opts.length-1];
          S.q1=picked.val;S.depositWeight=picked.wt;
          aiAsk(question);meSay(text);
          aiSay([`*${ch_d1Summary(picked.val)}*。`],()=>ch_d2(),{label:'管家正在理解分析'});
        }
      }
    });
  },{label:'管家思考中'});
}
function ch_d2(){
  aiSay(["接下來想了解一下您的風險承受度："],()=>{
    const question="如果市場出現下跌，您能接受的跌幅程度大概是？";
    const opts=[
      /* 【AI_Behavior_Instruction v1.1 §6.5】小幅波動／明顯波動兩個分支後面還有 ch_d3 決定
         實際方向，這裡的 ack 只單純承接風險承受度本身，不要預先劇透方向（債券／基金），
         不然 ch_d3 選完、stageE() 帶出方向時，等於同一個結論講第三次；
         完全不能接受波動這支不會再走 ch_d3，直接進 stageE()，方向在這裡講一次就好 */
      {label:'完全不能接受本金有任何波動',val:'完全不能接受本金波動',
       ack:'*這代表本金安全是您最優先的考量，會以完全保本與高穩定的商品為主。*',
       next:()=>resolveConservative(),kw:['不能','保本','不要波動','不想虧','零風險','安全','不能虧','怕']},
      {label:'可以接受小幅波動（跌幅約 10%～30%）',val:'可接受小幅波動',
       ack:'*了解，您能接受一定程度的波動。*',
       next:()=>ch_d3(),kw:['小波動','可以接受','還好','一點點','小幅','ok','OK','接受','10%','20%','30%','跌幅']},
      {label:'可以接受明顯波動（跌幅 30% 以上），以換取長期成長機會',val:'可接受淨值明顯波動換取成長',
       ack:'*了解，您能接受較大幅度的波動，以換取成長機會。*',
       next:()=>ch_d3(),kw:['明顯波動','高報酬','沒問題','敢','中等','可以波動','衝','成長','30%以上','40%','50%']}
    ];
    const popover=renderComponent('popover/option-select',question,opts,opt=>{
      popover.remove();S.q2=opt.val;
      aiAsk(question);meSay(opt.label);
      aiSay([opt.ack],opt.next,{label:'管家正在理解分析'});
    },{
      other:{
        disabled:true,
        onSubmit:text=>{
          popover.remove();
          /* 這題沒有像其他題目一樣有明確的「還不確定」catch-all 選項，退回中間那個
             「可接受小幅波動」——三個選項裡風險傾向最持平的一個，不會讓自由文字
             誤觸發最保守（直接跳過 ch_d3）或最積極的分支。 */
          const matched=opts.find(o=>(o.kw||[]).some(k=>text.includes(k)));
          const picked=matched||opts[1];
          S.q2=picked.val;
          aiAsk(question);meSay(text);
          aiSay([picked.ack],picked.next,{label:'管家正在理解分析'});
        }
      }
    });
  },{label:'管家思考中'});
}
function ch_d3(){
  aiSay(["最後一個問題，這能幫我判斷債券還是基金更適合您："],()=>{
    const question="在投資型商品裡，您比較看重哪一種特質？";
    const opts=[
      {label:'希望領息穩定、到期時間明確',val:'領息穩定、到期時間明確',next:()=>resolveAttribute('bond','B'),
       kw:['領息','到期','穩定','固定','確定','債']},
      {label:'希望定期定額分散風險、追求收益潛能',val:'想以定期定額分散風險、追求收益潛能',next:()=>resolveAttribute('fund','A'),
       kw:['定期定額','分散風險','收益潛能','成長','基金','潛力']},
      {label:'兩者都可以，還沒決定要選哪一種',val:'都可以／還沒決定',next:()=>resolveAttribute('combo','AB'),
       kw:['都可以','搭配','混合','都要','兩個都','還沒決定','不知道','都想看看']}
    ];
    const popover=renderComponent('popover/option-select',question,opts,opt=>{
      popover.remove();S.q3=opt.val;
      aiAsk(question);meSay(opt.label);
      opt.next();
    },{
      other:{
        disabled:true,
        onSubmit:text=>{
          popover.remove();
          const matched=opts.find(o=>(o.kw||[]).some(k=>text.includes(k)));
          const picked=matched||opts[opts.length-1];
          S.q3=picked.val;
          aiAsk(question);meSay(text);
          picked.next();
        }
      }
    });
  },{label:'管家思考中'});
}
function resolveConservative(){S.attribute='C';S.recoType='deposit';stageE();}
function resolveAttribute(recoType,attr){
  S.horizonOverride=false;
  if((recoType==='bond'||recoType==='combo')&&S.q1==='一年內'){
    // 債券要持有到到期日（部分天期長達 20 年）才能保本、穩定領息，跟「一年內就會用到」互相矛盾，改導向基金
    recoType='fund';attr='A';S.horizonOverride=true;
  }
  S.attribute=attr;S.recoType=recoType;stageE();
}

/* 這筆閒置資金的金額：stageC() 一開始算過一次，但只是區域變數，沒有存進 S，使用者一路
   答完 ch_d1/ch_d2/ch_d3、甚至後面 H 流程的好幾題之後，很容易忘記最初講的是哪一筆錢、
   大概多少錢。assetMid()／idleEstimate().pct 只吃 S.assetRange／S.cashRatio，這兩個值
   從 stepB 填完就不會再變，所以這裡重新算一次金額，用在後續的橋接句裡把金額再提醒一次。
   不能直接借 maturedDepositIncome().principal（= (est.lo+est.hi)/2）：那組 lo/hi 是
   為了折線圖刻度特地捨入到最近 5 萬，資產規模小、現金比例又低時（例如「50 萬以下」＋
   「5% 以下」）兩邊會一起捨到 0，變成「這筆約 NT$0 的資金」，比原本沒講金額更奇怪。
   這裡改成直接用 assetMid()×現金比例算，不經過那組 5 萬捨入，才不會遇到小額就整個歸零。 */
function idleFundsPrincipal(){
  return Math.round(assetMid()*(idleEstimate().pct/100));
}
/* 「資金不要全押同一個地方」的提醒：stageE() 的單一商品情境（非 deposit／combo）跟
   stageH3() 的補充路徑會用到同一句話（只有商品標籤不同），抽成共用函式避免兩處分別維護、
   改一處措辭卻漏改另一處。開頭帶出金額，避免使用者操作到這裡已經忘了是在講哪一筆錢 */
function idleBridgeText(tag,amount){
  return `這筆約 <b>NT$${fmt(amount)}</b> 的資金不建議全押同一個地方，可以留一些在穩定的活存，其餘配置在${tag}，抓出您安心持有的比例。`;
}
/* ================= 階段 E｜屬性分流與初步推薦 =================
   不顯示屬性標籤（A/B/C/AB）；流程是：一句話帶出方向 → 用 card/recommendation 卡片
   （見 js/component-library.js、RECO_CARD）取代原本 RECO_REASON 那一大段標題＋條列的
   markdown 說明——使用者回饋「文字太多太饒口」，改成一張視覺化卡片交代完標題／情境副標／
   特色清單，比整段文字打字動畫快讀完；「為什麼適合」已經在 ch_d1/ch_d2 的 ack 與卡片
   subtitle 裡講過，這裡不再重述使用者剛才的回答 → 帶出「配置」的具體做法（呼應 ch_d1
   先前提過的概念，也預告等一下的拉桿）→ 才給出商品方向。
   combo（債券＋基金搭配）沒有自己的卡片資料——直接在這裡組 [RECO_CARD.bond,RECO_CARD.fund]
   兩張卡，維持「combo 內容橫跨 A／B 兩人負責的資料」這個既有慣例，不在 RECO_CARD 裡另外
   重複定義一份 combo 專用資料。 */
function stageE(){
  const prod=PRODUCT_DATA[S.recoType];
  /* 【AI_Behavior_Instruction v1.1 §6.5】不在這裡重述 S.q1/S.q2 的含義——ch_d1/ch_d2 的
     ack 已經各講過一次，卡片本身的 subtitle 也會呼應適合情境，這裡只需要一句話帶出方向、
     往下接卡片，避免同一個概念重複第三次 */
  const messages=['為您整理了比較適合的方向：'];
  if(S.horizonOverride){
    messages.push(`不過${BOND_MATURITY_CAVEAT}考量這筆資金一年內可能會用到，這裡改為規劃彈性較高的基金，同樣兼顧收益與資金靈活度。`);
  }
  if(S.recoType==='combo'){
    messages.push('您還沒有特別偏好哪一種，債券與基金剛好分屬不同特性，可以先都看看再決定：');
  }
  aiSay(messages,()=>{
    renderComponent('card/recommendation',S.recoType==='combo'?[RECO_CARD.bond,RECO_CARD.fund]:RECO_CARD[S.recoType]);
    /* 【AI_Behavior_Instruction v1.1 §9.6】商品情境不用「我建議／我不會建議」，改用中性的
       「可先……」「不宜……」等描述，決策權仍保留給使用者（拉桿試算可自行調整） */
    const principal=idleFundsPrincipal();
    const bridge=S.recoType==='deposit'
      ? `這筆約 <b>NT$${fmt(principal)}</b> 的資金可先以 <b>${prod.name}</b> 為主，讓資金穩定累積，之後如果想法有變化，也能再彈性調整。`
      : S.recoType==='combo'
      ? `另外，這筆約 <b>NT$${fmt(principal)}</b> 的資金不建議全押同一個地方，可以留一些在穩定的活存，其餘評估配置在債券或基金——您可以先看看兩份清單，再透過試算找出安心持有的比例。`
      : idleBridgeText(prod.tag,principal);
    const proceed=()=>aiSay([bridge],()=>stageF(),{label:'為您規劃資金配置中'});
    /* 【AI_Behavior_Instruction v1.1 §8.10】這張推薦卡只要出現基金或債券（單一 fund/bond
       或 combo 搭配債券＋基金）就已經在對使用者展示相關內容，原本漏掉警語——之前只有
       showCatalogCards() 的商品清單才會附上，這裡的推薦卡是使用者更早看到內容的地方，
       同樣要補齊，不能只在後面的清單頁才出現。recoRiskDisclaimerLines() 會依 recoType
       決定要附基金警語、債券警語，還是 combo 情境下兩個都附 */
    sayNote(recoRiskDisclaimerLines(S.recoType),proceed);
  },{label:'為您分析比較適合的方向中',heavy:true});
}

/* ================= 階段 F｜詢問下一步 ================= */
function calcLabelFor(prod){return `查看${prod.tag}清單`;}
function stageF(){
  const prod=PRODUCT_DATA[S.recoType];
  const calcLabel=calcLabelFor(prod);
  const items=[];
  if(S.path!=='supplement'){
    items.push({id:'supplement',title:'納入他行資產，取得完整分析',description:'讓建議更貼近您的整體配置',
      keywords:['補充','更多','其他','完整','他行','納入','資產'],
      onSelect:()=>{clearControls();S.path='supplement';stageH1();}});
  }
  items.push({id:'accept',title:calcLabel,description:'看看符合需求的商品，再從中試算',
    keywords:['試算','配置','查看','清單','商品','直接','接受','好','可以','沒問題','ok','OK'],
    onSelect:()=>{clearControls();S.path='accept';stageG();}});
  showNextSteps('了解這個方向之後，您想怎麼進行下一步呢？',items);
}

/* ================= 階段 G｜（路徑 1）直接媒合 =================
   定存／債券／基金／搭配都從 CATALOG 帶出符合需求的商品清單（定存＝美元定存 5 檔天期），
   使用者從清單挑選商品後才進入試算，試算完可以查看其他產品、或前往下單／諮詢理專 */
function stageG(){
  stageGList();
}
/* riskAllowed() 只分「穩健」（僅收斂到穩健）跟其他（全部開放，等同'積極'），
   所以除了使用者明確選了「可接受淨值明顯波動換取成長」，其餘（含最保守的「完全不能接受本金波動」）
   都要收斂成'穩健'——不能反過來讓最保守的答案掉進「全部開放」。 */
function riskToleranceFromQ2(){
  return S.q2==='可接受淨值明顯波動換取成長'?'積極':'穩健';
}
/* 【AI_Behavior_Instruction v1.1 §6.7／§8.9】商品清單層一律用中性語氣「以下整理本行商品供您參考」，
   不用「為您篩選」「幫您篩出」等個人化篩選語氣；風險層級說明也拿掉「篩」字，只客觀說明目前顯示的風險範圍。
   「穩健」分支原本會多解釋一句「可選商品較少時會依序放寬資產規模與風險層級」——這是內部的
   後備機制，講給使用者聽只會讓人誤會自己的風險等級被調整過，拿掉，只保留使用者需要知道的
   事實（目前顯示範圍、卡片會標示實際風險等級） */
function riskRangeNote(tolerance){
  return tolerance==='穩健'
    ?'目前顯示的商品風險等級以「穩健」為主，商品卡片會標示實際風險等級，方便您辨別。'
    :'目前顯示的商品風險等級涵蓋穩健到積極，選擇較為多元。';
}
function stageGList(){
  const cats=S.recoType==='combo'?['bond','fund']:[S.recoType];
  const tolerance=riskToleranceFromQ2();
  const items=matchCatalogAtLeast(cats,riskAllowed(tolerance),assetTierAllowed(S.assetRange),2);
  const riskNote=riskRangeNote(tolerance);
  const intro={
    bond:`以下整理本行債券商品供您參考，包含信評、天期與配息頻率等資訊。${riskNote}您可以先查看商品詳情，或直接進一步試算：`,
    fund:`以下整理本行基金商品供您參考，包含資產類別與配息方式等資訊。${riskNote}您可以先查看商品詳情，或直接進一步試算：`,
    combo:`以下分別整理債券與基金商品供您參考，方便您搭配著看。${riskNote}您可以先查看商品詳情，或直接進一步試算：`,
    deposit:'以下整理本行美元定存的天期與利率供您參考，您可以先查看各天期的商品詳情，或直接進一步試算：'
  }[S.recoType]||'以下整理符合條件的商品供您參考，您可以先查看商品詳情，或直接進一步試算：';
  aiSay([intro],()=>{
    showCatalogCards(items);
  },catalogGlobeLoaderOpts(items));
}

/* ================= 商品清單 → 詳情／試算 → 下單／諮詢理專（G、H 兩條路徑共用） ================= */
/* 商品卡片的「商品詳情」「立即試算」直接點下去、不經過 showNextSteps，跟其他所有互動
   （三題釐清、下一步清單……）都會先用 meSay() 回顯使用者選了什麼不一致——點完卡片，
   畫面上完全沒有「使用者剛才問了什麼」的痕跡，AI 的回覆感覺憑空冒出來。這裡讓卡片點擊
   也比照辦理，先送出一句對應的訊息（「查看○○○○詳情」／「試算○○○○」），
   再進入原本的內容渲染——這樣使用者看得到自己剛才問了什麼，也讓 meSay() 順便完成
   startTurn()，不需要再另外用 opts.fresh／startTurn() 特別處理錨點（見 enterProductCalc()）。 */
/* combo（債券＋基金）清單裡兩種商品類別混在同一橫向清單，使用者分不出哪張是債券、哪張是基金
   （見客戶回報）。這裡在渲染前把 items 依 cat 分組，同一分類分別成一列、列上方加一個分類標籤，
   單一分類的清單（bond-only／fund-only／deposit）維持原本樣式不變，不受影響。 */
function appendCatalogGroupLabel(text){
  const el=document.createElement('div');el.className='pcard-group-label';el.textContent=text;
  appendToChat(el);
}
const CATALOG_CAT_LABEL={bond:'債券',fund:'基金',deposit:'定存'};
/* 依 items 的商品類別組成決定 loading/globe-loader（見 js/globe-loader.js、js/engine.js
   renderGlobeLoader()）的標題文字——任何「產出商品清單」的入口都要用同一顆地球 loading，
   讓使用者不管走哪條路徑（首次媒合 stageGList()／補充路徑 stageH3List()／返回清單
   backToCatalogList()）看到的都是一致的「系統正在跨地區蒐集資料」體感，不是只有第一次
   媒合才有、其他路徑退回原本的發光球樣式。集中在這裡判斷，三個呼叫端都直接套用同一組
   opts，不用各自重複維護一次 switch。
   標題直接對應這次清單實際會查詢的商品類別（搜尋債券中／搜尋基金中／搜尋定存方案中／
   組合情境搜尋基金與債券中），不用「全球商品資料整合中」這種泛用文案，讓使用者看得出
   系統正在找的是自己剛才選的那個方向，不是無關的全部商品；只用標題一行就夠，不加小標
   說明文字。
   loadingMs／globeSize：6000ms、220px——原本試過預設的 2400ms／168px，實測地球才剛
   開始自轉、還沒轉到第二個據點就結束了，尺寸也偏小看不清楚立體感，加大加長之後才看得出
   「跨地區蒐集」的動態；6000ms 比 stageC() 開場的 cube-loader（4000ms）還長，這裡不是
   整段體驗的第一印象，但使用者明確要求這個 loading 停留約 6 秒，不再刻意留短。 */
function catalogGlobeLoaderOpts(items){
  const cats=new Set(items.map(p=>p.cat));
  const title=cats.size>1
    ?'搜尋基金與債券中'
    :({
      bond:'搜尋債券中',
      fund:'搜尋基金中',
      deposit:'搜尋定存方案中'
    }[[...cats][0]]||'搜尋商品中');
  return {loader:'globe',loadingMs:6000,globeSize:220,globeTitle:title};
}
/* 【AI_Behavior_Instruction v1.1 §8.10】基金商品清單、配息型商品清單後方必須完整保留法定警語，
   不得省略或改寫；依 items 組成判斷要附加哪些警語，任何商品清單（G／H 兩條路徑、返回清單）
   都經過這裡，不用在每個呼叫端各自補一次 */
/* 抽成常數讓 stageE()／stageH3() 的「推薦卡」階段也能直接引用——那兩處還沒有具體選定
   哪一檔商品（只是 fund/bond/deposit 的方向性推薦卡），沒有 payFreq 可判斷是否要加配息
   警語，只能先確保這兩句必留的基金風險警語有出現，不透過 catalogDisclaimerLines(items)
   （那個版本需要真正的 catalog items 陣列）。 */
const FUND_RISK_DISCLAIMER_LINES=[
  '投資一定有風險，基金投資有賺有賠。申購前請詳閱公開說明書。基金績效均為過去績效，不代表未來之績效表現，亦不保證基金之投資收益，請勿視為買賣金融商品之建議。'
];
/* 債券風險警語：比照 FUND_RISK_DISCLAIMER_LINES 的邏輯與涵蓋範圍——只要畫面上出現
   債券（清單／詳情／試算／推薦卡），不論是不是搭配 issuerInfo 一起顯示，都要附上，
   不依附在 issuerInfo 段落底下（理由同 catalogDisclaimerLines() 對 managerInfo 缺漏的
   處理）。跟既有的 BOND_ISSUER_DISCLAIMER（catalog.js，講「公司債、留意利率/信用/匯率
   風險」，只在有 issuerInfo 的商品詳情頁補充說明發行機構時額外出現）是兩份不同的警語，
   不互相取代：這句是每次出現債券都要有的通用法定警語，那句是詳情頁才需要的補充說明。 */
const BOND_RISK_DISCLAIMER_LINES=[
  '債券投資涉及風險，發行人違約或提前賣出都可能造成損失，投資前請充分了解，如有疑問請尋求專業獨立意見。'
];
/* stageE()／stageH3() 的推薦卡只知道方向性的 recoType（deposit/bond/fund/combo），
   還沒有具體商品，用這個小函式統一決定要附哪些警語，combo 兩張卡都出現時兩種警語都要有——
   避免兩處各自重複寫一次同樣的「fund→加基金警語／bond→加債券警語／combo→兩個都加」判斷。
   combo 情境下兩份警語不分兩段顯示，合併成一段連續的話，且順序固定「先債券、後基金」
   （跟 stageE()／stageGList() combo 情境本身「先講債券、再講基金」的順序一致，見
   PRODUCT_DATA.combo 的兩張卡片順序），回傳陣列只會有 0 或 1 個元素，讓 sayNote()
   只產生一個 <p>，不是每種商品各自分段 */
function recoRiskDisclaimerLines(recoType){
  const parts=[];
  if(recoType==='bond'||recoType==='combo')parts.push(...BOND_RISK_DISCLAIMER_LINES);
  if(recoType==='fund'||recoType==='combo')parts.push(...FUND_RISK_DISCLAIMER_LINES);
  return parts.length?[parts.join('')]:[];
}
function catalogDisclaimerLines(items){
  const parts=[];
  if(items.some(p=>p.cat==='bond'))parts.push(...BOND_RISK_DISCLAIMER_LINES);
  if(items.some(p=>p.cat==='fund')){
    parts.push(...FUND_RISK_DISCLAIMER_LINES);
    /* 「配息可能包含本金」只適用基金的配息型商品（配息來源可能拆分出本金，需要另外揭露）——
       債券配息是票面利息，不會包含本金，這裡放在 fund 分支裡面判斷，確保這句只會接在
       基金警語後面、成為同一段話的一部分，不會被債券的內容拆開或誤附到純債券清單 */
    if(items.some(p=>p.cat==='fund'&&(p.payFreq==='月配'||p.payFreq==='季配'||p.payFreq==='半年配'))){
      parts.push('配息可能包含本金，實際組成請以公開說明書為準。');
    }
  }
  return parts.length?[parts.join('')]:[];
}
function showCatalogCards(items){
  const onDetail=p=>{
    meSay(`查看${p.name}詳情`);
    enterProductDetail(p,items,{anchor:currentTurnEl&&currentTurnEl.lastElementChild});
  };
  const onCalc=p=>{
    meSay(`試算${p.name}`);
    enterProductCalc(p,items,{anchor:currentTurnEl&&currentTurnEl.lastElementChild});
  };
  const cats=[...new Set(items.map(p=>p.cat))];
  if(cats.length>1){
    cats.forEach(cat=>{
      appendCatalogGroupLabel(CATALOG_CAT_LABEL[cat]||cat);
      const group=items.filter(p=>p.cat===cat);
      if(group.length>1){
        renderComponentRow('card/product',group,onDetail,onCalc);
      }else{
        appendToChat(renderComponent('card/product',group[0],onDetail,onCalc));
      }
    });
  }else if(items.length>1){
    renderComponentRow('card/product',items,onDetail,onCalc);
  }else{
    appendToChat(renderComponent('card/product',items[0],onDetail,onCalc));
  }
  /* 警語改用 sayNote()（js/engine.js）而不是 aiSay()：不需要逐字打字動畫，字級也改成
     caption（見 css/style.css .disclaimer-note），跟一般對話內文區分開 */
  sayNote(catalogDisclaimerLines(items),()=>{down();settleTurn();});
}
function enterProductDetail(p,items,opts){
  /* 商品卡片的「商品詳情」「立即試算」永久留在對話紀錄裡可以重複點，見 engine.js 的
     cardCancelToken 說明——這裡不是擋掉連續點擊，而是先中止前一次還沒打完的輸出，
     換成顯示這一次最新點擊的內容 */
  if(cardCancelToken)cardCancelToken.cancel();
  const myToken=makeCancelToken();
  cardCancelToken=myToken;
  clearControls();
  opts=opts||{};
  /* cardAnchor：呼叫端（showCatalogCards）在這之前已經用 meSay() 開了新的一輪、
     留下一句「查看○○○○詳情」的回覆泡泡，這裡直接拿來當錨點，商品內容如果長過一個畫面，
     貼齊底部時還能保留一點這句回覆泡泡的邊緣（見下面 peekAnchorAbove()） */
  const cardAnchor=opts.anchor||null;
  const catLabel={bond:'債券',fund:'基金',deposit:'定存'}[p.cat]||p.cat;
  const isDeposit=p.cat==='deposit';
  /* 定存商品介紹內文（feature 及以下欄位）不套用 **粗體** 強調——粗體會被 mdToHtml
     轉成 <strong>，顏色跟著變成 --color-content-general-active，不是一般內文的
     --color-content-general-primary。定存這幾行只是單純陳列規格，不需要強調色，
     債券／基金保留原本的粗體強調 */
  const lines=[
    `## ${p.name}`,
    p.feature,
    isDeposit?`- 商品類別：${catLabel}｜幣別：${p.currency}`
      :`- 商品類別：**${catLabel}**｜幣別：**${p.currency}**`,
    isDeposit?`- 最低申購金額：${p.minAmt}｜配息頻率：${p.payFreq}`
      :`- 最低申購金額：**${p.minAmt}**｜配息頻率：**${p.payFreq}**`,
    p.cat==='bond'?`- 到期日：**${p.maturity}**（首次贖回日：${p.callDate}）`
      :isDeposit?`- 存款天期：${p.tenor}｜計息方式：機動利率、到期領息`
      :`- 申購方式：**${p.entry}**`
  ].join('\n');
  const messages=[lines];
  /* noteLines：警語／風險提示改用 sayNote()（見下方 aiSay 完成後的呼叫）獨立顯示，
     不跟著 messages 一起打字——債券的 BOND_ISSUER_DISCLAIMER、基金／債券共用的
     catalogDisclaimerLines() 都不是「關於這檔商品」介紹文字的一部分，獨立成一段
     才能套用 caption 字級跟一般介紹內文區分開。
     【AI_Behavior_Instruction v1.1 §8.10】基金、債券都要跟 showCatalogCards() 用同一份
     catalogDisclaimerLines()，不要另外改寫或精簡；即使 managerInfo／issuerInfo 缺漏
     （目前 catalog 資料都有填，但不假設永遠如此），警語仍會顯示，不依附在
     managerInfo／issuerInfo 段落底下——債券的 BOND_ISSUER_DISCLAIMER 只在有 issuerInfo、
     額外介紹發行機構時才補充說明，跟 catalogDisclaimerLines() 帶出的通用債券風險警語
     是兩份不同的內容，兩個都要顯示，不互相取代。 */
  let noteLines=[];
  if(p.cat==='bond'){
    if(p.issuerInfo)messages.push(`**關於發行機構**\n${p.issuerInfo}`);
    noteLines=[...(p.issuerInfo?[BOND_ISSUER_DISCLAIMER]:[]),...catalogDisclaimerLines([p])];
  }else if(p.cat==='fund'){
    if(p.managerInfo)messages.push(`**關於這檔基金**\n${p.managerInfo}`);
    noteLines=catalogDisclaimerLines([p]);
  }
  aiSay(messages,()=>{
    sayNote(noteLines,()=>{
      showNextSteps('了解商品內容之後，您想怎麼進行下一步呢？',[
        {id:'calc',title:'試算這檔商品',description:'看看這檔商品的年化報酬試算',
          /* title 維持通用標籤（清單上的顯示文字，保持簡短），echo 才是回覆泡泡實際要講的話——
             帶出具體商品名稱「試算○○○○」，跟直接從卡片列點「立即試算」的回覆泡泡文字一致
             （見 showCatalogCards()），讓兩條路徑的對話脈絡一樣清楚。
             這裡執行的當下，showNextSteps 內部的 meSay() 剛把這一輪換成
             [提問句「了解商品內容之後…」, 使用者回覆泡泡「試算○○○○」]，
             currentTurnEl 目前最後一個元素就是那顆回覆泡泡，直接拿來當 enterProductCalc
             的錨點，讓試算卡渲染完成、畫面貼齊底部之後，還能保留一點這顆泡泡的邊緣 */
          echo:`試算${p.name}`,
          keywords:['試算','算','好','可以','ok','OK'],
          onSelect:()=>{clearControls();enterProductCalc(p,items,{anchor:currentTurnEl&&currentTurnEl.lastElementChild});}},
        {id:'back',title:'再看看其他產品',description:'看看其他商品',
          keywords:['返回','清單','其他','上一步','回去'],
          onSelect:()=>{clearControls();backToCatalogList(items);}}
      ]);
      if(cardAnchor)requestAnimationFrame(()=>peekAnchorAbove(cardAnchor,32));
      if(cardCancelToken===myToken)cardCancelToken=null;
    });
  },{label:'為您整理商品資訊中',cancelToken:myToken});
}
function backToCatalogList(items){
  aiSay(['以下整理其他商品供您參考：'],()=>showCatalogCards(items),catalogGlobeLoaderOpts(items));
}
/* 債券／基金／外匯定存都用同一個 card/calculator 元件（Figma 對應的拉桿試算卡，含手搖飲/聚餐動畫）
   跟活存做配置比較；insight（investRationale）沒有對應欄位，先用一句話帶出。
   外匯定存利率不隨年期變動，關掉近1年/近3年切換（showPeriodTabs:false） */
function enterProductCalc(p,items,opts){
  /* 商品卡片的「商品詳情」「立即試算」永久留在對話紀錄裡可以重複點，見 engine.js 的
     cardCancelToken 說明——這裡不是擋掉連續點擊，而是先中止前一次還沒打完的輸出，
     換成顯示這一次最新點擊的內容 */
  if(cardCancelToken)cardCancelToken.cancel();
  const myToken=makeCancelToken();
  cardCancelToken=myToken;
  clearControls();
  opts=opts||{};
  /* cardAnchor：試算卡＋下一步清單通常長過一個畫面很多，down() 貼齊底部會把「使用者剛才
     點的是什麼」整個推出畫面上緣；這裡記住一個錨點元素，稍後在畫面穩定後幫忙保留它的邊緣
     （見下面 peekAnchorAbove()）。兩種進入路徑（商品卡片列直接點「立即試算」／商品詳情頁
     「試算這檔商品」選項）現在都會先用 meSay() 開一輪新的、留下一句回覆泡泡（見
     showCatalogCards()／enterProductDetail() 的用法），呼叫端一律把那顆泡泡當 opts.anchor
     傳進來即可，這裡不需要再自己另開一輪 */
  const cardAnchor=opts.anchor||null;
  S.selectedProductCode=p.code;
  const tag={bond:'債券',fund:'基金',deposit:'外匯定存'}[p.cat];
  const backLabel=p.cat==='deposit'?'查看其他天期':'查看其他產品';
  aiSay([investRationale(tag)],()=>{
    renderComponent('card/calculator',p,100-keepPctFor(),{tag,showPeriodTabs:p.cat!=='deposit'});
    const proceed=()=>{
      const nextItems=[];
      if(S.path!=='supplement'){
        nextItems.push({id:'supplement',title:'納入他行資產，取得完整分析',description:'讓建議更貼近您的整體配置',
          keywords:['補充','更多','其他資產','完整','他行','納入','資產'],
          onSelect:()=>{clearControls();S.path='supplement';stageH1();}});
      }
      nextItems.push(
        {id:'order',title:'前往申購',description:'直接帶入試算結果，快速完成線上申購',
          keywords:['下單','申購','買','購買','下訂','前往','好','可以','下一步','ok','OK'],
          onSelect:()=>{clearControls();finishFlow('order');}},
        {id:'advisor',title:'諮詢理專',description:'由專人為您做更深入的資產規劃與解答',
          keywords:['理專','諮詢','專員','問問題','找人','客服'],
          onSelect:()=>{clearControls();finishFlow('advisor');}},
        {id:'back',title:backLabel,description:'回到清單看看別的選擇',
          keywords:['查看','其他','清單','商品','天期','回去','返回'],
          onSelect:()=>{clearControls();backToCatalogList(items);}}
      );
      showNextSteps('了解產品之後，您想怎麼進行下一步呢？',nextItems);
      /* 試算卡＋下一步清單通常長過一個畫面很多，down() 貼齊底部會把 cardAnchor（剛才點的
         商品卡片）整個推出畫面上緣；這裡再往回捲一點點，固定露出卡片下緣 PEEK_PX 高度，
         讓使用者還能看到「這是延伸自哪張卡片」，等畫面穩定（下一輪重繪）後才修正，
         避免蓋掉 showNextSteps 剛算好的位置 */
      if(cardAnchor)requestAnimationFrame(()=>peekAnchorAbove(cardAnchor,32));
      if(cardCancelToken===myToken)cardCancelToken=null;
    };
    /* 【AI_Behavior_Instruction v1.1 §8.10】基金試算卡下方也要完整保留法定警語——原本只有
       showCatalogCards()（商品清單）跟 enterProductDetail() 的債券分支會附警語，這裡（單一
       基金商品的試算畫面）漏掉了，補上跟 catalogDisclaimerLines() 同一份文字，不要另外
       改寫或精簡，維持跟清單頁一致的完整用語；改用 sayNote() 而不是 aiSay()，理由同
       showCatalogCards() 的說明（不需要打字動畫，字級改成 caption） */
    sayNote(catalogDisclaimerLines([p]),proceed);
  },{label:'為您試算中',heavy:true,cancelToken:myToken});
}

/* ================= 階段 H｜（路徑 2）補充更多資產資訊 ================= */
function stageH1(){
  aiSay(['那我們來聊聊您在凱基銀行以外的資產——這裡指的是股票、基金這類投資部位，還有活存、定存等現金部位，能幫助我更完整地了解您的整體配置。'],()=>{
    const question="先讓我知道大概的資產級距：";
    const opts=['100 萬以下','100 萬–200 萬','200 萬以上'].map(x=>({label:x,kw:[x]}));
    const popover=renderComponent('popover/option-select',question,opts,opt=>{
      popover.remove();S.h1Amt=opt.label;
      aiAsk(question);meSay(opt.label);
      stageH1b();
    });
  },{label:'管家思考中'});
}
function stageH1b(){
  aiSay(['這個比例能幫我判斷您平常對投資的熟悉程度、以及目前的風險偏好：'],()=>{
    const question="這些資產裡，大概有多少比例是用在投資上呢？";
    const opts=['0%','1–50%','50% 以上'].map(x=>({label:x,kw:[x]}));
    const popover=renderComponent('popover/option-select',question,opts,opt=>{
      popover.remove();S.h1Ratio=opt.label;
      aiAsk(question);meSay(opt.label);
      stageH2();
    });
  },{label:'管家思考中'});
}
/* H-2：目前主要投資項目（可複選） */
const H2_OPTIONS=[
  {key:'stock',label:'台股',cat:'growth'},
  {key:'oversea_stock',label:'海外股',cat:'growth'},
  {key:'etf',label:'ETF',cat:'growth'},
  {key:'fund',label:'基金',cat:'growth'},
  {key:'bond',label:'債券',cat:'bond'}
];
/* H-2b 綜合分流邏輯：結合 B-1（S.assetRange）、B-2（S.cashRatio）、H-1（S.h1Amt / S.h1Ratio）、H-2（keys）
   H2_OPTIONS 裡每個選項的 cat 只會是 'growth' 或 'bond'，所以只要 keys.length>0，hasGrowth 跟 hasBond
   兩者至少一個為真——下面 hasGrowth&&!hasBond／hasBond 這兩個分支已經涵蓋 keys.length>0 的所有情況，
   不會再落到最後的 deposit fallback，這裡就不寫那段永遠不會執行的 dead code，避免誤導以為還有第三條路徑 */
/* 資金閒置的預設理由：classifyH2()（他行沒填任何投資項目）跟 stageH2()（S.h1Ratio==='0%'
   直接跳過選項）會用到同一句話，抽成常數避免兩處各存一份、日後改到漏改一邊 */
const IDLE_FUNDS_REASON='*目前資金大多閒置。*建議先從美元定存或低風險工具開始，逐步累積投資經驗。';
/* 債券持有到期的風險提醒：adjustH2()（他行補充路徑）跟 stageE()（S.horizonOverride，行內
   路徑）在講同一件事——資金一年內可能會用到、但債券要放到到期才能保本領息——抽成常數，
   兩處只需各自接一句「所以怎麼調整」，不用各寫一份幾乎一樣的長句 */
const BOND_MATURITY_CAVEAT='債券多半要持有到到期日（部分天期長達 20 年）才能保本、穩定領息，中途賣出可能拿不回全部本金。';
function classifyH2(keys){
  const hasGrowth=keys.some(k=>k==='stock'||k==='oversea_stock'||k==='etf'||k==='fund');
  const hasBond=keys.includes('bond');
  if(keys.length===0){
    return{result:'deposit',reason:IDLE_FUNDS_REASON};
  }
  if(hasGrowth&&!hasBond){
    return{result:'bond',reason:'*目前配置偏重成長型資產，穩定收益部位較少。*建議搭配一些債券，用穩定配息平衡整體波動。'};
  }
  return{result:'fund',reason:'*您的資產配置已相當多元，也有一定的投資經驗。*適合搭配精選基金，做跨區域分散配置，爭取資本利得機會。'};
}
/* 資產體質修正：以 B-2 現金比例與 H-1 投資比例／規模微調初步結果。
   這裡只客觀描述目前的資產狀況與建議方向，不用「先…之後再逐步調整」「比…更穩健」這類
   暗示商品有高低順序的說法——使用者容易誤會成某種等級被調升或調降，其實只是依現況給的建議，
   跟 reconcileWithOriginal() 的理由文字是同一個原則 */
function adjustH2(base){
  let{result,reason}=base;
  /* rawResult：reconcileWithOriginal() 封頂之前的原始訊號，用來判斷下面「債券被一年內
     排除後該退回哪裡」時，往上（基金）還是往下（定存）才貼近使用者實際的原始訊號
     （見下方「if(result==='bond'&&S.q1==='一年內')」的說明） */
  const rawResult=result;
  if(result==='fund'&&(S.cashRatio==='95% 以上'||S.h1Ratio==='1–50%')){
    result='bond';reason='*您已具備一定的投資概念，不過目前現金比例偏高、配置仍偏保守。*建議先以債券為主，穩健地累積收益。';
  }else if(result==='bond'&&(S.assetRange==='200 萬以上'||S.h1Amt==='200 萬以上')&&S.h1Ratio==='50% 以上'){
    result='fund';reason='*您的資金規模充足，投資風格也偏積極。*可以搭配基金組合，讓資金有更大的成長空間。';
  }
  ({result,reason}=reconcileWithOriginal({result,reason}));
  if(result==='bond'&&S.q1==='一年內'){
    /* 債券被「一年內可能要用」排除後，接下來該往哪裡走要看兩件事：
       1. rawResult（封頂前的原始訊號）是不是 deposit——他行完全沒投資，classifyH2()
          判斷極度保守，只是被 reconcileWithOriginal() 封頂只讓它降一級到債券。
       2. S.horizonOverride——本行原本的「基金」推薦是不是本來就是被迫換上來的
          （使用者 q3 其實選的是債券／組合，只是因為一年內要用、債券不能推薦，
          resolveAttribute() 才改推基金，見 flow.js 開頭 resolveAttribute()）。
       只有兩者同時成立才退回定存：這種情況下「基金」從一開始就不是使用者的真心
       選擇，只是債券的替代方案，他行資產一補充進來顯示更保守的真實輪廓，改成定存
       （一樣滿足一年內能動用）才貼近原始訊號。
       如果 S.horizonOverride 是 false（使用者當初 q3 就是主動選基金，是真心要成長型
       商品），即使他行 0% 投資，也不該只靠這一個訊號把使用者剛表達過的偏好整個蓋掉、
       跳兩級退到定存——這正是 reconcileWithOriginal() 開頭註解（見上方）想避免的事，
       這裡維持退到基金，不擴大他行資訊的影響力 */
    if(rawResult==='deposit'&&S.horizonOverride){
      result='deposit';
      reason=`*他行資產顯示您目前的投資經驗或占比仍偏保守，且${BOND_MATURITY_CAVEAT}*建議先以美元定存為主，天期彈性、資金運用也更有餘裕。`;
    }else{
      result='fund';reason=`*這筆資金一年內可能會用到，但${BOND_MATURITY_CAVEAT}*因此改為規劃彈性較高的基金，兼顧收益與資金靈活度。`;
    }
  }
  return{result,reason};
}
/* 綜合行內／行外依據：H-2 目前只依他行資產資訊判斷方向，完全沒參考行內三題（Q2風險承受度／Q3債券基金偏好）已得出的 S.recoType，
   等於使用者剛剛的回答被整套換掉。這裡用 S.recoType 當基準，他行資訊最多只能把結果往上或往下調整一個層級（定存↔債券↔基金），
   避免行內已明確表達的風險承受度被他行資產一次跳兩級蓋掉——這是內部的計算限制，reason 文字不會提到「級」「層級」
   這類字眼，只講事實跟建議，避免使用者誤會成自己被評了某種等級、還被調高調低 */
const RECOTYPE_RANK={deposit:1,bond:2,fund:3};
const RANK_RECOTYPE=['deposit','bond','fund'];
function reconcileWithOriginal(adjusted){
  let{result,reason}=adjusted;
  const origRank=RECOTYPE_RANK[S.recoType]||RECOTYPE_RANK.bond;
  const hRank=RECOTYPE_RANK[result];
  const diff=hRank-origRank;
  /* reason 只留實質理由，「原本方向→調整後方向」的對比已經由 stageH3() 另外用一句話講，
     這裡不重複講一次，避免同一件事被講兩次 */
  if(diff>=2){
    result=RANK_RECOTYPE[origRank];
    /* 這裡雖然封頂只上調一級（不是他行訊號建議的兩級），實際上仍是一次方向調整，
       stageH3() 會在這句之前先講「由 X 調整為 Y」——理由文字不能寫成「仍依您先前的
       風險考量」，那聽起來像沒有變動，跟緊接在前面的調整宣告互相矛盾。改成直接說明
       「調整但保守進行」，跟上面往下調（diff<=-2）分支的措辭一致，都是講清楚實際發生的事 */
    reason='*他行資產顯示您已有豐富的投資經驗，*這裡先以小幅度調整為主，不會直接跳到最積極的方向。';
  }else if(diff<=-2){
    result=RANK_RECOTYPE[origRank-2];
    reason='*他行資產顯示您目前的投資經驗或占比仍偏保守，*這裡建議以較穩健的方向為主，兼顧收益與風險控制。';
  }
  return{result,reason};
}
function stageH2(){
  if(S.h1Ratio==='0%'){
    const base={result:'deposit',reason:IDLE_FUNDS_REASON};
    /* 這裡要呼叫 adjustH2()，不能只呼叫它內部的 reconcileWithOriginal()——adjustH2() 尾端
       還有一段「resultTypeH 是債券、但 S.q1 是一年內要用」時強制改回基金的保護（債券要放到
       到期才能保本領息，跟「一年內要用」互相矛盾），只呼叫 reconcileWithOriginal() 會跳過
       這段保護，可能讓一年內要用的資金被導向債券 */
    const adj=adjustH2(base);
    S.h2Items=[];S.h2Reason=adj.reason;S.recoTypeH=adj.result;
    /* 「也是偏保守」的「也」暗示本行原本的配置就已經偏保守——只有 S.recoType 本來就是
       deposit 時這個暗示才成立；如果使用者在本行三題選的是積極或均衡方向，這句話會跟
       使用者剛講過的偏好對不上，改成依 S.recoType 分開講 */
    const idleAck=S.recoType==='deposit'
      ?'了解，看來您在其他銀行的資金也是偏保守的配置。'
      :'了解，看來您在其他銀行的資金目前大多閒置、還沒投入太多。';
    aiSay([idleAck],()=>stageH3(),{label:'管家正在理解分析'});
    return;
  }
  aiSay(['> 您目前主要有投資哪些項目呢？','可以複選，選好之後點一下「確認送出」。'],()=>{
    const w=wrap();
    const selected=new Set();
    H2_OPTIONS.forEach(opt=>{
      const b=document.createElement('button');b.className='choice checkopt';b.textContent=opt.label;
      b.onclick=()=>{
        if(selected.has(opt.key)){selected.delete(opt.key);b.classList.remove('sel');}
        else{selected.add(opt.key);b.classList.add('sel');}
        confirmBtn.disabled=selected.size===0;
      };
      w.appendChild(b);
    });
    const confirmWrap=wrap();confirmWrap.style.textAlign='center';confirmWrap.style.marginTop='var(--spacing-40)';
    const confirmBtn=renderComponent('button/primary','確認送出',{disabled:true,onClick:()=>{
      const items=H2_OPTIONS.filter(o=>selected.has(o.key));
      const base=classifyH2(items.map(o=>o.key));
      const adj=adjustH2(base);
      S.h2Items=items.map(o=>o.label);S.h2Reason=adj.reason;S.recoTypeH=adj.result;
      meSay(items.length?items.map(o=>o.label).join('、'):'目前沒有投資');
      clearControls();stageH3();
    }});
    confirmWrap.appendChild(confirmBtn);
    w.appendChild(confirmWrap);
    setControls(w);
  },{label:'管家思考中'});
}

/* ================= H-3 試算與轉入建議 =================
   資產樣貌整理放在這裡（H-2 選完投資項目後馬上呈現），不要延到 stageH3List 才出現。
   【三段式順序】比照使用者實際想事情的順序安排，不是想到什麼講什麼：
   1. 先看整合後的資產全貌（chart/asset-overview）——使用者要先掌握「我現在整體上是什麼樣子」，
      才有辦法理解後面的方向調整是根據什麼改的
   2. 再說明配置方向改變或不變（比對 S.recoTypeH 跟 S.recoType）：
      - 方向有變：先用一句話講清楚「原本→現在」，再補上新方向的 RECO_CARD（呼應 stageE()），
        h2Reason 只留實質理由、不再重複「原本…現在調整為…」這句已經講過的話
      - 方向沒變：不重講一次、不重出一次卡片（stageE() 已經出過），直接用 h2Reason 補充依據即可
   3. 最後才進入「怎麼配置閒置資金」的下一步（bridge 文字＋showNextSteps CTA）
   三段之間各自用 aiSay() 分開，讓每一段都有自己的思考停頓，不要一次全部塞給使用者。 */
/* 他行資產金額／投資比例的中點估算（見 stageH3() 的 chart/asset-overview 整合資產總覽圖）：
   他行資產目前只收集級距字串（S.h1Amt／S.h1Ratio），做法比照 engine.js assetMid() 對本行
   資產級距的處理——取每個級距的中點金額／比例來估算，屬於示範用途的粗略估算，不是精確金額 */
function h1Mid(){return {'100 萬以下':500000,'100 萬–200 萬':1500000,'200 萬以上':2800000}[S.h1Amt]||1000000;}
const H1_RATIO_MID={'0%':0,'1–50%':0.25,'50% 以上':0.75};
/* 現金比例（B-2 問的是「現金／活存占多少比例」）換算成投資占比級距，兩者互為鏡像
   （現金 95% 以上 ↔ 投資 0–5%、現金 50–95% ↔ 投資 5–50%……），見 chart/asset-overview
   的 rangeLo／rangeHi——本行那條長條的「區間」直接顯示這個換算後的級距上下界（數字，
   不是字串），整體徽章的區間則是把本行／他行兩邊的級距依資產金額加權平均。他行那題
   （S.h1Ratio）問的就是「投資比例」本身，級距上下界直接沿用選項本身的範圍。 */
const BANK_INVEST_RANGE={'95% 以上':{lo:0,hi:5},'50–95%':{lo:5,hi:50},'5–50%':{lo:50,hi:95},'5% 以下':{lo:95,hi:100}};
const OTHER_INVEST_RANGE={'0%':{lo:0,hi:0},'1–50%':{lo:1,hi:50},'50% 以上':{lo:50,hi:100}};
function stageH3(){
  const origProd=PRODUCT_DATA[S.recoType];
  const newProd=PRODUCT_DATA[S.recoTypeH];
  /* classifyH2()／adjustH2() 只會回傳 deposit/bond/fund 三選一，永遠不會是 combo，
     所以原本方向是 combo（債券＋基金都推薦、使用者還沒決定要哪一種）時，S.recoTypeH
     必定跟 S.recoType 的字串不同，會被誤判成「方向調整」——即使算出來的 fund/bond
     本來就是 combo 卡片組裡已經出現過的其中一張。這裡只有「combo→deposit」（推薦到
     一開始兩張卡都沒出現過的定存）才算真的調整；combo→bond／combo→fund 只是從
     「兩個都看看」收斂成其中一個，不算方向變了，不要重講一次、不要重出一次卡片 */
  const changed=S.recoType==='combo'?S.recoTypeH==='deposit':S.recoTypeH!==S.recoType;
  const calcLabel=calcLabelFor(newProd);
  /* 第一段：整合後的資產全貌。chart/asset-overview 卡片自己有標題「整體投資佔比」，
     不用再靠 opts.title 額外加一次。bankRange／otherRange 是投資占比的級距上下界
     （數字，見上面 BANK_INVEST_RANGE／OTHER_INVEST_RANGE），只用來畫每一行下方的
     「區間」文字與整體徽章的加權平均區間；bankInvestPct／otherInvestPct 才是實際顯示
     在每一行標題旁的「投資 XX.X%」與長條寬度，兩者都會顯示，不再像舊版只留級距、
     藏起算出來的中點百分比。 */
  aiSay(['幫您把本行與他行的資產整合起來，先看一下目前的整體樣貌：'],()=>{
    const bankTotal=assetMid(),otherTotal=h1Mid();
    const bankInvestPct=(1-idleEstimate().pct/100)*100,otherInvestPct=(H1_RATIO_MID[S.h1Ratio]??0)*100;
    const bankRange=BANK_INVEST_RANGE[S.cashRatio]||{lo:0,hi:100};
    const otherRange=OTHER_INVEST_RANGE[S.h1Ratio]||{lo:0,hi:100};
    renderComponent('chart/asset-overview',[
      {label:'凱基銀行',amt:bankTotal,investPct:bankInvestPct,rangeLo:bankRange.lo,rangeHi:bankRange.hi},
      {label:'其他銀行',amt:otherTotal,investPct:otherInvestPct,rangeLo:otherRange.lo,rangeHi:otherRange.hi}
    ],S.h2Items);
    /* 第二段：配置方向改變或不變 */
    const messages=[];
    if(changed){
      messages.push(`考量您在其他銀行的資產狀況，建議方向由 <b>${origProd.tag}</b> 調整為 <b>${newProd.tag}</b>：`);
    }
    messages.push(S.h2Reason);
    aiSay(messages,()=>{
      if(changed){
        renderComponent('card/recommendation',RECO_CARD[S.recoTypeH]);
      }
      /* 第三段：配置閒置資金的下一步。走到這裡使用者已經答完 ch_d1/ch_d2/ch_d3 跟一整輪
         他行資產的問題，離 stageC() 第一次提到這筆錢已經好幾個問題了，這裡重新帶出金額，
         避免使用者忘記在講哪一筆錢 */
      const principal=idleFundsPrincipal();
      const bridge=S.recoTypeH==='deposit'
        ? `綜合看下來，這筆約 <b>NT$${fmt(principal)}</b> 的資金可先以 <b>${newProd.name}</b> 為主，讓資金穩定累積。`
        : idleBridgeText(newProd.tag,principal);
      const proceed=()=>aiSay([bridge],()=>{
        showNextSteps('了解這個方向之後，您想怎麼進行下一步呢？',[
          {id:'accept',title:calcLabel,description:'看看符合需求的商品，再從中試算',
            keywords:['試算','配置','查看','清單','商品','好','可以','ok','OK'],
            onSelect:()=>{clearControls();stageH3List();}}
        ]);
      },{label:'為您規劃資金配置中'});
      /* 【AI_Behavior_Instruction v1.1 §8.10】只有 changed 時，這裡才是使用者第一次看到
         「補充他行資產後改推薦」的新方向推薦卡（!changed 時方向沒變，使用者在 stageE()
         已經看過一次，那裡已經補了警語，這裡不用重複）；S.recoTypeH 不會是 combo
         （見 classifyH2()／adjustH2()），recoRiskDisclaimerLines() 會依實際新方向
         （基金或債券）決定要附哪一份警語 */
      sayNote(changed?recoRiskDisclaimerLines(S.recoTypeH):[],proceed);
    },{label:'為您分析配置方向中'});
  },{label:'為您彙整資產資料中',heavy:true});
}
/* 補充路徑的風險承受度沿用 D 階段 ch_d2() 已收集的 S.q2（見 riskToleranceFromQ2()），不能無視使用者
   實際填的風險承受度而直接開放全部風險層級；資產規模則取本行／他行兩邊級距較大的一邊；
   資產樣貌已在 stageH3 呈現過，這裡只帶出符合需求的商品清單（定存＝美元定存 5 檔天期，跟債券／基金一樣走 CATALOG 清單） */
function stageH3List(){
  const tolerance=riskToleranceFromQ2();
  const items=matchCatalogAtLeast([S.recoTypeH],riskAllowed(tolerance),biggerAssetTierAllowed(S.assetRange,S.h1Amt),2);
  const riskNote=riskRangeNote(tolerance);
  const intro={
    bond:`以下整理本行債券商品供您參考，包含信評、天期與配息頻率等資訊。${riskNote}您可以先查看商品詳情，或直接進一步試算：`,
    fund:`以下整理本行基金商品供您參考，包含資產類別與配息方式等資訊。${riskNote}您可以先查看商品詳情，或直接進一步試算：`,
    deposit:'以下整理本行美元定存的天期與利率供您參考，您可以先查看商品詳情，或直接進一步試算：'
  }[S.recoTypeH];
  aiSay([intro],()=>{
    showCatalogCards(items);
  },catalogGlobeLoaderOpts(items));
}
