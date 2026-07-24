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
  clearControls();hideInput();
  const p=wrap();p.className='selpage';
  p.innerHTML=`
    <div class="selpage-hero">
      <video class="selpage-hero-video" autoplay muted loop playsinline>
        <source src="assets/opening-animation.mp4" type="video/mp4">
      </video>
    </div>
    <div class="kicker">凱基銀行 · 智富管家</div>
    <h1>幫您的閒置資金做個健康檢查，找出更合適的運用方式</h1>
    <div class="lead">花 2 分鐘，讓「智富管家」幫您盤點閒置資金，找出更適合的資金運用方式。</div>
    <button class="primary" id="startBtn">開始體驗 →</button>`;
  screen().innerHTML='';screen().appendChild(p);
  p.querySelector('#startBtn').onclick=()=>stepB();
}

/* ================= 階段 B｜設定資產情境 ================= */
function stepB(){
  clearControls();
  const p=wrap();p.className='selpage';
  p.innerHTML=`
    <div class="kicker">開始之前</div>
    <h1>開始前，先了解您在凱基銀行的資產狀況</h1>
    <div class="lead">這些資訊僅用於本次初步試算，能幫助智富管家提供更貼近您目前情況的建議。</div>
    <div class="q">1. 您在本行的總資產級距大約落在哪裡呢？</div>
    <div id="rangeOpts"></div>
    <div class="q">2. 其中隨時能動用的現金（活存／定存）大概占多少比例？</div>
    <div id="cashOpts"></div>
    <button class="primary" id="startBtn" disabled>開啟智富管家分析 →</button>`;
  screen().innerHTML='';screen().appendChild(p);
  const ro=p.querySelector('#rangeOpts'),co=p.querySelector('#cashOpts'),startBtn=p.querySelector('#startBtn');
  const checkReady=()=>{startBtn.disabled=!(S.assetRange&&S.cashRatio);};
  ['100 萬以下','100 萬 – 200 萬','200 萬以上'].forEach(x=>{
    const b=document.createElement('button');b.className='opt';b.textContent=x;
    b.onclick=()=>{ro.querySelectorAll('.opt').forEach(o=>o.classList.remove('sel'));
      b.classList.add('sel');S.assetRange=x;checkReady();};
    ro.appendChild(b);
  });
  ['85% 以上','60–85%','30–60%','30% 以下'].forEach(x=>{
    const b=document.createElement('button');b.className='opt';b.textContent=x;
    b.onclick=()=>{co.querySelectorAll('.opt').forEach(o=>o.classList.remove('sel'));
      b.classList.add('sel');S.cashRatio=x;checkReady();};
    co.appendChild(b);
  });
  startBtn.onclick=()=>enterChat();
}

/* ================= 階段 C｜智富管家分析 ================= */
function idleEstimate(){
  const base=assetMid();
  const pct={'85% 以上':0.92,'60–85%':0.72,'30–60%':0.45,'30% 以下':0.2}[S.cashRatio]||0.5;
  const est=base*pct;
  return {lo:Math.round(est*0.8/50000)*50000,hi:Math.round(est*1.2/50000)*50000,pct:Math.round(pct*100)};
}
function cashInsight(){
  return {
    '85% 以上':`## 現金比例偏高，實質購買力可能正被通膨侵蝕
您目前的資產大多放在活存或定存，安全性高、隨時可動用，但長期來看有兩點需要留意：

- **通膨影響**：活存年利率通常不到 1%，較難追上物價上漲的速度，實質購買力可能逐漸下降。
- **成長機會有限**：這部分資金沒有參與投資，較難發揮成長潛力。

接下來，我們可以一起討論如何讓這筆閒置資金運用得更有效率。`,
    '60–85%':`## 現金比例偏高，實質購買力可能正被通膨侵蝕
您的資產配置目前仍以保守的活存／定存為主。這樣的安排安全性較高，但也代表有一部分資金的成長效率有限，若能重新規劃，會更有機會發揮這筆資金的價值。`,
    '30–60%':`## 現金與投資配置大致均衡
您目前的配置已具備一定基礎，仍有一小部分資金留在低利率帳戶中，如果能一併規劃，整體效益會更好。`,
    '30% 以下':`## 現金比例控制得宜，資金運用效率已相對理想
您目前的資產配置已相當靈活。如果能把剩餘這筆閒置資金也一併規劃，整體配置會更完整。`
  }[S.cashRatio]||'';
}
function stageC(){
  const est=idleEstimate();
  aiSay(["您好，我是凱基銀行的智富管家，先幫您依剛剛設定的資產情境做個初步分析。"],()=>{
    setTimeout(()=>{
      renderComponent('chart/pie',100-est.pct,assetMid());
      aiSay([`${cashInsight()}\n\n依您的資產級距與現金比例推估，您目前大概有一筆 **NT$${fmt(est.lo)} ~ NT$${fmt(est.hi)}** 的資金，一直是用比較低的利率方式閒置著。`],()=>{
        aiAsk("對於這筆閒置資金，您平時比較想怎麼運用它呢？");
        const w=wrap();
        const opts=[
          ['先放著，可能是備用金或短期要用',
           '**短期預留的資金最需要兼顧彈性與穩定**——像是子女學費、結婚基金這類支出。即使如此，這段閒置期間也不一定只能放在低利率的地方，仍有機會讓資產小幅提升。',
           ['先放著','放著','放着','不動','先不用','放著就好','備用金','緊急預備金','學費','結婚','短期會用到']],
          ['想加減賺一點零用錢，風險不要太高',
           '**了解，這類需求會以控制風險為優先考量**，我們會為您尋找穩健撥息或保本型的工具。',
           ['零用錢','零花','加減賺','賺一點','小賺','零頭','風險不要太高']],
          ['想讓這筆錢成長更多，可以承擔一些風險',
           '**了解，您希望這筆資金有更高的成長空間**，我們會在您可以接受的風險範圍內，為您挑選具備成長潛力的工具。',
           ['提升價值','價值提升','增值','成長','積極','提高','承擔風險']],
          ['還沒想法，想先聽看看建議',
           '**沒關係，我們可以一起找出方向**，先透過幾個簡單的問題，幫您確認較適合的規劃方向。',
           ['聽聽','建議','聽看看','都可以','幫我','不知道','聽你的']]
        ];
        opts.forEach(([label,ack,kw])=>w.appendChild(choiceBtn(label,null,()=>{
          meSay(label);clearControls();aiSay([ack],()=>ch_d1());
        },kw)));
        setControls(w);
      });
    },700);
  });
}

/* ================= 階段 D｜了解投資屬性（三題釐清） =================
   每題選完的階段性小結，不用卡片、不寫「小結」，直接用 aiSay + **粗體** 融入對話
   ch_d1 開頭先帶出「配置」的概念，讓使用者知道這幾題是為了什麼、也預告最後會有拉桿可以調整比例
   每題的按鈕「顯示文字」寫成順口的完整回答，但存進 S.q1/S.q2/S.q3 的仍是原本的短字串（見檔頭說明）*/
function ch_d1(){
  aiSay([
    "接下來想請教您幾個問題，幫您確認合適的**資金配置方式**——也就是多少比例放穩定型、多少比例追求成長。",
    "> 首先想了解，這筆資金大概多久之後可能會用到呢？"
  ],()=>{
    const w=wrap();
    const o=[
      ['大概一年內就會用到','一年內','high',['一年內','1年內','很快','馬上','短期','隨時','近期']],
      ['應該一年以上都不會用到','一年以上','low',['一年以上','1年以上','很久','長期','不會用','都用不到','放很久']],
      ['還不確定，要看情況','還不確定','mid',['還不確定','不確定','不一定','看情況','說不準','不知道']],
    ];
    o.forEach(([label,val,wt,kw])=>w.appendChild(choiceBtn(label,null,()=>{S.q1=val;S.depositWeight=wt;meSay(label);clearControls();
      const summary=val==='一年以上'?'這筆資金具有時間優勢，適合做中長期規劃，也有較大的彈性參與市場成長':val==='一年內'?'這筆資金隨時可能派上用場，我們會把靈活性與安全性列為優先考量':'我們會為您做均衡配置，兼顧收益與資金調度的彈性';
      aiSay([`**${summary}**。`],()=>ch_d2());},kw)));
    setControls(w);
  });
}
function ch_d2(){
  aiSay(["接下來想了解一下您的風險承受度：","> 如果市場出現下跌，您能接受的跌幅程度大概是？"],()=>{
    const w=wrap();
    w.appendChild(choiceBtn('完全不能接受本金有任何波動',null,()=>{S.q2='完全不能接受本金波動';meSay('完全不能接受本金有任何波動');clearControls();
      aiSay(['**您的回答顯示您重視本金的穩定性**，我會以完全保本、高穩定的商品為您規劃。'],()=>resolveConservative());},['不能','保本','不要波動','不想虧','零風險','安全','不能虧','怕']));
    w.appendChild(choiceBtn('可以接受小幅波動（跌幅約 10%～30%）',null,()=>{S.q2='可接受小幅波動';meSay('可以接受小幅波動（跌幅約 10%～30%）');clearControls();
      aiSay(['**了解，您可以接受小幅波動**，我們可以在維持資產穩健的前提下，適度搭配收益型商品。'],()=>ch_d3());},['小波動','可以接受','還好','一點點','小幅','ok','OK','接受','10%','20%','30%','跌幅']));
    w.appendChild(choiceBtn('可以接受明顯波動（跌幅 30% 以上），以換取長期成長機會',null,()=>{S.q2='可接受淨值明顯波動換取成長';meSay('可以接受明顯波動（跌幅 30% 以上），以換取長期成長機會');clearControls();
      aiSay(['**了解，您能接受較明顯的波動以換取成長空間**，成長型商品會是適合您的方向，協助您掌握資產增值的潛力。'],()=>ch_d3());},['明顯波動','高報酬','沒問題','敢','中等','可以波動','衝','成長','30%以上','40%','50%']));
    setControls(w);
  });
}
function ch_d3(){
  aiSay(["最後一個問題，這能幫我判斷債券還是基金更適合您：","> 在投資型商品裡，您比較看重哪一種特質？"],()=>{
    const w=wrap();
    w.appendChild(choiceBtn('希望領息穩定、到期時間明確',null,()=>{S.q3='領息穩定、到期時間明確';meSay('希望領息穩定、到期時間明確');clearControls();resolveAttribute('bond','B');},['領息','到期','穩定','固定','確定','債']));
    w.appendChild(choiceBtn('希望門檻較低、追求收益潛能',null,()=>{S.q3='想以較低門檻參與、追求收益潛能';meSay('希望門檻較低、追求收益潛能');clearControls();resolveAttribute('fund','A');},['低門檻','收益潛能','成長','基金','潛力']));
    w.appendChild(choiceBtn('兩者都可以，或想搭配著看',null,()=>{S.q3='都可以／想搭配';meSay('兩者都可以，或想搭配著看');clearControls();resolveAttribute('combo','AB');},['都可以','搭配','混合','都要','兩個都']));
    setControls(w);
  });
}
function resolveConservative(){S.attribute='C';S.recoType='deposit';stageE();}
function resolveAttribute(recoType,attr){S.attribute=attr;S.recoType=recoType;stageE();}

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
  aiSay([
    `綜合您剛才的回答——這筆資金${timeframeNote()}，${riskNote}，我來幫您分析一下比較合適的方向。`,
    RECO_REASON[S.recoType]
  ],()=>{
    const bridge=S.recoType==='deposit'
      ? `所以這筆資金，我會建議先以 <b>${prod.name}</b> 為主，讓資金穩定累積，之後如果想法有變化，也能再彈性調整。`
      : `所以我不會建議您把這筆資金全部押在同一個地方，而是抓一部分留在穩定的活存、一部分配置在${prod.tag}，找到您能安心持有的比例——這也是等一下試算時，您可以自己拖動拉桿調整的部分。`;
    aiSay([bridge],()=>stageF());
  });
}

/* ================= 階段 F｜詢問下一步 ================= */
function calcLabelFor(prod){return `查看${prod.tag}清單`;}
function stageF(){
  const prod=PRODUCT_DATA[S.recoType];
  const calcLabel=calcLabelFor(prod);
  aiSay(["> 了解這個方向之後，您想怎麼進行下一步呢？"],()=>{
    const w=wrap();
    if(S.path!=='supplement'){
      w.appendChild(choiceBtn('納入他行資產，取得完整分析','讓建議更貼近您的整體配置',()=>{meSay('納入他行資產，取得完整分析');clearControls();S.path='supplement';stageH1();},['補充','更多','其他','完整','他行','納入','資產']));
    }
    w.appendChild(choiceBtn(calcLabel,'看看符合需求的商品，再從中試算',()=>{meSay(calcLabel);clearControls();S.path='accept';stageG();},['試算','配置','查看','清單','商品','直接','接受','好','可以','沒問題','ok','OK']));
    setControls(w);
  });
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
  });
}

/* ================= 商品清單 → 詳情／試算 → 下單／諮詢理專（G、H 兩條路徑共用） ================= */
function showCatalogCards(items){
  const onDetail=p=>enterProductDetail(p,items);
  const onCalc=p=>enterProductCalc(p,items);
  if(items.length>1){
    renderComponentRow('card/product',items,onDetail,onCalc);
  }else{
    chatBox.appendChild(renderComponent('card/product',items[0],onDetail,onCalc));
    down();
  }
}
function enterProductDetail(p,items){
  clearControls();
  const catLabel={bond:'債券',fund:'基金',deposit:'定存'}[p.cat]||p.cat;
  const lines=[
    `## ${p.name}`,
    p.feature,
    `- 商品類別：**${catLabel}**｜幣別：**${p.currency}**`,
    `- 最低申購金額：**${p.minAmt}**｜配息頻率：**${p.payFreq}**`,
    p.cat==='bond'?`- 到期日：**${p.maturity}**（首次贖回日：${p.callDate}）`
      :p.cat==='deposit'?`- 存款天期：**${p.tenor}**｜計息方式：**機動利率、到期領息**`
      :`- 申購方式：**${p.entry}**`
  ].join('\n');
  aiSay([lines],()=>{
    const w=wrap();
    w.appendChild(choiceBtn('試算這檔商品','看看這檔商品的年化報酬試算',()=>{meSay('試算這檔商品');clearControls();enterProductCalc(p,items);},['試算','算','好','可以','ok','OK']));
    w.appendChild(choiceBtn('再看看其他產品','看看其他商品',()=>{meSay('再看看其他產品');clearControls();backToCatalogList(items);},['返回','清單','其他','上一步','回去']));
    setControls(w);
  });
}
function backToCatalogList(items){
  aiSay(['以下是符合您需求的其他商品：'],()=>showCatalogCards(items));
}
/* 債券／基金／外匯定存都用同一個 card/calculator 元件（Figma 對應的拉桿試算卡，含手搖飲/聚餐動畫）
   跟活存做配置比較；insight（investRationale）沒有對應欄位，先用一句話帶出。
   外匯定存利率不隨年期變動，關掉近1年/近3年切換（showPeriodTabs:false） */
function enterProductCalc(p,items){
  clearControls();
  S.selectedProductCode=p.code;
  const tag={bond:'債券',fund:'基金',deposit:'外匯定存'}[p.cat];
  const backLabel=p.cat==='deposit'?'查看其他天期':'查看其他產品';
  aiSay([investRationale(tag)],()=>{
    renderComponent('card/calculator',p,100-keepPctFor(),{tag,showPeriodTabs:p.cat!=='deposit'});
    renderFinalCTA();
    const w=wrap();
    w.appendChild(choiceBtn(backLabel,'回到清單看看別的選擇',()=>{meSay(backLabel);clearControls();backToCatalogList(items);},['查看','其他','清單','商品','天期','回去','返回']));
    if(S.path!=='supplement'){
      w.appendChild(choiceBtn('納入他行資產，取得完整分析','讓建議更貼近您的整體配置',()=>{meSay('納入他行資產，取得完整分析');clearControls();S.path='supplement';stageH1();},['補充','更多','其他資產','完整','他行','納入','資產']));
    }
    setControls(w);
  });
}

/* ================= 階段 H｜（路徑 2）補充更多資產資訊 ================= */
function stageH1(){
  aiSay(['那我們來聊聊您在凱基銀行以外的資產——這裡指的是股票、基金這類投資部位，還有活存、定存等現金部位，能幫助我更完整地了解您的整體配置。先讓我知道大概的資產級距：'],()=>{
    const w=wrap();
    ['100 萬以下','100 萬–200 萬','200 萬以上'].forEach(x=>{
      w.appendChild(choiceBtn(x,null,()=>{S.h1Amt=x;meSay(x);clearControls();stageH1b();},[x]));
    });
    setControls(w);
  });
}
function stageH1b(){
  aiSay(['這個比例能幫我判斷您平常對投資的熟悉程度、以及目前的風險偏好：','> 這些資產裡，大概有多少比例是用在投資上呢？'],()=>{
    const w=wrap();
    ['0%','1–50%','50% 以上'].forEach(x=>{
      w.appendChild(choiceBtn(x,null,()=>{S.h1Ratio=x;meSay(x);clearControls();stageH2();},[x]));
    });
    setControls(w);
  });
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
    return{result:'deposit',reason:'**這部分資金目前大多處於保守狀態**——建議先從美元定存或極低風險的工具開始，逐步建立理財的信心。'};
  }
  if(hasGrowth&&!hasBond){
    return{result:'bond',reason:'**您目前的配置偏向成長型，較缺少穩定收益的部位**——建議補上一些債券部位，用穩定的配息現金流為整體資產增加緩衝。'};
  }
  if(hasBond||keys.length>=3||(S.h1Ratio==='50% 以上'&&keys.length>0)){
    return{result:'fund',reason:'**您的資產配置已相當多元、也具備一定經驗**——這個階段適合用精選基金組合做跨區域分散配置，進一步評估資本利得的空間。'};
  }
  return{result:'deposit',reason:'**這部分資金目前大多處於保守狀態**——建議先從美元定存或極低風險的工具開始，逐步建立理財的信心。'};
}
/* 資產體質修正：以 B-2 現金比例與 H-1 投資比例／規模微調初步結果 */
function adjustH2(base){
  let{result,reason}=base;
  if(result==='fund'&&(S.cashRatio==='85% 以上'||S.h1Ratio==='1–50%')){
    return{result:'bond',reason:'**您具備一定的投資概念，不過目前現金比例偏高、或其他配置相對保守**——建議先透過債券打好收益基礎，會比直接配置基金更穩健。'};
  }
  if(result==='bond'&&(S.assetRange==='200 萬以上'||S.h1Amt==='200 萬以上')&&S.h1Ratio==='50% 以上'){
    return{result:'fund',reason:'**您的資金規模充足，投資風格也偏積極**——適合進一步搭配基金組合，讓這部分資金有機會發揮更大的成長潛力。'};
  }
  return{result,reason};
}
function stageH2(){
  if(S.h1Ratio==='0%'){
    S.h2Items=[];S.h2Reason='**這部分資金目前大多處於保守狀態**——建議先從美元定存或極低風險的工具開始，逐步建立理財的信心。';S.recoTypeH='deposit';
    aiSay(['了解，看來您在其他銀行的資金也是偏保守的配置。'],()=>stageH3());
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
    const confirmBtn=document.createElement('button');confirmBtn.className='choice';confirmBtn.style.textAlign='center';
    confirmBtn.style.color='#fff';confirmBtn.style.background='var(--brand)';confirmBtn.style.borderColor='var(--brand)';
    confirmBtn.textContent='確認送出';confirmBtn.disabled=true;
    confirmBtn.onclick=()=>{
      const items=H2_OPTIONS.filter(o=>selected.has(o.key));
      const base=classifyH2(items.map(o=>o.key));
      const adj=adjustH2(base);
      S.h2Items=items.map(o=>o.label);S.h2Reason=adj.reason;S.recoTypeH=adj.result;
      meSay(items.length?items.map(o=>o.label).join('、'):'目前沒有投資');
      clearControls();stageH3();
    };
    w.appendChild(confirmBtn);
    setControls(w);
  });
}

/* ================= H-3 試算與轉入建議 =================
   資產樣貌整理放在這裡（H-2 選完投資項目後馬上呈現），不要延到 stageH3List 才出現 */
function stageH3(){
  const prod=PRODUCT_DATA[S.recoTypeH];
  const calcLabel=calcLabelFor(prod);
  const recap=`幫您把目前掌握到的資產樣貌整理一下：
- 凱基銀行資產級距：**${S.assetRange||'—'}**，現金比例：**${S.cashRatio||'—'}**
- 其他銀行資產級距：**${S.h1Amt||'—'}**，投資比例：**${S.h1Ratio||'—'}**
- 其他銀行主要投資項目：**${(S.h2Items&&S.h2Items.length)?S.h2Items.join('、'):'目前沒有投資'}**`;
  const bridge=S.recoTypeH==='deposit'
    ? `綜合看下來，我會建議您先以 <b>${prod.name}</b> 為主，讓資金穩定累積。`
    : `所以我不會建議您把資金全部押在同一個地方，而是抓一部分留在穩定的活存、一部分配置在${prod.tag}，找到您能安心持有的比例——這也是等一下試算時可以自己拖動調整的部分。`;
  aiSay([recap,S.h2Reason,bridge],()=>{
    const w=wrap();
    w.appendChild(choiceBtn(calcLabel,'看看符合需求的商品，再從中試算',()=>{meSay(calcLabel);clearControls();stageH3List();},['試算','配置','查看','清單','商品','好','可以','ok','OK']));
    setControls(w);
  });
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
  });
}
