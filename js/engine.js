/* ============================================================
   引擎層（三人共用，異動請走 PR 讓大家 review，避免各自為政）
   - 商品資料容器、全域對話狀態、畫面渲染工具、試算卡元件、共用結尾流程
   - 「提問→試算→清單→CTA」這套連接流程在 flow.js（同樣是共用，不分人）
   - 三人各自的內容只寫在 content-attr-a.js／content-attr-b.js／content-attr-c.js
   ============================================================ */

/* ================= 商品資料區（凱基致富管家） =================
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
const DISCLAIMER='以上試算為過往資料回測，實際投資仍需評估市場風險。';

/* ================= 全域對話狀態 =================
   欄位皆由 flow.js（共用流程）讀寫，三人的 content-attr-*.js 不需要碰這裡。
   新增欄位時請放進 resetAll()：
   assetRange, cashRatio, q1, depositWeight, q2, q3, attribute,
   recoType, path, h1Amt, h1Ratio, h2Items, h2Reason, recoTypeH, selectedProductCode
*/
let S={};
const screen=()=>document.getElementById('screen');
const ctrls=()=>document.getElementById('controls');
const down=()=>{const s=screen();s.scrollTop=s.scrollHeight;};
function setControls(node){freeOverride=null;const c=ctrls();c.innerHTML='';if(node)c.appendChild(node);down();}
function clearControls(){ctrls().innerHTML='';}
function wrap(){return document.createElement('div');}
function assetMid(){return {'100 萬以下':800000,'100 萬 – 200 萬':1500000,'200 萬以上':3200000}[S.assetRange]||1000000;}

function resetAll(){
  S={assetRange:null,cashRatio:null,q1:null,depositWeight:'mid',q2:null,q3:null,
     attribute:null,recoType:null,path:null,h1Amt:null,h1Ratio:null,h2Items:null,h2Reason:null,recoTypeH:null,selectedProductCode:null};
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
    closeList();out.push(`<p class="md-p">${mdInline(line)}</p>`);
  });
  closeList();
  return out.join('');
}

/* ================= 對話輔助（共用渲染工具） ================= */
let chatBox=null,activeChoices=[],freeOverride=null,suppressNextEcho=false;
function enterChat(){showInput();activeChoices=[];const s=screen();s.innerHTML='';
  chatBox=wrap();chatBox.className='chat';s.appendChild(chatBox);stageC();}
function aiSay(msgs,done){
  let i=0;(function next(){
    if(i>=msgs.length){if(done)done();return;}
    const t=document.createElement('div');t.className='typing';
    t.innerHTML='<span class="d"></span><span class="d"></span><span class="d"></span>';
    chatBox.appendChild(t);down();
    setTimeout(()=>{t.remove();const m=document.createElement('div');m.className='ai-msg';
      m.innerHTML=mdToHtml(msgs[i]);chatBox.appendChild(m);down();i++;setTimeout(next,300);},620);
  })();
}
/* 需要使用者實際回答的提問句：用醒目的提問卡呈現，跟一般敘述性訊息（aiSay）區分開，
   讓使用者一眼看出「這句是要請你選」，不會被前面的說明文字稀釋掉 */
function aiAsk(question){
  const m=document.createElement('div');m.className='ask-msg';
  m.innerHTML=`<span class="ask-badge">?</span><span class="ask-text">${mdInline(question)}</span>`;
  chatBox.appendChild(m);down();
}
function meSay(text){if(suppressNextEcho){suppressNextEcho=false;return;}
  const m=document.createElement('div');m.className='me-msg';m.innerHTML='<span>'+text+'</span>';chatBox.appendChild(m);down();}
function choiceBtn(label,sub,onClick,keywords){const b=document.createElement('button');
  b.className='choice';b.innerHTML=label+(sub?'<small>'+sub+'</small>':'');
  b.onclick=()=>onClick(b);
  if(keywords)activeChoices.push({el:b,keywords});
  return b;}
/* ---- 限縮式自由輸入引擎 ---- */
function showInput(){const b=document.getElementById('inputbar');if(b)b.style.display='flex';}
function hideInput(){const b=document.getElementById('inputbar');if(b)b.style.display='none';const ci=document.getElementById('chatInput');if(ci)ci.value='';}
function matchChoices(text){const live=activeChoices.filter(c=>document.body.contains(c.el));
  for(const c of live){if((c.keywords||[]).some(k=>text.includes(k)))return c;}return null;}
function clarify(){aiSay(["為了幫您快速聚焦，您的想法比較接近下方哪一個選項呢？您可以直接點選，或換個說法再告訴我。"]);}
function handleFree(text){
  if(freeOverride){meSay(text);const h=freeOverride;freeOverride=null;h(text);return;}
  const c=matchChoices(text);
  if(c){meSay(text);suppressNextEcho=true;c.el.click();return;}
  meSay(text);clarify();
}
function addDonut(investedPct,amount,id){
  const idle=100-investedPct;const card=document.createElement('div');card.className='donutcard';if(id)card.id=id;
  const inv=Math.round(amount*investedPct/100),idl=amount-inv;
  card.innerHTML=`<div class="donut" style="background:conic-gradient(var(--brand) 0 ${investedPct}%,var(--idle) ${investedPct}% 100%)">
      <div class="hole"><div><div class="hv">${idle}%</div><div class="hl">閒置現金</div></div></div></div>
    <div class="legend">
      <div class="li"><span class="dot" style="background:var(--brand)"></span>已投資<span class="amt">$${inv.toLocaleString()}</span></div>
      <div class="li"><span class="dot" style="background:var(--idle)"></span>閒置現金<span class="amt">$${idl.toLocaleString()}</span></div>
    </div>`;
  chatBox.appendChild(card);down();return card;
}

/* ================= 試算共用工具 ================= */
function fmt(n){return Math.round(n).toLocaleString('en-US');}
function fmtPct(n){return (Math.round(n*100)/100).toString();}
/* 把年化增長金額換算成生活價值（旅遊、聚餐），取代直接顯示金額；
   本金取自階段 C 已經推估過的閒置資金區間中點（idleEstimate()），僅供內部換算，不會顯示原始金額 */
function lifeValueEq(gainAmount){
  return {
    trips:Math.max(1,Math.round(gainAmount/8000)),
    dinners:Math.max(1,Math.round(gainAmount/1000))
  };
}
function estimatedIdlePrincipal(){
  const est=idleEstimate();
  return (est.lo+est.hi)/2;
}
function calcRowHtml(p,rateDecimals){
  return `<div class="cx-row">
    <div class="cx-rowtop">
      <span class="cx-swatch" style="background:${p.color}"></span>
      <div class="cx-info"><div class="cx-name">${p.name}</div><span class="cx-tag">${p.tag}</span></div>
      <span class="cx-rate">${(p.rate*100).toFixed(rateDecimals==null?1:rateDecimals)}%</span>
    </div>
  </div>`;
}
/* 依 D-1（資金動用時間）決定留在定存的比例：可用時間越短，定存佔比越高 */
function keepPctFor(){return {high:70,mid:40,low:15}[S.depositWeight||'mid'];}
function investRationale(tag){
  const reason={high:'考量這筆資金可能在一年內就會用到',mid:'考量這筆資金的使用時間還不確定',low:'考量這筆資金一年以上都不會用到'}[S.depositWeight||'mid'];
  const keepPct=keepPctFor(),investPct=100-keepPct;
  return `${reason}，我建議先保留約 <b>${keepPct}%</b> 於定存以備不時之需，其餘約 <b>${investPct}%</b> 配置於${tag}——這是下方試算的預設比例，您也可以自行拖動拉桿調整成您覺得合適的配置。`;
}

/* 拉桿試算卡：CATALOG 裡的單一商品（債券／基金）vs 本行定存，附「近1年／近3年」切換（僅呈現百分比，不出現實際金額） */
function buildProductCalcCard(p,initialInvestPct){
  const dep=PRODUCT_DATA.deposit;
  const tag=p.cat==='bond'?'債券':'基金';
  const accent=p.cat==='bond'?'#3355FF':'#7A4FE0',accentDark=p.cat==='bond'?'#1f3ad6':'#5c34c2';
  const card=document.createElement('div');card.className='cx-card '+p.cat;
  card.style.setProperty('--cx-accent',accent);card.style.setProperty('--cx-accent-dark',accentDark);
  card.innerHTML=`
    <div class="cx-titlebar">${p.name}<span class="cx-dot">・</span>年化報酬試算</div>
    <div class="cx-periodtoggle">
      <button class="cx-period sel" data-period="1y" type="button">近1年</button>
      <button class="cx-period" data-period="3y" type="button">近3年</button>
    </div>
    <div class="cx-sliderlabels"><div class="cx-big cx-left"></div><div class="cx-big cx-right"></div></div>
    <input class="cx-slider" type="range" min="0" max="100" value="${initialInvestPct}">
    <div class="cx-divider"></div>
    <div class="cx-fixedrows"></div>
    <div class="cx-optrows"></div>
    <div class="cx-approxnote">＊${tag}近1年／近3年報酬率為試算參考值，${p.cat==='bond'?'債券票面利率固定、不隨年期變動':'基金為歷史績效示範，不代表未來報酬'}</div>
    <div class="cx-summary"></div>
    <div class="cx-disclaimer">${DISCLAIMER}</div>`;
  const slider=card.querySelector('.cx-slider');
  let period='1y';
  card.querySelectorAll('.cx-period').forEach(btn=>{
    btn.onclick=()=>{period=btn.dataset.period;
      card.querySelectorAll('.cx-period').forEach(b=>b.classList.toggle('sel',b===btn));
      draw();};
  });
  function currentRate(){return period==='1y'?p.rate1y:p.rate3y;}
  function draw(){
    const investPct=+slider.value,keepPct=100-investPct;
    const rate=currentRate();
    const prodRow={name:p.name,tag,color:accent,rate};
    card.querySelector('.cx-left').textContent=`${tag} ${investPct}%`;
    card.querySelector('.cx-right').textContent=`${keepPct}% 定存`;
    slider.style.setProperty('--fill',investPct+'%');
    card.querySelector('.cx-fixedrows').innerHTML=calcRowHtml(dep,1);
    card.querySelector('.cx-optrows').innerHTML=calcRowHtml(prodRow,2);
    const blended=(keepPct/100)*dep.rate+(investPct/100)*rate;
    const blendedPctStr=fmtPct(blended*100);
    const life=lifeValueEq(estimatedIdlePrincipal()*blended);
    card.querySelector('.cx-summary').innerHTML=`
      <div class="cx-herobox">
        <div class="cx-herolabel">${investPct}% ${tag}＋${keepPct}% 定存　資產有機會增長約</div>
        <div class="cx-heromultrow"><span class="cx-heromult">${blendedPctStr}</span><span class="cx-herox">%</span></div>
        <div class="cx-herobars">
          <div class="cx-herobarrow"><span class="cx-herobarlabel">${tag}</span><div class="cx-herobartrack"><div class="cx-herobarfill hi" style="width:${investPct}%"></div></div><span class="cx-herobarval">${investPct}%</span></div>
          <div class="cx-herobarrow"><span class="cx-herobarlabel">定存</span><div class="cx-herobartrack"><div class="cx-herobarfill" style="width:${keepPct}%"></div></div><span class="cx-herobarval">${keepPct}%</span></div>
        </div>
      </div>
      <div class="cx-heronote">這樣的成長幅度，一年下來大約相當於 <b>${life.trips} 趟小旅行</b>，或 <b>${life.dinners} 頓和朋友的聚餐</b>。</div>`;
  }
  slider.addEventListener('input',draw);
  draw();return card;
}

/* 定存（保守型）：不需拉桿比較，直接呈現年化報酬試算（僅呈現百分比，不出現實際金額） */
function buildDepositCard(){
  const dep=PRODUCT_DATA.deposit;
  const card=document.createElement('div');card.className='cx-card deposit';
  card.style.setProperty('--cx-accent',dep.color);card.style.setProperty('--cx-accent-dark',dep.colorDark);
  const rateStr=(dep.rate*100).toFixed(1);
  const life=lifeValueEq(estimatedIdlePrincipal()*dep.rate);
  card.innerHTML=`
    <div class="cx-titlebar">定存<span class="cx-dot">・</span>年化報酬試算</div>
    <div class="cx-divider"></div>
    <div class="cx-fixedrows">${calcRowHtml(dep,1)}</div>
    <div class="cx-summary">
      <div class="cx-herobox">
        <div class="cx-herolabel">預估年化報酬率約為</div>
        <div class="cx-heromultrow"><span class="cx-heromult">${rateStr}</span><span class="cx-herox">%</span></div>
      </div>
      <div class="cx-heronote">這樣的收益，一年下來大約相當於 <b>${life.trips} 趟小旅行</b>，或 <b>${life.dinners} 頓和朋友的聚餐</b>。</div>
    </div>
    <div class="cx-disclaimer">${DISCLAIMER}</div>`;
  return card;
}

/* ================= 商品清單卡片 ================= */
/* 可點擊的商品清單卡片（來自 CATALOG）：每張卡片可以「商品詳情」或「試算」
   多筆商品時，卡片改為橫向排列並放進可滑動的 .prod-row，讓使用者能左右滑動瀏覽；只有單一商品時維持原本的直式滿版卡片 */
function renderCatalogCards(items,onCalc,onDetail){
  const multi=items.length>1;
  let holder=chatBox;
  if(multi){
    holder=document.createElement('div');holder.className='prod-row';
    chatBox.appendChild(holder);
  }
  items.forEach(p=>{
    const rc={'穩健':'r-low','中等':'r-mid','積極':'r-high'}[p.risk];
    const rateStr=(p.rate*100).toFixed(2).replace(/\.?0+$/,'');
    const el=document.createElement('div');el.className='prod'+(multi?' prod-card':'');
    el.innerHTML=`<div class="ph"><div class="pn">${p.name}</div><span class="tag">${p.cat==='bond'?'債券':'基金'}</span></div>
      <div class="yield">${rateStr}%<small>參考年化</small></div>
      <div class="meta"><span class="risk ${rc}">${p.risk}</span> · ${p.currency}｜最低申購 ${p.minAmt}<br>${p.feature}</div>
      <div class="prod-actions">
        <button class="prod-btn detail-btn">商品詳情</button>
        <button class="prod-btn calc-btn primary-action">試算</button>
      </div>`;
    el.querySelector('.detail-btn').onclick=()=>onDetail(p);
    el.querySelector('.calc-btn').onclick=()=>onCalc(p);
    holder.appendChild(el);
  });
  down();
}
/* 僅用於定存（保守型）：唯一沒有 CATALOG 清單可選的情境，直接呈現試算 */
function runDepositCalcAndFinish(nextStep){
  chatBox.appendChild(buildDepositCard());
  down();nextStep();
}
/* 建議行動（藥丸狀小按鈕）：接在對話內容最後，非 sticky，不佔用底部固定控制列 */
function renderSuggestedActions(actions){
  const row=wrap();row.className='sugg-row';
  actions.forEach(a=>{
    const b=document.createElement('button');b.type='button';b.className='sugg-chip';
    b.innerHTML='<span class="ic">✦</span>'+a.label;
    b.onclick=()=>a.onClick(b);
    if(a.keywords)activeChoices.push({el:b,keywords:a.keywords});
    row.appendChild(b);
  });
  chatBox.appendChild(row);down();
  return row;
}
function renderFinalCTA(){
  renderSuggestedActions([
    {label:'前往下單',onClick:()=>{meSay('前往下單');clearControls();finishFlow('order');},keywords:['下單','買','購買','下訂','前往','好','可以','下一步','ok','OK']},
    {label:'諮詢理專',onClick:()=>{meSay('諮詢理專');clearControls();finishFlow('advisor');},keywords:['理專','諮詢','專員','問問題','找人','客服']}
  ]);
}
/* ================= 完成（共用結尾流程） ================= */
function finishFlow(action){
  const recoType=S.path==='supplement'?S.recoTypeH:S.recoType;
  const prod=S.selectedProductCode?catalogItem(S.selectedProductCode):PRODUCT_DATA[recoType];
  const isOrder=action==='order';
  aiSay([isOrder?'好的，已經為您準備好下單資訊。':'好的，已經為您安排理專諮詢管道。'],()=>{
    const end=document.createElement('div');end.className='endcard';
    end.innerHTML=`<div class="ic" style="color:#1f9d57">✓</div><div class="t">${isOrder?'下單資訊已備妥':'理專諮詢已安排'}</div>
      <div class="summary">
        本行資產級距：<b>${S.assetRange||'—'}</b>／現金比例：<b>${S.cashRatio||'—'}</b><br>
        資金用途時間：<b>${S.q1||'—'}</b>／風險承受度：<b>${S.q2||'完全不能接受本金波動'}</b><br>
        建議轉入方向：<b>${prod.name}</b>
      </div>
      <div class="d">${isOrder?'請至下單頁完成最後確認，如有任何疑問也歡迎隨時洽詢專員。':'專員將盡快與您聯繫，協助您完成後續轉入／開戶事宜。'}<br>以上是根據您剛才的回答所做的初步參考分析，並非正式投資建議，實際申購仍需以商品說明書及專員說明為準。</div>`;
    chatBox.appendChild(end);down();
    const w=wrap();const b=document.createElement('button');b.className='primary';b.style.marginTop='4px';
    b.textContent='重新開始';b.onclick=resetAll;w.appendChild(b);setControls(w);
    freeOverride=()=>aiSay(["本次分析已經完成囉，若要重新開始，請點選下方按鈕。"]);
  });
}
