/* ================= 元件庫（js/component-library.js） =================
   彙整可重複使用的 UI 元件（卡片、圖表……），依 COMPONENTS 登錄的元件名稱呼叫，
   不需直接依賴各元件內部的函式名稱。元件名稱比照 Figma 命名慣例，用「分類/名稱」表示，例如 chart/pie。
   依賴 engine.js 提供的 chatBox／down()，載入順序需在 engine.js 之後 */
const COMPONENTS=window.COMPONENTS||(window.COMPONENTS={});
function renderComponent(name,...args){
  const comp=COMPONENTS[name];
  if(!comp) throw new Error(`未登錄的元件：${name}`);
  return comp.render(...args);
}
/* 依名稱呼叫元件的橫向排列版本（僅部分元件支援）：renderComponentRow('card/product', items, onDetail, onCalc) */
function renderComponentRow(name,items,...args){
  const comp=COMPONENTS[name];
  if(!comp||!comp.renderRow) throw new Error(`未登錄橫向排列版本的元件：${name}`);
  return comp.renderRow(items,...args);
}

/* ---- chart/pie（Figma node 189:853）資產配置圓餅圖 ----
   中心顯示現金留存百分比，圖例列出投資配置／現金留存金額；investedPct 為投資配置占比（0–100） */
function renderPieChart(investedPct,amount){
  const cashPct=100-investedPct;
  const inv=Math.round(amount*investedPct/100),cash=amount-inv;
  const card=document.createElement('div');card.className='pie-card';
  card.innerHTML=`<div class="pie-overview">
      <div class="pie-chart" style="background:conic-gradient(#3773dc 0 ${investedPct}%,#55a784 ${investedPct}% 100%)">
        <div class="pie-hole"><div><div class="pie-value">${cashPct}%</div><div class="pie-label">現金留存</div></div></div>
      </div>
      <div class="pie-legend">
        <div class="pie-legend-item"><span class="pie-dot" style="background:#3773dc"></span><span class="pie-legend-text">投資配置 <span class="pie-amt">$${inv.toLocaleString()}</span></span></div>
        <div class="pie-legend-item"><span class="pie-dot" style="background:#55a784"></span><span class="pie-legend-text">現金留存 <span class="pie-amt">$${cash.toLocaleString()}</span></span></div>
      </div>
    </div>`;
  chatBox.appendChild(card);down();
  return card;
}
COMPONENTS['chart/pie']={render:renderPieChart};

/* ---- card/product（Figma node 178:664）ProductCard_Display ----
   名稱＋配息頻率／幣別標籤、雙數值、商品詳情／立即試算膠囊按鈕，基金與債券共用同一元件。
   數值標籤依商品類別區分：債券為商品對照矩陣原始欄位「票面/配息率」；基金無真實績效欄位，
   沿用 catalog.js 註明的示範性參考值 rate1y（非真實歷史績效，僅供試算展示）標示為「近一年報酬」 */
function renderProductCardDisplay(p,onDetail,onCalc){
  const rate1Str=(p.rate1y*100).toFixed(2);
  const investTypeStr=p.investType.join('／');
  const rateLabel=p.cat==='bond'?'票面/配息率':p.cat==='deposit'?'年利率':'近一年報酬';
  const el=document.createElement('div');el.className='pcard';
  el.innerHTML=`<div class="pcard-header">
      <div class="pcard-name" title="${p.name}">${p.name}</div>
      <div class="pcard-tags"><span class="pcard-tag">${p.payFreq}</span><span class="pcard-tag">${p.currency}</span></div>
    </div>
    <div class="pcard-stats">
      <div class="pcard-stat"><div class="pcard-stat-label">${rateLabel}</div><div class="pcard-stat-value ascend">${rate1Str}%</div></div>
      <div class="pcard-stat"><div class="pcard-stat-label">投資類型</div><div class="pcard-stat-value">${investTypeStr}</div></div>
    </div>
    <div class="pcard-actions">
      <button class="pcard-btn detail-btn">商品詳情</button>
      <button class="pcard-btn pcard-btn-light calc-btn">立即試算</button>
    </div>`;
  el.querySelector('.detail-btn').onclick=()=>onDetail(p);
  el.querySelector('.calc-btn').onclick=()=>onCalc(p);
  return el;
}
/* 橫向排列多張 ProductCard_Display，可左右滑動瀏覽 */
function renderProductCardDisplayRow(items,onDetail,onCalc){
  const holder=document.createElement('div');holder.className='pcard-row';
  items.forEach(p=>holder.appendChild(renderProductCardDisplay(p,onDetail,onCalc)));
  chatBox.appendChild(holder);
  down();
  return holder;
}
COMPONENTS['card/product']={render:renderProductCardDisplay,renderRow:renderProductCardDisplayRow};

/* ---- card/calculator（Figma node 202:709）資產 vs 活存 互動試算卡 ----
   原為「基金 vs 定存」設計，現通用給債券／基金／外匯定存三種 CATALOG 商品共用：
   拉桿調整資產／活存配置比例，即時計算加權年化報酬，並把獲利換算成手搖飲杯數／聚餐次數，
   用掉落 emoji 呈現（Figma 無對應動畫 prototype，掉落效果為此檔自行設計）。
   baseAmount／高利活存利率／生活換算基準皆抽成 CALC_CONFIG，之後串接真實資料時只需替換這裡。
   opts.tag：資產標籤文字（債券／基金／外匯定存），預設「基金」；
   opts.showPeriodTabs：定存利率不隨年期變動，傳 false 隱藏近1年/近3年切換，固定用 asset.rate1y */
const CALC_CONFIG={
  baseAmount:100000,   // 預設本金 10 萬元（placeholder），之後由「現金留存」互動結果動態帶入，計算邏輯不需更動
  depositRate:0.025,   // 活存 固定年利率，不隨 Tab 或滑桿變動
  drinkPrice:60,       // 一杯手搖飲
  dinnerPrice:800,     // 一次朋友聚會
  maxEmoji:15          // 掉落 emoji 上限，避免畫面過亂
};
function renderAssetVsDepositCalc(asset,initialAssetRatio,opts){
  opts=opts||{};
  const baseAmount=opts.baseAmount!=null?opts.baseAmount:CALC_CONFIG.baseAmount;
  const tag=opts.tag||'基金';
  const showPeriodTabs=opts.showPeriodTabs!==false;
  let period='1y';
  let assetRatio=initialAssetRatio==null?50:initialAssetRatio;
  let mode='drink';
  const card=document.createElement('div');card.className='calc-card';
  card.innerHTML=`
    <div class="calc-title">${asset.name}・年化報酬試算</div>
    ${showPeriodTabs?`<div class="calc-tabs">
      <button type="button" class="calc-tab sel" data-period="1y">近一年</button>
      <button type="button" class="calc-tab" data-period="3y">近三年</button>
    </div>`:''}
    <div class="calc-ratio-row">
      <div class="calc-ratio-col">
        <div class="calc-ratio-label"><span class="calc-ratio-dot" style="background:var(--brand)"></span>${tag}</div>
        <div class="calc-ratio-value"><span class="calc-num calc-fund-ratio"></span><span class="calc-pct">%</span></div>
      </div>
      <div class="calc-ratio-col right">
        <div class="calc-ratio-label"><span class="calc-ratio-dot" style="background:#68c89e"></span>活存</div>
        <div class="calc-ratio-value"><span class="calc-num calc-deposit-ratio"></span><span class="calc-pct">%</span></div>
      </div>
    </div>
    <div class="calc-slider-wrap">
      <input type="range" class="calc-slider" min="0" max="100" value="${assetRatio}" aria-label="${tag}配置比例">
    </div>
    <div class="calc-cards-row">
      <div class="calc-minicard">
        <div class="calc-minicard-name" title="${asset.name}">${asset.name}</div>
        <div class="calc-minicard-stat">
          <div class="calc-minicard-label calc-fund-rate-label"></div>
          <div class="calc-minicard-value calc-fund-rate-value"></div>
        </div>
      </div>
      <div class="calc-minicard">
        <div class="calc-minicard-name">活期存款</div>
        <div class="calc-minicard-stat">
          <div class="calc-minicard-label">年利率</div>
          <div class="calc-minicard-value">${(CALC_CONFIG.depositRate*100).toFixed(1)}%</div>
        </div>
      </div>
    </div>
    <div class="calc-note">*${showPeriodTabs?`${tag}近1年/近3年報酬率為試算參考值，`:''}${asset.cat==='bond'?'債券票面利率固定、不隨年期變動':asset.cat==='deposit'?'定存利率為銀行公告牌告利率，非試算示範值':'基金為歷史績效示範，不代表未來報酬'}</div>
    <div class="calc-result">
      <div class="calc-result-panel">
        <div class="calc-emoji-layer"></div>
        <button type="button" class="calc-toggle drink" aria-label="切換生活換算單位">
          <span class="calc-toggle-knob"></span>
          <span class="calc-toggle-icon">🧋</span>
          <span class="calc-toggle-icon">🍽️</span>
        </button>
        <div class="calc-result-label">資產有機會增長約</div>
        <div class="calc-result-value calc-weighted"></div>
        <div class="calc-result-sentence calc-sentence"></div>
      </div>
      <div class="calc-disclaimer">利率為近期市場概算，非保證數字，實際會隨市場變動。生活換算以一杯手搖飲 ${CALC_CONFIG.drinkPrice} 元、一次朋友聚會約 ${CALC_CONFIG.dinnerPrice} 元估算。美元計價項目另有匯率漲跌風險，可能讓實際結果比試算更好或更差，此工具僅供理解概念，不構成投資建議。</div>
    </div>`;

  const slider=card.querySelector('.calc-slider');
  const emojiLayer=card.querySelector('.calc-emoji-layer');
  const toggle=card.querySelector('.calc-toggle');

  function currentRate(){return showPeriodTabs?(period==='1y'?asset.rate1y:asset.rate3y):asset.rate1y;}
  function spawnEmoji(count){
    emojiLayer.innerHTML='';
    const emoji=mode==='dinner'?'🍽️':'🧋';
    const n=Math.min(Math.max(count,1),CALC_CONFIG.maxEmoji);
    for(let i=0;i<n;i++){
      const s=document.createElement('span');s.className='calc-emoji';s.textContent=emoji;
      s.style.left=(5+Math.random()*90)+'%';
      s.style.setProperty('--dur',(2+Math.random()*1.2).toFixed(2)+'s');
      s.style.setProperty('--delay',(Math.random()*0.8).toFixed(2)+'s');
      s.style.setProperty('--fall',Math.round(110+Math.random()*70)+'px');
      s.style.setProperty('--drift',Math.round((Math.random()-0.5)*60)+'px');
      s.style.setProperty('--rot-start',Math.round((Math.random()-0.5)*40)+'deg');
      s.style.setProperty('--rot-end',Math.round((Math.random()-0.5)*70)+'deg');
      emojiLayer.appendChild(s);
    }
  }
  function update(){
    const depositRatio=100-assetRatio;
    card.querySelector('.calc-fund-ratio').textContent=assetRatio;
    card.querySelector('.calc-deposit-ratio').textContent=depositRatio;
    slider.style.setProperty('--fill',assetRatio+'%');
    const rate=currentRate();
    card.querySelector('.calc-fund-rate-label').textContent=showPeriodTabs?(period==='1y'?'近一年報酬':'近三年報酬'):'年利率';
    card.querySelector('.calc-fund-rate-value').textContent=(rate*100).toFixed(2)+'%';
    const weighted=(assetRatio/100)*rate+(depositRatio/100)*CALC_CONFIG.depositRate;
    card.querySelector('.calc-weighted').textContent=(weighted*100).toFixed(2)+'%';
    const gainAmount=baseAmount*weighted;
    const drinkCount=Math.max(0,Math.round(gainAmount/CALC_CONFIG.drinkPrice));
    const dinnerCount=Math.max(0,Math.round(gainAmount/CALC_CONFIG.dinnerPrice));
    card.querySelector('.calc-sentence').textContent=mode==='dinner'
      ?`這樣的成長幅度，一年下來大約等於可以和朋友開心聚餐 ${dinnerCount} 次！`
      :`這樣的成長幅度，一年下來大約等於多了 ${drinkCount} 杯手搖飲！`;
    return mode==='dinner'?dinnerCount:drinkCount;
  }
  function refresh(triggerAnim){
    const count=update();
    if(triggerAnim)spawnEmoji(count);
  }

  let debounceTimer=null;
  slider.addEventListener('input',()=>{assetRatio=+slider.value;refresh(false);});
  slider.addEventListener('change',()=>{
    clearTimeout(debounceTimer);
    debounceTimer=setTimeout(()=>refresh(true),300);
  });
  card.querySelectorAll('.calc-tab').forEach(btn=>{
    btn.onclick=()=>{
      period=btn.dataset.period;
      card.querySelectorAll('.calc-tab').forEach(b=>b.classList.toggle('sel',b===btn));
      refresh(true);
    };
  });
  toggle.onclick=()=>{
    mode=mode==='drink'?'dinner':'drink';
    toggle.classList.toggle('dinner',mode==='dinner');
    refresh(true);
  };

  refresh(true);
  chatBox.appendChild(card);down();
  return card;
}
COMPONENTS['card/calculator']={render:renderAssetVsDepositCalc};
