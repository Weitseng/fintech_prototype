/* ============================================================
   共用流程層（三人共用，異動請走 PR 讓大家 review）
   開場、提問、屬性分流、商品清單→試算→CTA 的整套連接邏輯都在這裡，
   確保不論分流到屬性 A/B/C/AB，走起來的節奏與語氣都一致。
   - 只使用 engine.js／catalog.js 提供的工具，商品內容一律讀 PRODUCT_DATA / RECO_REASON / CATALOG
   - 三人各自的內容放在 content-attr-a.js／content-attr-b.js／content-attr-c.js，不要寫在這裡
   - 階段性小結不用卡片，直接用 aiSay + **粗體** 融入對話；不要顯示屬性標籤（A/B/C/AB），
     用 RECO_REASON／h2Reason 這種敘述性文字告訴使用者他的特質就好
   - 全程用「您」稱呼使用者；每個提問前盡量說明「為什麼問這個」，每個結論後盡量說明「為什麼是這個結論」，
     避免讓使用者覺得資訊是憑空出現、或感覺是在硬推商品
   - 選項按鈕的「顯示文字」跟「內部存值（S.q1/S.q2/S.q3）」是分開的：
     顯示文字可以自然順暢，但存進 S 的值必須維持原本的短字串，後面 timeframeNote()／riskNote 等
     地方都是拿這個短字串做精準比對，改文案時不要連內部值一起改
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
  screen().innerHTML='';screen().appendChild(p);
  p.querySelector('#startBtnMount').appendChild(renderComponent('button/primary','開始體驗',{onClick:()=>stepB()}));
}

/* 單選題選項清單，樣式沿用 css/style.css 的 .choice（對應 Figma node 223:752「message/option」，
   跟 engine.js choiceBtn() 在對話中產生的問題選項是同一個元件，只是這裡不經過 #controls／chat，
   直接把按鈕掛到 .selpage 裡的容器上）。編號靠 .choice 既有的 CSS counter 自動產生，
   容器需各自 counter-reset（見 .choice-group），兩題的編號才會各自從 1 開始。 */
function buildSingleSelectList(container,options,onPick){
  container.className='choice-group';
  options.forEach(x=>{
    const b=choiceBtn(x,null,()=>{container.querySelectorAll('.choice').forEach(o=>o.classList.remove('sel'));
      b.classList.add('sel');onPick(x);});
    container.appendChild(b);
  });
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
  screen().innerHTML='';screen().appendChild(p);
  const ro=p.querySelector('#rangeOpts'),co=p.querySelector('#cashOpts');
  const startBtn=renderComponent('button/primary','立即分析',{disabled:true,onClick:()=>enterChat()});
  p.querySelector('#startBtnMount').appendChild(startBtn);
  const checkReady=()=>{startBtn.disabled=!(S.assetRange&&S.cashRatio);};
  buildSingleSelectList(ro,['50 萬以下','50–100 萬','100 萬 – 200 萬','200 萬以上'],x=>{S.assetRange=x;checkReady();});
  buildSingleSelectList(co,['95% 以上','50–95%','5–50%','5% 以下'],x=>{S.cashRatio=x;checkReady();});
}

/* ================= 階段 C｜智富管家分析 ================= */
function idleEstimate(){
  const base=assetMid();
  const pct={'95% 以上':0.97,'50–95%':0.72,'5–50%':0.28,'5% 以下':0.03}[S.cashRatio]||0.5;
  const est=base*pct;
  return {lo:Math.round(est*0.8/50000)*50000,hi:Math.round(est*1.2/50000)*50000,pct:Math.round(pct*100)};
}
function cashInsight(){
  return {
    '95% 以上':`## 現金比例極高，實質購買力可能被通膨侵蝕
您的資產幾乎全數放在活存或定存，資金運用上有最高的安全性與流動性，但長期持有仍有兩點需要留意：

- **通膨侵蝕購買力**：活存年利率通常不到 1%，長期低於物價上漲速度，實質購買力可能持續下降
- **幾乎未參與市場成長**：這筆資金目前幾乎沒有任何投資參與，等於完全放棄了潛在的成長機會

接下來，我們可以一起看看如何讓這筆閒置資金運用得更有效率。`,
    '50–95%':`## 現金比例偏高，實質購買力可能被通膨侵蝕
您的資產配置目前仍以保守的活存／定存為主。這樣的安排安全性較高，但也代表有一部分資金的成長效率有限，若重新規劃，這筆資金應有機會發揮更高的價值。`,
    '5–50%':`## 現金與投資配置已相對均衡
您目前的資金配置已有一定基礎，仍有一小部分資金留在低利率帳戶中。若一併規劃這部分資金，整體效益有機會進一步提升。`,
    '5% 以下':`## 現金比例極低，資金運用效率高
您的現金比例幾乎趨近於零，顯示資金幾乎已全數投入。若能一併檢視剩餘的閒置部位，整體資產配置可以更完整。`
  }[S.cashRatio]||'';
}
function stageC(){
  const est=idleEstimate();
  const myGen=flowGen;
  aiSay(["您好，我是凱基銀行的智富管家，先幫您依剛剛設定的資產情境做個初步分析。"],()=>{
    setTimeout(()=>{
      if(myGen!==flowGen)return;
      renderComponent('chart/pie',100-est.pct,assetMid());
      aiSay([`${cashInsight()}\n\n依您的資產級距與現金比例推估，您目前大概有一筆 **NT$${fmt(est.lo)} ~ NT$${fmt(est.hi)}** 的資金，一直是用比較低的利率方式閒置著。`],()=>{
        /* 這一題改用 popover/option-select（浮動選單，覆蓋在輸入框之上，見對應 Figma
           node 306:1102「問題回答優化」），不再走 #controls／setControls()：
           選完之後才用 aiAsk()＋meSay() 把「問題標題＋所選回答」補進聊天紀錄，
           畫面呈現方式跟其他既有提問（如 showNextSteps()）一致，不影響版面高度。 */
        const question="對於這筆閒置資金，您平時比較想怎麼運用它呢？";
        const opts=[
          {label:'先放著，可能是備用金或短期要用',
           ack:'*短期預留的資金，通常需要同時兼顧彈性與穩定，*例如子女學費、結婚基金這類支出。即使如此，這段閒置期間仍有機會透過部分配置提升資金效率，而不必完全放在低利率的帳戶中。',
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
        const popover=renderComponent('popover/option-select',question,opts,opt=>{
          popover.remove();
          aiAsk(question);
          meSay(opt.label);
          aiSay([opt.ack],()=>ch_d1(),{label:'管家正在理解分析'});
        });
      },{label:'為您分析資產配置中',heavy:true});
    },700);
  },{label:'管家為您準備分析中'});
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
    "接下來想請教您幾個問題，協助您掌握合適的**資金配置方式**——也就是多少比例放穩定型、多少比例追求成長，讓資金運用更有效率。"
  ],()=>{
    const question="首先想了解，這筆資金大概多久之後可能會用到呢？";
    const opts=[
      {label:'大概一年內就會用到',val:'一年內',wt:'high',kw:['一年內','1年內','很快','馬上','短期','隨時','近期']},
      {label:'應該一年以上都不會用到',val:'一年以上',wt:'low',kw:['一年以上','1年以上','很久','長期','不會用','都用不到','放很久']},
      {label:'還不確定，要看情況',val:'還不確定',wt:'mid',kw:['還不確定','不確定','不一定','看情況','說不準','不知道']}
    ];
    const popover=renderComponent('popover/option-select',question,opts,opt=>{
      popover.remove();S.q1=opt.val;S.depositWeight=opt.wt;
      aiAsk(question);meSay(opt.label);
      const summary=opt.val==='一年以上'?'這筆資金的時間彈性較大，適合作中長期規劃，也有更大的空間參與市場成長':opt.val==='一年內'?'這筆資金隨時可能派上用場，會優先以「靈活性與安全性」為考量':'這筆資金會採均衡配置，兼顧收益與調度彈性';
      aiSay([`*${summary}*。`],()=>ch_d2(),{label:'管家正在理解分析'});
    });
  },{label:'管家思考中'});
}
function ch_d2(){
  aiSay(["接下來想了解一下您的風險承受度："],()=>{
    const question="如果市場出現下跌，您能接受的跌幅程度大概是？";
    const opts=[
      {label:'完全不能接受本金有任何波動',val:'完全不能接受本金波動',
       ack:'*這代表本金安全是您最優先的考量。*我會以「完全保本與高穩定」的商品為主，為您規劃方向。',
       next:()=>resolveConservative(),kw:['不能','保本','不要波動','不想虧','零風險','安全','不能虧','怕']},
      {label:'可以接受小幅波動（跌幅約 10%～30%）',val:'可接受小幅波動',
       ack:'*了解，您能接受一定程度的波動。*我們可以在維持資產穩健的前提下，適度搭配收益型商品。',
       next:()=>ch_d3(),kw:['小波動','可以接受','還好','一點點','小幅','ok','OK','接受','10%','20%','30%','跌幅']},
      {label:'可以接受明顯波動（跌幅 30% 以上），以換取長期成長機會',val:'可接受淨值明顯波動換取成長',
       ack:'*了解，您能接受較大幅度的波動，以換取成長機會。*成長型商品會是較適合的方向，協助您評估資產增值的潛力。',
       next:()=>ch_d3(),kw:['明顯波動','高報酬','沒問題','敢','中等','可以波動','衝','成長','30%以上','40%','50%']}
    ];
    const popover=renderComponent('popover/option-select',question,opts,opt=>{
      popover.remove();S.q2=opt.val;
      aiAsk(question);meSay(opt.label);
      aiSay([opt.ack],opt.next,{label:'管家正在理解分析'});
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

/* ================= 階段 E｜屬性分流與初步推薦 =================
   不顯示屬性標籤（A/B/C/AB）；流程是：先反映使用者剛才說的需求 → RECO_REASON 解釋為什麼適合
   → 帶出「配置」的具體做法（呼應 ch_d1 先前提過的概念，也預告等一下的拉桿）→ 才給出商品方向 */
function timeframeNote(){
  return {'一年內':'比較快就可能會用到','一年以上':'短期內應該不會用到','還不確定':'還不確定什麼時候會用到'}[S.q1]||'還沒有明確的使用時間';
}
function stageE(){
  const prod=PRODUCT_DATA[S.recoType];
  const riskNote={
    '完全不能接受本金波動':'也希望本金完全穩定、不能有任何波動',
    '可接受小幅波動':'也能接受小幅度的波動，只是還是希望以相對穩健為主',
    '可接受淨值明顯波動換取成長':'也願意承擔比較明顯的波動，換取更大的成長空間'
  }[S.q2]||'也能接受一定程度的波動，換取成長的機會';
  const messages=[`綜合您剛才的回答——這筆資金${timeframeNote()}，${riskNote}，我來幫您分析一下比較合適的方向。`];
  if(S.horizonOverride){
    messages.push('不過債券通常需要持有到到期日（部分天期長達 20 年）才能確保保本與穩定領息，若中途提前賣出，可能無法拿回全部本金。考量這筆資金一年內就可能會用到，這裡改為規劃彈性較高、以收益與穩健為主的基金，同樣能兼顧資金運用的靈活度。');
  }
  messages.push(RECO_REASON[S.recoType]);
  aiSay(messages,()=>{
    const bridge=S.recoType==='deposit'
      ? `所以這筆資金，我會建議先以 <b>${prod.name}</b> 為主，讓資金穩定累積，之後如果想法有變化，也能再彈性調整。`
      : S.recoType==='combo'
      ? '所以我不會建議您把這筆資金全部押在同一個地方，會先留一部分在穩定的活存，其餘的部分再配置在債券或基金——等一下您可以先看看兩份清單，找到您能安心持有的比例。'
      : `所以我不會建議您把這筆資金全部押在同一個地方，而是抓一部分留在穩定的活存、一部分配置在${prod.tag}，找到您能安心持有的比例。`;
    aiSay([bridge],()=>stageF(),{label:'為您規劃資金配置中'});
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
function stageGList(){
  const cats=S.recoType==='combo'?['bond','fund']:[S.recoType];
  const tolerance=S.q2==='可接受小幅波動'?'穩健':'積極';
  const items=matchCatalogAtLeast(cats,riskAllowed(tolerance),assetTierAllowed(S.assetRange),2);
  const riskNote=tolerance==='穩健'
    ?'考量您能接受的波動幅度較小，這裡先篩出風險等級屬於「穩健」的商品，讓波動程度落在您能安心承受的範圍內。'
    :'考量您能接受較明顯的波動、也想追求更高的成長空間，這裡的篩選範圍涵蓋穩健到積極的商品，讓您有更多元的選擇。';
  const intro={
    bond:`我依您能接受的波動程度與資金規模，從信評、天期、配息頻率幫您篩出幾檔債券。${riskNote}您可以先看看商品詳情，或直接試算：`,
    fund:`我依您能接受的波動程度與資金規模，從資產類別、配息方式幫您篩出幾檔基金。${riskNote}您可以先看看商品詳情，或直接試算：`,
    combo:`我依您能接受的波動程度與資金規模，分別從債券與基金裡各篩出幾檔，讓您可以搭配著看。${riskNote}您可以先看看商品詳情，或直接試算：`,
    deposit:'我整理了本行美元定存的天期與利率供您參考，您可以先看看各天期的商品詳情，或直接試算：'
  }[S.recoType]||'依您剛才的回答，我幫您整理了幾檔符合需求的商品，您可以先看看商品詳情，或直接試算：';
  aiSay([intro],()=>{
    showCatalogCards(items);
  },{label:'為您篩選商品中'});
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
    down();settleTurn();
    return;
  }
  if(items.length>1){
    renderComponentRow('card/product',items,onDetail,onCalc);
  }else{
    appendToChat(renderComponent('card/product',items[0],onDetail,onCalc));
    down();settleTurn();
  }
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
  if(p.cat==='bond'&&p.issuerInfo){
    messages.push(`**關於發行機構**\n${p.issuerInfo}\n\n${BOND_ISSUER_DISCLAIMER}`);
  }else if(p.cat==='fund'&&p.managerInfo){
    messages.push(`**關於這檔基金**\n${p.managerInfo}`);
  }
  aiSay(messages,()=>{
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
  },{label:'為您整理商品資訊中',cancelToken:myToken});
}
function backToCatalogList(items){
  aiSay(['以下是符合您需求的其他商品：'],()=>showCatalogCards(items),{label:'管家整理中'});
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
/* H-2b 綜合分流邏輯：結合 B-1（S.assetRange）、B-2（S.cashRatio）、H-1（S.h1Amt / S.h1Ratio）、H-2（keys）*/
function classifyH2(keys){
  const hasGrowth=keys.some(k=>k==='stock'||k==='oversea_stock'||k==='etf'||k==='fund');
  const hasBond=keys.includes('bond');
  if(keys.length===0){
    return{result:'deposit',reason:'*目前資金大多處於閒置狀態。*建議可以先從美元定存或極低風險的工具開始，逐步建立投資經驗。'};
  }
  if(hasGrowth&&!hasBond){
    return{result:'bond',reason:'*目前配置偏重成長型資產，穩定收益的部位相對較少。*建議補上一部分債券部位，透過穩定的配息現金流，平衡整體資產的波動程度。'};
  }
  if(hasBond||keys.length>=3||(S.h1Ratio==='50% 以上'&&keys.length>0)){
    return{result:'fund',reason:'*您目前的資產配置已相當多元，也累積了一定的投資經驗。*這個階段適合透過精選基金組合，做跨區域的分散配置，進一步爭取資本利得的機會。'};
  }
  return{result:'deposit',reason:'*目前資金大多處於閒置狀態。*建議可以先從美元定存或極低風險的工具開始，逐步建立投資經驗。'};
}
/* 資產體質修正：以 B-2 現金比例與 H-1 投資比例／規模微調初步結果 */
function adjustH2(base){
  let{result,reason}=base;
  if(result==='fund'&&(S.cashRatio==='95% 以上'||S.h1Ratio==='1–50%')){
    result='bond';reason='*您已具備一定的投資概念，不過目前現金比例偏高，或其他配置仍偏保守。*建議先透過債券打好穩定收益的基礎，會比直接投入基金更為穩健。';
  }else if(result==='bond'&&(S.assetRange==='200 萬以上'||S.h1Amt==='200 萬以上')&&S.h1Ratio==='50% 以上'){
    result='fund';reason='*您的資金規模充足，投資風格也偏積極。*可以進一步搭配基金組合，讓資金有更大的空間發揮成長潛力。';
  }
  ({result,reason}=reconcileWithOriginal({result,reason}));
  if(result==='bond'&&S.q1==='一年內'){
    result='fund';reason='*這筆資金一年內就可能會用到，而債券通常需要持有到到期日（部分天期長達 20 年）才能確保保本與穩定領息。*若中途提前賣出，可能無法拿回全部本金，因此這裡改為規劃彈性較高、以收益與穩健為主的基金，兼顧資金運用的靈活度。';
  }
  return{result,reason};
}
/* 綜合行內／行外依據：H-2 目前只依他行資產資訊判斷方向，完全沒參考行內三題（Q2風險承受度／Q3債券基金偏好）已得出的 S.recoType，
   等於使用者剛剛的回答被整套換掉。這裡用 S.recoType 當基準，他行資訊最多只能把結果往上或往下調整一個層級（定存↔債券↔基金），
   避免行內已明確表達的風險承受度被他行資產一次跳兩級蓋掉 */
const RECOTYPE_RANK={deposit:1,bond:2,fund:3};
const RANK_RECOTYPE=['deposit','bond','fund'];
function reconcileWithOriginal(adjusted){
  let{result,reason}=adjusted;
  const origRank=RECOTYPE_RANK[S.recoType]||RECOTYPE_RANK.bond;
  const hRank=RECOTYPE_RANK[result];
  const diff=hRank-origRank;
  if(diff>=2){
    result=RANK_RECOTYPE[origRank];
    reason='*行內原本的風險評估偏保守，但他行資產顯示您已具備豐富的多元投資經驗。*因此在原本的判斷基礎上調高一個層級，同時兼顧您先前表達過的風險考量與整體資產的實際配置狀況。';
  }else if(diff<=-2){
    result=RANK_RECOTYPE[origRank-2];
    reason='*行內原本的風險評估偏積極，但他行資產顯示您目前的投資經驗或占比仍偏保守。*因此在原本的判斷基礎上調低一個層級，先以較穩健的方向打好基礎，之後可以再逐步調整。';
  }
  return{result,reason};
}
function stageH2(){
  if(S.h1Ratio==='0%'){
    const base={result:'deposit',reason:'*目前資金大多處於閒置狀態。*建議可以先從美元定存或極低風險的工具開始，逐步建立投資經驗。'};
    const adj=reconcileWithOriginal(base);
    S.h2Items=[];S.h2Reason=adj.reason;S.recoTypeH=adj.result;
    aiSay(['了解，看來您在其他銀行的資金也是偏保守的配置。'],()=>stageH3(),{label:'管家正在理解分析'});
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
   資產樣貌整理放在這裡（H-2 選完投資項目後馬上呈現），不要延到 stageH3List 才出現 */
function stageH3(){
  const prod=PRODUCT_DATA[S.recoTypeH];
  const calcLabel=calcLabelFor(prod);
  const recap=`幫您把目前掌握到的資產樣貌整理一下：
- 凱基銀行資產級距：${S.assetRange||'—'}，現金比例：${S.cashRatio||'—'}
- 其他銀行資產級距：${S.h1Amt||'—'}，投資比例：${S.h1Ratio||'—'}
- 其他銀行主要投資項目：${(S.h2Items&&S.h2Items.length)?S.h2Items.join('、'):'目前沒有投資'}`;
  const bridge=S.recoTypeH==='deposit'
    ? `綜合看下來，我會建議您先以 <b>${prod.name}</b> 為主，讓資金穩定累積。`
    : `所以我不會建議您把資金全部押在同一個地方，而是抓一部分留在穩定的活存、一部分配置在${prod.tag}，找到您能安心持有的比例。`;
  aiSay([recap,S.h2Reason,bridge],()=>{
    showNextSteps('了解這個方向之後，您想怎麼進行下一步呢？',[
      {id:'accept',title:calcLabel,description:'看看符合需求的商品，再從中試算',
        keywords:['試算','配置','查看','清單','商品','好','可以','ok','OK'],
        onSelect:()=>{clearControls();stageH3List();}}
    ]);
  },{label:'為您彙整資產資料中',heavy:true});
}
/* 補充路徑沒有直接對應的風險承受度題，資產規模取本行／他行兩邊級距較大的一邊；
   資產樣貌已在 stageH3 呈現過，這裡只帶出符合需求的商品清單（定存＝美元定存 5 檔天期，跟債券／基金一樣走 CATALOG 清單） */
function stageH3List(){
  const items=matchCatalogAtLeast([S.recoTypeH],riskAllowed('積極'),biggerAssetTierAllowed(S.assetRange,S.h1Amt),2);
  const riskNote='考量您在本行與其他銀行的整體資產配置與投資經驗，這裡涵蓋穩健到積極、較完整的風險層級，讓您能依需求挑選。';
  const intro={
    bond:`納入您整體的資產狀況，我從信評、天期、配息頻率幫您篩出幾檔債券供您參考。${riskNote}您可以先看看商品詳情，或直接試算：`,
    fund:`納入您整體的資產狀況，我從資產類別、配息方式幫您篩出幾檔基金供您參考。${riskNote}您可以先看看商品詳情，或直接試算：`,
    deposit:'納入您整體的資產狀況，我整理了本行美元定存的天期與利率供您參考，您可以先看看商品詳情，或直接試算：'
  }[S.recoTypeH];
  aiSay([intro],()=>{
    showCatalogCards(items);
  },{label:'為您篩選商品中'});
}
