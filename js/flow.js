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
    <div class="kicker">凱基銀行 · 智富管家</div>
    <h1>閒置資金健檢活動</h1>
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
    <h1>先設定您在凱基銀行的資產情境</h1>
    <div class="lead">這些設定僅用於本次試算，幫助智富管家給您更貼近現況的建議。</div>
    <div class="q">1. 您在本行的總資產級距約為？</div>
    <div id="rangeOpts"></div>
    <div class="q">2. 其中現金（活存／定存）比例約為？</div>
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
    '85% 以上':`## 現金比例偏高
您目前的資產有相當高的比例，是以活存或定存這類方式持有。這樣的安排非常安全、隨時能動用，但長期來看有兩個地方值得留意：

- 活存利率通常不到 1%，長期下來很難追上物價上漲的幅度，等於資金的實質購買力在慢慢變小
- 這麼高比例的資金都沒有參與投資，也等於錯過了讓資金成長的機會

這也是接下來我們要一起討論的重點：怎麼讓這筆閒置資金更有效率地運用。`,
    '60–85%':`## 現金比例偏高
您的資產配置目前仍以保守的活存／定存為主。這樣的安排很安全，但也代表有一部分資金的成長效率不高，若能重新規劃一下，會更有機會發揮這筆資金的價值。`,
    '30–60%':`## 現金與投資接近平衡
您的現金與投資比例算是接近平衡，這是不錯的基礎。不過還是有一部分資金停留在低利率的帳戶裡，如果能一併規劃，資金運用會更有效率。`,
    '30% 以下':`## 現金比例已經不高
看得出來您已經把大部分資產投入運用了，這部分閒置資金如果也能一併規劃，您的整體配置會更完整。`
  }[S.cashRatio]||'';
}
function stageC(){
  const est=idleEstimate();
  aiSay(["您好，我是凱基銀行的智富管家，先幫您依剛剛設定的資產情境做個初步分析。"],()=>{
    setTimeout(()=>{
      addDonut(100-est.pct,assetMid());
      aiSay([`${cashInsight()}\n\n依您的資產級距與現金比例推估，您目前大概有一筆 **NT$${fmt(est.lo)} ~ NT$${fmt(est.hi)}** 的資金，一直是用比較低的利率方式閒置著。`],()=>{
        aiAsk("這筆閒置資金，您會怎麼運用呢？");
        const w=wrap();
        const opts=[
          ['先放著，可能是備用金或短期要用',
           '**這類「先放著」的資金，很多時候不是沒有想法，而是當作緊急備用金，或是預留給短期內比較明確的用途**——像是子女學費、結婚基金這類支出。即使是這樣，閒置的這段時間也不一定只能放在低利率的地方，也許還有機會利用這段時間，讓資產小小提升一些。',
           ['先放著','放著','放着','不動','先不用','放著就好','備用金','緊急預備金','學費','結婚','短期會用到']],
          ['想加減賺一點零用錢，風險不要太高',
           '**您希望在風險不要太高的前提下，讓這筆錢多少賺一點**，那我再透過幾個問題，幫您抓一個合適的比例。',
           ['零用錢','零花','加減賺','賺一點','小賺','零頭','風險不要太高']],
          ['想讓這筆錢成長更多，可以承擔一些風險',
           '**您希望這筆資金有更明顯的成長空間，也願意承擔一些風險**，那我再透過幾個問題，幫您抓一個合適的配置方向。',
           ['提升價值','價值提升','增值','成長','積極','提高','承擔風險']],
          ['還沒想法，想先聽看看建議',
           '**沒問題，那我先透過幾個簡單的問題，了解一下您的使用時間與風險承受度**，幫您找一個比較合適的方向。',
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
    "接下來想請教您幾個問題，幫您找到比較合適的**資金配置方式**——也就是這筆錢大概抓多少比例放在穩定的地方、多少比例配置在追求成長的商品上，讓這筆資金運用得更有效率。",
    "首先想了解，這筆資金大概多久之後可能會用到呢？"
  ],()=>{
    const w=wrap();
    const o=[
      ['大概一年內就會用到','一年內','high',['一年內','1年內','很快','馬上','短期','隨時','近期']],
      ['應該一年以上都不會用到','一年以上','low',['一年以上','1年以上','很久','長期','不會用','都用不到','放很久']],
      ['還不確定，要看情況','還不確定','mid',['還不確定','不確定','不一定','看情況','說不準','不知道']],
    ];
    o.forEach(([label,val,wt,kw])=>w.appendChild(choiceBtn(label,null,()=>{S.q1=val;S.depositWeight=wt;meSay(label);clearControls();
      const summary=val==='一年以上'?'這筆資金短期內應該用不到，可以承擔比較長的投資期間':val==='一年內'?'這筆資金在比較短的時間內就可能會用到，需要保留一定的靈活性':'目前還不確定什麼時候會用到，那就先用均衡一點的比例配置，保留彈性';
      aiSay([`**${summary}**。`],()=>ch_d2());},kw)));
    setControls(w);
  });
}
function ch_d2(){
  aiSay(["接下來想了解一下您的風險承受度：如果市場出現短暫的下跌，您的反應會是？"],()=>{
    const w=wrap();
    w.appendChild(choiceBtn('完全不能接受本金有任何波動',null,()=>{S.q2='完全不能接受本金波動';meSay('完全不能接受本金有任何波動');clearControls();
      aiSay(['**看得出來您偏好本金穩定，不希望有任何波動**，這樣的話，我會以保本為優先來幫您規劃，不會建議您承擔額外的市場風險。'],()=>resolveConservative());},['不能','保本','不要波動','不想虧','零風險','安全','不能虧','怕']));
    w.appendChild(choiceBtn('可以接受小幅度的波動',null,()=>{S.q2='可接受小幅波動';meSay('可以接受小幅度的波動');clearControls();
      aiSay(['**您可以接受小幅度的波動**，那我們可以再往下聊聊，投資型商品裡有哪一種比較適合您。'],()=>ch_d3());},['小波動','可以接受','還好','一點點','小幅','ok','OK','接受']));
    w.appendChild(choiceBtn('可以接受淨值明顯波動，換取成長空間',null,()=>{S.q2='可接受淨值明顯波動換取成長';meSay('可以接受淨值明顯波動，換取成長空間');clearControls();
      aiSay(['**您願意承擔比較明顯的波動來換取成長空間**，這樣的話，投資型商品應該會更適合您。'],()=>ch_d3());},['明顯波動','高報酬','沒問題','敢','中等','可以波動','衝','成長']));
    setControls(w);
  });
}
function ch_d3(){
  aiSay(["最後一個問題，想了解在投資型商品裡，您比較看重哪一種特質？這能幫我判斷債券還是基金更適合您。"],()=>{
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
      : `所以我不會建議您把這筆資金全部押在同一個地方，而是抓一部分留在穩定的定存、一部分配置在${prod.tag}，找到您能安心持有的比例——這也是等一下試算時，您可以自己拖動拉桿調整的部分。`;
    aiSay([bridge],()=>stageF());
  });
}

/* ================= 階段 F｜詢問下一步 ================= */
function calcLabelFor(prod){return prod.key==='deposit'?'開始試算':`查看${prod.tag}清單`;}
function stageF(){
  const prod=PRODUCT_DATA[S.recoType];
  const calcLabel=calcLabelFor(prod);
  const sub=prod.key==='deposit'?'看看定存的試算結果':'看看符合需求的商品，再從中試算';
  aiSay(["了解這個方向之後，您想怎麼進行下一步呢？"],()=>{
    const w=wrap();
    w.appendChild(choiceBtn(calcLabel,sub,()=>{meSay(calcLabel);clearControls();S.path='accept';stageG();},['試算','配置','查看','清單','商品','直接','接受','好','可以','沒問題','ok','OK']));
    w.appendChild(choiceBtn('納入他行資產，取得完整分析','讓建議更貼近您的整體配置',()=>{meSay('納入他行資產，取得完整分析');clearControls();S.path='supplement';stageH1();},['補充','更多','其他','完整','他行','納入','資產']));
    setControls(w);
  });
}

/* ================= 階段 G｜（路徑 1）直接媒合 =================
   定存（屬性 C）沒有 CATALOG 清單可選，直接試算；債券／基金／搭配則先帶出符合需求的商品清單，
   使用者從清單挑選商品後才進入試算，試算完可以查看其他產品、或前往下單／諮詢理專 */
function stageG(){
  if(S.recoType==='deposit'){
    aiSay(['那我們就來看看定存方案的年化報酬試算：'],()=>{
      runDepositCalcAndFinish(()=>{
        S.selectedProductCode=null;
        renderFinalCTA();
      });
    });
    return;
  }
  stageGList();
}
function stageGList(){
  const cats=S.recoType==='combo'?['bond','fund']:[S.recoType];
  const tolerance=S.q2==='可接受小幅波動'?'穩健':'積極';
  const items=matchCatalog(cats,riskAllowed(tolerance),assetTierAllowed(S.assetRange));
  const intro={
    bond:'我依您能接受的波動程度與資金規模，從信評、天期、配息頻率幫您篩出幾檔債券，您可以先看看商品詳情，或直接試算：',
    fund:'我依您能接受的波動程度與資金規模，從資產類別、配息方式幫您篩出幾檔基金，您可以先看看商品詳情，或直接試算：',
    combo:'我依您能接受的波動程度與資金規模，分別從債券與基金裡各篩出幾檔，讓您可以搭配著看，您可以先看看商品詳情，或直接試算：'
  }[S.recoType]||'依您剛才的回答，我幫您整理了幾檔符合需求的商品，您可以先看看商品詳情，或直接試算：';
  aiSay([intro],()=>{
    showCatalogCards(items);
  });
}

/* ================= 商品清單 → 詳情／試算 → 下單／諮詢理專（G、H 兩條路徑共用） ================= */
function showCatalogCards(items){
  renderCatalogCards(items,
    p=>enterProductCalc(p,items),
    p=>enterProductDetail(p,items));
}
function enterProductDetail(p,items){
  clearControls();
  const lines=[
    `## ${p.name}`,
    p.feature,
    `- 商品類別：**${p.cat==='bond'?'債券':'基金'}**｜幣別：**${p.currency}**`,
    `- 最低申購金額：**${p.minAmt}**｜配息頻率：**${p.payFreq}**`,
    p.cat==='bond'?`- 到期日：**${p.maturity}**（首次贖回日：${p.callDate}）`:`- 申購方式：**${p.entry}**`
  ].join('\n');
  aiSay([lines],()=>{
    const w=wrap();
    w.appendChild(choiceBtn('試算這檔商品','看看這檔商品的年化報酬試算',()=>{meSay('試算這檔商品');clearControls();enterProductCalc(p,items);},['試算','算','好','可以','ok','OK']));
    w.appendChild(choiceBtn('返回清單','看看其他商品',()=>{meSay('返回清單');clearControls();backToCatalogList(items);},['返回','清單','其他','上一步','回去']));
    setControls(w);
  });
}
function backToCatalogList(items){
  aiSay(['以下是符合您需求的其他商品：'],()=>showCatalogCards(items));
}
function enterProductCalc(p,items){
  clearControls();
  S.selectedProductCode=p.code;
  const tag=p.cat==='bond'?'債券':'基金';
  aiSay([investRationale(tag),'這是這檔商品的試算結果，您可以切換「近1年／近3年」，也能拖動下面的拉桿調整配置比例：'],()=>{
    chatBox.appendChild(buildProductCalcCard(p,100-keepPctFor()));
    down();
    renderFinalCTA();
    const w=wrap();
    w.appendChild(choiceBtn('查看其他產品','回到清單看看別的選擇',()=>{meSay('查看其他產品');clearControls();backToCatalogList(items);},['查看','其他','清單','商品','回去','返回']));
    w.appendChild(choiceBtn('納入他行資產，取得完整分析','讓建議更貼近您的整體配置',()=>{meSay('納入他行資產，取得完整分析');clearControls();S.path='supplement';stageH1();},['補充','更多','其他資產','完整','他行','納入','資產']));
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
  aiSay(['這個比例能幫我判斷您平常對投資的熟悉程度、以及目前的風險偏好，這些資產裡，大概有多少比例是用在投資上呢？'],()=>{
    const w=wrap();
    ['0%','1–50%','50% 以上'].forEach(x=>{
      w.appendChild(choiceBtn(x,null,()=>{S.h1Ratio=x;meSay(x);clearControls();stageH2();},[x]));
    });
    setControls(w);
  });
}
/* H-2：目前主要投資項目（可複選） */
const H2_OPTIONS=[
  {key:'stock',label:'股票',cat:'growth'},
  {key:'etf',label:'ETF',cat:'growth'},
  {key:'fund',label:'基金',cat:'growth'},
  {key:'bond',label:'債券',cat:'bond'},
  {key:'insurance',label:'儲蓄險',cat:'insurance'}
];
/* H-2b 綜合分流邏輯：結合 B-1（S.assetRange）、B-2（S.cashRatio）、H-1（S.h1Amt / S.h1Ratio）、H-2（keys）*/
function classifyH2(keys){
  const hasGrowth=keys.some(k=>k==='stock'||k==='etf'||k==='fund');
  const hasBond=keys.includes('bond');
  if(keys.length===0||(keys.length===1&&keys[0]==='insurance')){
    return{result:'deposit',reason:'**這筆資金幾乎沒有參與市場，風險偏好也偏低**——在還沒有投資經驗、或還在觀察的階段，先以定存穩定累積，會是比較安心的做法。'};
  }
  if(hasGrowth&&!hasBond){
    return{result:'bond',reason:'**您已經持有股票、ETF 或基金這類波動型資產，但還缺少固定收益的部位**——用債券補上相對穩定的配息與現金流，能讓整體配置更分散、更平衡。'};
  }
  if(hasBond||keys.length>=3||(S.h1Ratio==='50% 以上'&&keys.length>0)){
    return{result:'fund',reason:'**您已經建立了基礎配置、也有一定的投資經驗**——這個階段適合用基金組合再進階分散，進一步追求成長。'};
  }
  return{result:'deposit',reason:'**這筆資金幾乎沒有參與市場，風險偏好也偏低**——在還沒有投資經驗、或還在觀察的階段，先以定存穩定累積，會是比較安心的做法。'};
}
/* 資產體質修正：以 B-2 現金比例與 H-1 投資比例／規模微調初步結果 */
function adjustH2(base){
  let{result,reason}=base;
  if(result==='fund'&&(S.cashRatio==='85% 以上'||S.h1Ratio==='1–50%')){
    return{result:'bond',reason:'**雖然您已經有投資經驗，但現金比例偏高、或是其他銀行的投資比例還偏保守**——先以債券建立穩定的收益基礎，會比直接跳到基金更穩健。'};
  }
  if(result==='bond'&&(S.assetRange==='200 萬以上'||S.h1Amt==='200 萬以上')&&S.h1Ratio==='50% 以上'){
    return{result:'fund',reason:'**您的資金規模充裕，其他銀行的投資比例也相對積極**——可以再進一步用基金組合追求成長，讓資金的成長潛力發揮更完整。'};
  }
  return{result,reason};
}
function stageH2(){
  if(S.h1Ratio==='0%'){
    S.h2Items=[];S.h2Reason='**您在其他銀行的資金幾乎沒有參與市場，風險偏好也偏低**——先以定存穩定累積，會是比較安心的做法。';S.recoTypeH='deposit';
    aiSay(['了解，看來您在其他銀行的資金也是偏保守的配置。'],()=>stageH3());
    return;
  }
  aiSay(['您目前主要有投資哪些項目呢？可以複選，選好之後點一下「確認送出」。'],()=>{
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

/* ================= H-3 試算與轉入建議 ================= */
function stageH3(){
  const prod=PRODUCT_DATA[S.recoTypeH];
  const calcLabel=calcLabelFor(prod);
  const sub=prod.key==='deposit'?'看看定存的試算結果':'看看符合需求的商品，再從中試算';
  const bridge=S.recoTypeH==='deposit'
    ? `綜合看下來，我會建議您先以 <b>${prod.name}</b> 為主，讓資金穩定累積。`
    : `所以我不會建議您把資金全部押在同一個地方，而是抓一部分留在穩定的定存、一部分配置在${prod.tag}，找到您能安心持有的比例——這也是等一下試算時可以自己拖動調整的部分。`;
  aiSay([`把您在其他銀行大約「${S.h1Amt}」的資產、還有投資比例（${S.h1Ratio}）都一起考慮進來，這樣整體的配置樣貌會更完整。`,
    S.h2Reason,
    bridge],()=>{
    const w=wrap();
    w.appendChild(choiceBtn(calcLabel,sub,()=>{meSay(calcLabel);clearControls();stageH3List();},['試算','配置','查看','清單','商品','好','可以','ok','OK']));
    setControls(w);
  });
}
/* 補充路徑沒有直接對應的風險承受度題，資產規模取本行／他行兩邊級距較大的一邊；
   先把完整資產樣貌做個整理，再帶出符合需求的商品清單（deposit 情境沒有 CATALOG 可選，直接試算） */
function stageH3List(){
  const recap=`幫您把目前掌握到的資產樣貌整理一下：
- 凱基銀行資產級距：**${S.assetRange||'—'}**，現金比例：**${S.cashRatio||'—'}**
- 其他銀行資產級距：**${S.h1Amt||'—'}**，投資比例：**${S.h1Ratio||'—'}**
- 其他銀行主要投資項目：**${(S.h2Items&&S.h2Items.length)?S.h2Items.join('、'):'目前沒有投資'}**`;
  if(S.recoTypeH==='deposit'){
    aiSay([recap,'那我們就來看看定存方案的年化報酬試算：'],()=>{
      runDepositCalcAndFinish(()=>{
        S.selectedProductCode=null;
        renderFinalCTA();
      });
    });
    return;
  }
  const items=matchCatalog([S.recoTypeH],riskAllowed('積極'),biggerAssetTierAllowed(S.assetRange,S.h1Amt));
  const intro=S.recoTypeH==='bond'
    ?'納入您整體的資產狀況，我從信評、天期、配息頻率幫您篩出幾檔債券供您參考，您可以先看看商品詳情，或直接試算：'
    :'納入您整體的資產狀況，我從資產類別、配息方式幫您篩出幾檔基金供您參考，您可以先看看商品詳情，或直接試算：';
  aiSay([recap,intro],()=>{
    showCatalogCards(items);
  });
}
