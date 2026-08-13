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
   中心顯示現金留存百分比，圖例列出投資配置／現金留存金額；investedPct 為投資配置占比（0–100）。
   色塊間刻意留白（而非緊密貼合）：在每個色塊交界處插入一小段 transparent，露出 .pie-card
   本身的背景色，視覺上形成間隔；0%/100% 交界（12 點鐘方向）要分別在漸層頭尾各留一小段
   transparent 才會接成一個完整間隔。PIE_GAP_PCT 是每側留白的角度佔比（% of 360°），
   目前只有兩個色塊、兩筆真實資料落點都遠離 0%／100%（見 flow.js stageC()：investedPct
   實際範圍約 8–80），不會出現留白大於色塊本身的情況，故不另外處理極端值 clamp。 */
function renderPieChart(investedPct,amount,opts){
  opts=opts||{};
  const cashPct=100-investedPct;
  const inv=Math.round(amount*investedPct/100),cash=amount-inv;
  const PIE_GAP_PCT=0.4;
  const pieBg=`conic-gradient(transparent 0% ${PIE_GAP_PCT}%,`+
    `var(--color-chart-blue-2nd) ${PIE_GAP_PCT}% ${investedPct-PIE_GAP_PCT}%,`+
    `transparent ${investedPct-PIE_GAP_PCT}% ${investedPct+PIE_GAP_PCT}%,`+
    `var(--color-chart-teal-2nd) ${investedPct+PIE_GAP_PCT}% ${100-PIE_GAP_PCT}%,`+
    `transparent ${100-PIE_GAP_PCT}% 100%)`;
  const card=document.createElement('div');card.className='pie-card';
  card.innerHTML=`${opts.title?`<div class="chart-card-title">${opts.title}</div>`:''}<div class="pie-overview">
      <div class="pie-chart" style="background:${pieBg}">
        <div class="pie-hole"><div><div class="pie-value">${cashPct}%</div><div class="pie-label">現金留存</div></div></div>
      </div>
      <div class="pie-legend">
        <div class="pie-legend-item"><span class="pie-dot" style="background:var(--color-chart-blue-2nd)"></span><span class="pie-legend-text">投資配置 <span class="pie-amt">$${inv.toLocaleString()}</span></span></div>
        <div class="pie-legend-item"><span class="pie-dot" style="background:var(--color-chart-teal-2nd)"></span><span class="pie-legend-text">現金留存 <span class="pie-amt">$${cash.toLocaleString()}</span></span></div>
      </div>
    </div>`;
  appendToChat(card);down();
  return card;
}
COMPONENTS['chart/pie']={render:renderPieChart};

/* ---- chart/line（定存到期後被動收益趨勢折線圖，見 js/flow.js stageC()）----
   視覺參考使用者提供的 fl_chart LineChartSample2 範例（格線、粗圓角線條＋漸層、
   曲線下方漸層填色、圖表邊框），移植成這裡的 inline SVG 寫法。
   全線統一藍色（不用紅色標示到期前後差異，避免顏色語意混淆）；到期時間點仍用一條
   虛線＋標籤標示，讓下降的瞬間一眼可辨，不需要額外圖例說明。
   這裡的資料本身是「到期前一點＋到期後連續四個持平點」，不是連續起伏的數列，套用
   fl_chart 的貝茲曲線平滑（isCurved）對這種資料不會有視覺差異（頂多是同一條斜直線／
   水平線的另一種畫法），所以沒有實作曲線平滑；格線、漸層填色、粗圓角線條、邊框這幾項
   確實會讓視覺更接近參考圖，都有做。
   純展示用途（不可互動），卡片沿用 .pie-card 同一組間距／陰影 token，維持跟圓餅圖一致的卡片感。 */
let lineChartIdSeq=0;
function renderLineChart(labels,values,splitIndex,opts){
  opts=opts||{};
  const chartId=++lineChartIdSeq;
  /* H 原本是 220（跟圓餅圖比例相近），但這張圖只有 5 個點、不需要那麼高，疊在圓餅圖＋
     文字說明後面，畫面還沒開始換行的初次分析階段又容易跟浮動選單擠在同一個視窗高度裡
     （見 renderOptionPopover() 的說明），改矮一點（150）讓整段內容更容易一次容納 */
  const W=600,H=150,PAD_L=16,PAD_R=16,PAD_T=30,PAD_B=22;
  const innerW=W-PAD_L-PAD_R,innerH=H-PAD_T-PAD_B;
  const baseline=H-PAD_B;
  const maxV=Math.max(...values)*1.2||1;
  const n=values.length;
  const xAt=i=>PAD_L+(n===1?innerW/2:innerW*i/(n-1));
  const yAt=v=>PAD_T+innerH-(innerH*v/maxV);
  const pts=values.map((v,i)=>({x:xAt(i),y:yAt(v)}));
  const linePath=pts.map((p,idx)=>`${idx===0?'M':'L'}${p.x},${p.y}`).join(' ');
  const areaPath=`${linePath} L${pts[pts.length-1].x},${baseline} L${pts[0].x},${baseline} Z`;
  const fmtAmt=v=>'$'+Math.round(v).toLocaleString();
  const dots=pts.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="var(--color-chart-blue-2nd)"/>
      <text x="${p.x}" y="${p.y-14}" text-anchor="middle" class="linechart-value">${fmtAmt(values[i])}</text>`).join('');
  /* 格線：橫向抓幾個等分刻度（不特別對齊整數金額，示意用），縱向對齊每個資料點，
     呼應參考圖的 FlGridData（水平＋垂直格線） */
  const H_GRID_LINES=3;
  const hGrid=Array.from({length:H_GRID_LINES+1},(_,i)=>{
    const y=PAD_T+innerH*i/H_GRID_LINES;
    return `<line x1="${PAD_L}" y1="${y}" x2="${W-PAD_R}" y2="${y}" class="linechart-grid-line"/>`;
  }).join('');
  const vGrid=pts.map(p=>`<line x1="${p.x}" y1="${PAD_T}" x2="${p.x}" y2="${baseline}" class="linechart-grid-line"/>`).join('');
  const xLabels=labels.map((lb,i)=>`<text x="${xAt(i)}" y="${H-8}" text-anchor="middle" class="linechart-xlabel">${lb}</text>`).join('');
  const splitX=splitIndex!=null?xAt(splitIndex):null;
  const card=document.createElement('div');card.className='linechart-card';
  card.innerHTML=`${opts.title?`<div class="chart-card-title">${opts.title}</div>`:''}<svg viewBox="0 0 ${W} ${H}" class="linechart-svg" role="img" aria-label="${opts.ariaLabel||'趨勢圖'}">
      <defs>
        <linearGradient id="lc-fill-${chartId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--color-chart-blue-2nd)" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="var(--color-chart-blue-2nd)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect x="${PAD_L}" y="${PAD_T}" width="${innerW}" height="${innerH}" class="linechart-border"/>
      ${hGrid}${vGrid}
      ${splitX!=null?`<line x1="${splitX}" y1="${PAD_T-14}" x2="${splitX}" y2="${baseline}" class="linechart-split-line"/>
      <text x="${splitX}" y="${PAD_T-20}" text-anchor="middle" class="linechart-split-label">${opts.splitLabel||''}</text>`:''}
      <path d="${areaPath}" fill="url(#lc-fill-${chartId})" stroke="none"/>
      <path d="${linePath}" class="linechart-line"/>
      ${dots}
      ${xLabels}
    </svg>`;
  appendToChat(card);down();
  return card;
}
COMPONENTS['chart/line']={render:renderLineChart};

/* ---- card/recommendation（凱基商品推薦卡片，交接文件：kgi-recommendation-card-handoff.md）----
   AI 完成資產評估、推薦適合方向時使用，取代原本 RECO_REASON 那一大段標題＋條列文字的 markdown
   說明（見 js/flow.js stageE()）：使用者回饋文字太多太饒口，改成一張「左圖右字」卡片，
   左側是商品名＋色條＋幾何品牌標記，右側是標題／資金情境副標／特色勾選清單，一次評估後只
   顯示這一種商品對應的卡片（combo／債券＋基金搭配情境例外，見下方 renderRecommendationCard）。
   純展示卡，不可點擊、無 hover/focus 樣式；樣式收斂在 css/component-library.css 的
   .kgi-card 命名空間，不與站內既有的 Design Guideline token 混用——交接文件裡的色票是
   這組卡片自己的識別配色（每個 type 一組強調色），站內目前的 token 沒有完全對應的顏色，
   混用會破壞這組卡片刻意做出的「深色霓虹光暈」視覺效果，故照文件原色實作，不另外抽 token。
   data 格式：{type:'bond'|'fund'|'fx', name, title, subtitle, features:[...]}
   （見 js/content-attr-a.js／-b.js／-c.js 的 RECO_CARD.fund／.bond／.deposit）。 */
const KGI_CARD_TICK_SVG=`<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9.2" fill="currentColor" opacity="0.2"/><circle cx="10" cy="10" r="9.2" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.5"/><path d="M6.3 10.2l2.5 2.5 5-5.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const KGI_CARD_MARK_SVG=`<svg class="kgi-card__mark" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <polygon points="0,50 50,0 50,100" fill="currentColor" opacity="0.16"/>
  <polygon points="50,0 100,0 100,50" fill="currentColor" opacity="0.10"/>
  <polygon points="50,0 100,50 50,50" fill="currentColor" opacity="0.24"/>
  <polygon points="50,50 100,50 50,100" fill="currentColor" opacity="0.07"/>
</svg>`;
function renderRecommendationCardEl(data){
  const card=document.createElement('article');card.className=`kgi-card kgi-card--${data.type}`;
  card.innerHTML=`<div class="kgi-card__visual">
      <div class="kgi-card__name">${data.name}</div>
      <span class="kgi-card__accent"></span>
      ${KGI_CARD_MARK_SVG}
    </div>
    <div class="kgi-card__body">
      <h3 class="kgi-card__title">${data.title}</h3>
      <p class="kgi-card__sub">${data.subtitle}</p>
      <ul class="kgi-card__feats">
        ${data.features.map(f=>`<li class="kgi-card__feat"><span class="kgi-card__tick">${KGI_CARD_TICK_SVG}</span>${f}</li>`).join('')}
      </ul>
    </div>`;
  return card;
}
/* data 可以是單一物件（一般情境，只推薦一種商品）或物件陣列（combo：債券＋基金兩張卡並列，
   見 js/flow.js stageE() 的呼叫方式），兩種輸入都用同一個 .kgi-card-group 容器包起來，
   垂直排列、共用同一組間距，呼叫端不需要自己判斷是不是陣列。 */
function renderRecommendationCard(data){
  const list=Array.isArray(data)?data:[data];
  const group=document.createElement('div');group.className='kgi-card-group';
  list.forEach(d=>group.appendChild(renderRecommendationCardEl(d)));
  appendToChat(group);down();
  return group;
}
COMPONENTS['card/recommendation']={render:renderRecommendationCard};

/* ---- card/product（Figma node 178:664）ProductCard_Display ----
   名稱＋配息頻率／幣別標籤、雙數值、商品詳情／立即試算膠囊按鈕，基金與債券共用同一元件。
   2026-07-29 依 Excel「精選債券基金_客戶屬性對照矩陣」原始欄位重新對應兩個統計格：
   - 第一格（rateLabel/rateStr）：債券＝「票面/配息率」讀 rate1y（債券的 rate1y 本來就等於
     Excel 真實票面利率，沒有另外造假，沿用即可）；基金＝「近一年報酬率」改讀 catalog.js
     新增的 return1y（Excel 真實數字）——這裡固定讀 return1y、不讀 rate1y，是因為
     card/calculator 統一讀 rate1y（跨債券/基金/定存共用同一套欄位名稱），card/product
     統一讀 return1y，兩邊各自固定讀自己的欄位、不用判斷商品類別去挑欄位名稱；
     2026-07-30 起兩者對基金而言數值上已相同（rate1y 也改回 Excel 真實數字，見
     catalog.js 開頭說明），但這裡仍維持讀 return1y，維持既有的呼叫慣例；
     定存＝「年利率」讀 rate1y（銀行牌告利率，本來就是真的，不受影響）。
   - 第二格（stat2Label/stat2Value）：債券＝「參考買進價(%)」讀 catalog.js 新增的 refPrice，
     字尾補一個 % ——Excel 標題本身寫明這欄是「面額的百分之幾」（如 94 代表面額 94%），
     但儲存格數字是整數 94、不是 0.94，不能像 rate1y 那樣乘以 100，只需補 % 後綴；
     基金＝「基金淨值」讀 catalog.js 新增的 nav，直接輸出數字本身，不額外加單位——
     對應 Excel 儲存格是 General 格式，沒有幣別符號；定存＝「最高限額」讀 maxAmt（不受影響）。
   - 原本債券／基金共用的「投資類型」（investType 陣列組字串）已被上述真實數字取代，
     不再顯示於卡片；investType 仍保留在 catalog.js 作為商品分類中繼資料（收益／平衡／成長），
     但目前沒有任何篩選/分流函式讀取它（matchCatalog() 只比對 cat／risk／assetSize）——
     若之後要依這個欄位收斂推薦清單，要在 catalog.js 的篩選函式裡另外接上讀取邏輯。
   - 債券的兩個標題字串不要寫死在這裡，改讀 catalog.js 的 BOND_CARD_LABELS——那兩個值
     直接對應 Excel 工作表的欄位標題儲存格（H2／J2），之後 Excel 標題改名只要改那邊。 */
function renderProductCardDisplay(p,onDetail,onCalc){
  const rateLabel=p.cat==='bond'?BOND_CARD_LABELS.rate:p.cat==='deposit'?'年利率':'近一年報酬率';
  const rateSrc=p.cat==='fund'?p.return1y:p.rate1y;
  const rate1Str=(rateSrc*100).toFixed(2);
  const stat2Label=p.cat==='deposit'?'最高限額':p.cat==='bond'?BOND_CARD_LABELS.price:'基金淨值';
  const stat2Value=p.cat==='deposit'?`${p.currency} ${p.maxAmt}`:p.cat==='bond'?`${p.refPrice}%`:p.nav;
  const el=document.createElement('div');el.className='pcard';
  el.innerHTML=`<div class="pcard-header">
      <div class="pcard-name" title="${p.name}">${p.name}</div>
      <div class="pcard-tags"><span class="pcard-tag">${p.payFreq}</span><span class="pcard-tag">${p.currency}</span></div>
    </div>
    <div class="pcard-stats">
      <div class="pcard-stat"><div class="pcard-stat-label">${rateLabel}</div><div class="pcard-stat-value ascend">${rate1Str}%</div></div>
      <div class="pcard-stat"><div class="pcard-stat-label">${stat2Label}</div><div class="pcard-stat-value">${stat2Value}</div></div>
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
  appendToChat(holder);
  down();settleTurn();
  return holder;
}
COMPONENTS['card/product']={render:renderProductCardDisplay,renderRow:renderProductCardDisplayRow};

/* ---- card/calculator（Figma node 202:709）資產 vs 活存 互動試算卡 ----
   原為「基金 vs 定存」設計，現通用給債券／基金／外匯定存三種 CATALOG 商品共用：
   拉桿調整資產／活存配置比例，即時計算加權年化報酬，並把獲利換算成手搖飲杯數／聚餐次數，
   用掉落 emoji 呈現（Figma 無對應動畫 prototype，掉落效果為此檔自行設計）。
   baseAmount／高利活存利率／生活換算基準皆抽成 CALC_CONFIG，之後串接真實資料時只需替換這裡。
   opts.tag：資產標籤文字（債券／基金／外匯定存），預設「基金」；
   opts.showPeriodTabs：定存利率不隨年期變動，傳 false 隱藏投資1年/投資3年切換，固定用 asset.rate1y */
const CALC_CONFIG={
  baseAmount:100000,   // 預設本金 10 萬元（placeholder），之後由「現金留存」互動結果動態帶入，計算邏輯不需更動
  depositRate:0.025,   // 活存 固定年利率，不隨 Tab 或滑桿變動
  drinkPrice:60,       // 一杯手搖飲
  dinnerPrice:800,     // 一次朋友聚會
  maxEmoji:50,         // 掉落 emoji 上限：數量直接對應換算結果，僅在超過 50 時才封頂，避免畫面過度擁擠
  fallDurationMs:3000  // 掉落動畫時長（每個 emoji 從頂部飄落到底部所需時間）
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
    <div class="calc-title">多元資產組合年化報酬試算</div>
    ${showPeriodTabs?`<div class="calc-tabs">
      <button type="button" class="calc-tab sel" data-period="1y">投資1年</button>
      <button type="button" class="calc-tab" data-period="3y">投資3年</button>
    </div>`:''}
    <div class="calc-ratio-row">
      <div class="calc-ratio-col">
        <div class="calc-ratio-label"><span class="calc-ratio-dot" style="background:var(--brand)"></span>${tag}</div>
        <div class="calc-ratio-value"><span class="calc-num calc-fund-ratio"></span><span class="calc-pct">%</span></div>
      </div>
      <div class="calc-ratio-col right">
        <div class="calc-ratio-label"><span class="calc-ratio-dot" style="background:var(--color-teal-500)"></span>活存</div>
        <div class="calc-ratio-value"><span class="calc-num calc-deposit-ratio"></span><span class="calc-pct">%</span></div>
      </div>
    </div>
    <div class="calc-slider-wrap">
      <div class="calc-slider-tip" aria-hidden="true">
        <div class="calc-slider-tip-float">
          <div class="calc-slider-tip-bubble-wrap"><div class="calc-slider-tip-bubble">拖曳調配比例</div></div>
          <div class="calc-slider-tip-arrow"></div>
        </div>
      </div>
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
    <div class="calc-note">*${showPeriodTabs?`${tag}投資1年/投資3年報酬率為試算參考值，`:''}${asset.cat==='bond'?'債券票面利率固定、不隨年期變動':asset.cat==='deposit'?'定存利率為銀行公告牌告利率，非試算示範值':'基金為歷史績效示範，不代表未來報酬'}</div>
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
      <div class="calc-disclaimer">利率為市場概算，實際將隨市場變動；歷史回測僅供參考，不代表未來績效。生活換算以 1 杯手搖飲 ${CALC_CONFIG.drinkPrice} 元、1 次朋友聚會 ${CALC_CONFIG.dinnerPrice} 元 估算。美元計價另有匯率風險，實際結果可能與試算不同。本工具僅供概念說明，不構成投資建議。</div>
    </div>`;

  const slider=card.querySelector('.calc-slider');
  const emojiLayer=card.querySelector('.calc-emoji-layer');
  const toggle=card.querySelector('.calc-toggle');
  let sliderTip=card.querySelector('.calc-slider-tip');
  /* 拖曳提示 tooltip（Figma node 327:1108「taost」）：只在試算卡剛開啟、使用者還沒碰過
     拉桿之前顯示，提醒可以拖曳調整比例；水平位置要對齊拉桿旋鈕目前所在的位置（旋鈕寬度
     24px，見 css/component-library.css .calc-slider::-webkit-slider-thumb），旋鈕位置
     隨 assetRatio 變動，所以要用 JS 算，不能寫死在 CSS 裡置中。
     這裡故意不在拖曳（input 事件）時即時跟著旋鈕移動——需求是「使用者一碰拉桿，提示就消失
     且這次卡片開啟期間不再出現」，只要卡片一渲染完成、量得到 offsetWidth 就定位一次即可，
     使用者碰到拉桿的當下（mousedown／touchstart，早於 input 事件）提示就已經被移除了，
     不會有拖曳中提示還留在畫面上、位置卻沒跟著旋鈕跑的情況。
     垂直位置故意不用 CSS 寫死的 top 值：<input type="range"> 是 inline-replaced 元素，
     受所在容器 line-height／baseline 對齊影響，實測跟「padding-top + 軌道高度一半」這種
     純靠 box model 推算的理論值對不上（相差將近 10px），改成直接量測 slider 自己的
     getBoundingClientRect() 相對 wrap 的位置，兩者一起用 JS 算，才會精準對齊旋鈕、
     不受瀏覽器對 range input 的排版怪癖影響。 */
  function positionSliderTip(){
    if(!sliderTip)return;
    const thumbW=24;
    const trackW=slider.offsetWidth;
    const pct=(assetRatio-0)/(100-0);
    const centerX=thumbW/2+pct*(trackW-thumbW);
    sliderTip.style.left=centerX+'px';
    const wrap=slider.parentElement;
    const wrapRect=wrap.getBoundingClientRect(),sliderRect=slider.getBoundingClientRect();
    const thumbCenterY=(sliderRect.top-wrapRect.top)+sliderRect.height/2;
    sliderTip.style.top=(thumbCenterY-thumbW/2)+'px';
    /* 旋鈕拖到接近拉桿兩端（例如 95% 以上）時，泡泡若仍以旋鈕為中心置中，寬度會超出卡片
       邊界被裁切——這裡讓箭頭固定指向旋鈕（上面算好的 centerX 不變），泡泡本身用
       translateX 額外做「有超出邊界才平移」的修正，兩者分開處理，箭頭永遠準確指向旋鈕，
       泡泡永遠不超出卡片，是常見 tooltip 元件（如 Popper/Floating UI）的做法。 */
    const bubbleWrap=sliderTip.querySelector('.calc-slider-tip-bubble-wrap');
    bubbleWrap.style.transform='';
    const cardRect=card.getBoundingClientRect();
    const bubbleRect=bubbleWrap.getBoundingClientRect();
    const EDGE_PAD=8;
    let shift=0;
    if(bubbleRect.right>cardRect.right-EDGE_PAD)shift=(cardRect.right-EDGE_PAD)-bubbleRect.right;
    else if(bubbleRect.left<cardRect.left+EDGE_PAD)shift=(cardRect.left+EDGE_PAD)-bubbleRect.left;
    if(shift)bubbleWrap.style.transform=`translateX(${shift}px)`;
  }
  function dismissSliderTip(){
    if(!sliderTip)return;
    sliderTip.remove();
    sliderTip=null;
    window.removeEventListener('resize',positionSliderTip);
  }
  if(sliderTip){
    slider.addEventListener('mousedown',dismissSliderTip,{once:true});
    slider.addEventListener('touchstart',dismissSliderTip,{once:true,passive:true});
    window.addEventListener('resize',positionSliderTip);
  }

  function currentRate(){return showPeriodTabs?(period==='1y'?asset.rate1y:asset.rate3y):asset.rate1y;}
  /* 投資1年／投資3年切換的是「持有年期」，增長金額要跟著用年期累計（單利，不複利）：
     債券票面利率固定不隨年期變動，累計增長本來就等於把每年配息加總；基金/活存比照同一邏輯處理，
     讓兩個 tab 呈現的是「這個年期下來，資產總共有機會增長多少」，而不是重複同一個年化數字 */
  function currentYears(){return showPeriodTabs&&period==='3y'?3:1;}
  function spawnEmoji(count){
    emojiLayer.innerHTML='';
    const emoji=mode==='dinner'?'🍽️':'🧋';
    const n=Math.min(count,CALC_CONFIG.maxEmoji);
    for(let i=0;i<n;i++){
      const s=document.createElement('span');s.className='calc-emoji';s.textContent=emoji;
      s.style.left=(5+Math.random()*90)+'%';
      s.style.setProperty('--dur',(CALC_CONFIG.fallDurationMs/1000)+'s');
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
    const years=currentYears();
    /* 標籤跟著商品類別走，不能只看 showPeriodTabs——債券也有投資1年/投資3年分頁
       （showPeriodTabs 對債券同樣是 true，見 flow.js enterProductCalc()），但債券票面利率
       固定不隨年期變動，不是「近一年/近3年報酬」這種基金示範績效的講法，改用跟商品卡片
       （card/product）同一組 Excel 對應標題 BOND_CARD_LABELS.rate（票面/配息率），
       兩邊呼叫端顯示的標題文字才會一致，不會像之前那樣債券試算卡還沿用基金的標籤字樣。 */
    /* 定存不分天期一律顯示「年利率」，跟 card/product（見上方 renderProductCardDisplay()
       的 rateLabel）同一套講法一致——銀行牌告利率本來就是以年化基礎報價，即使是 7天／
       1個月這種短天期定存，業界慣例也是用「年利率」表示，不是把天期字樣接進標籤裡。 */
    const fundRateLabel=asset.cat==='bond'?BOND_CARD_LABELS.rate:showPeriodTabs?(period==='1y'?'近一年報酬':'近3年報酬'):'年利率';
    card.querySelector('.calc-fund-rate-label').textContent=fundRateLabel;
    card.querySelector('.calc-fund-rate-value').textContent=(rate*100).toFixed(2)+'%';
    const weighted=((assetRatio/100)*rate+(depositRatio/100)*CALC_CONFIG.depositRate)*years;
    card.querySelector('.calc-weighted').textContent=(weighted*100).toFixed(2)+'%';
    card.querySelector('.calc-result-label').textContent=years===1?'資產有機會增長約':`投資${years}年，資產有機會增長約`;
    const gainAmount=baseAmount*weighted;
    const drinkCount=Math.max(0,Math.round(gainAmount/CALC_CONFIG.drinkPrice));
    const dinnerCount=Math.max(0,Math.round(gainAmount/CALC_CONFIG.dinnerPrice));
    const yearLabel=years===1?'一年':`${years}年`;
    card.querySelector('.calc-sentence').textContent=mode==='dinner'
      ?`這樣的成長幅度，${yearLabel}下來大約等於可以和朋友開心聚餐 ${dinnerCount} 次！`
      :`這樣的成長幅度，${yearLabel}下來大約等於多了 ${drinkCount} 杯手搖飲！`;
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
  /* 客戶反應不知道右上角這顆膠囊可以點——加 .attract 觸發呼吸光暈＋搖擺提示使用者這裡
     可以互動（見 css/component-library.css .calc-toggle.attract），在使用者第一次
     碰觸（mousedown/touchstart，早於 click）就移除，跟上面 sliderTip 的 dismiss 手法
     一致：一旦碰過就不再需要提示，同一張卡片開啟期間也不會再出現。 */
  toggle.classList.add('attract');
  toggle.addEventListener('mousedown',()=>toggle.classList.remove('attract'),{once:true});
  toggle.addEventListener('touchstart',()=>toggle.classList.remove('attract'),{once:true,passive:true});

  refresh(true);
  appendToChat(card);
  positionSliderTip();
  down();
  return card;
}
COMPONENTS['card/calculator']={render:renderAssetVsDepositCalc};

/* ---- bar/chat-input（Figma node 215:872）底部輸入/對話列 ----
   共用的底部輸入列：白卡容器＋輸入框＋圓形送出鈕＋固定但書文字，含 enabled／disabled 兩種狀態。
   disabled 用於特定流程限制期間（如展覽期間），此時輸入框僅顯示提示文字、不可互動。
   兩狀態共用同一份 DOM，切換時只換 class／文字，不重建節點，避免版面跳動。
   opts：{placeholder, disabledMessage, onSubmit, disclaimerText}，皆有預設值、可覆寫。 */
const ICB_ICON_SEND=`<svg viewBox="0 0 24.0684 24.0684" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M5.58759 20.4153V14.6131L12.1023 12.6791L5.58759 10.745V4.9428L21.0601 12.6791L5.58759 20.4153Z" fill="white"/>
</svg>`;
const ICB_DEFAULTS={
  placeholder:'我想要找...',
  disabledMessage:'展覽期間暫不開放，請點擊上方按鈕選項繼續操作',
  disclaimerText:'本頁資訊與數據僅供參考與說明用途，不構成投資建議；投資均有風險，實際商品內容以正式文件為準。'
};
function renderInputChatBar(state,opts){
  opts=opts||{};
  const placeholder=opts.placeholder||ICB_DEFAULTS.placeholder;
  const disabledMessage=opts.disabledMessage||ICB_DEFAULTS.disabledMessage;
  const disclaimerText=opts.disclaimerText||ICB_DEFAULTS.disclaimerText;
  const onSubmit=opts.onSubmit||function(){};

  const bar=document.createElement('div');bar.className='icb';
  bar.innerHTML=`<div class="icb-row">
      <input class="icb-input" type="text" autocomplete="off">
      <button type="button" class="icb-send" aria-label="送出">${ICB_ICON_SEND}</button>
    </div>
    <p class="icb-disclaimer">${disclaimerText}</p>`;
  const input=bar.querySelector('.icb-input'),send=bar.querySelector('.icb-send');

  function submit(){
    const v=input.value.trim();if(!v)return;
    input.value='';onSubmit(v);
  }
  input.addEventListener('keydown',e=>{if(e.key==='Enter')submit();});
  send.onclick=submit;

  function setState(next){
    const isDisabled=next==='disabled';
    input.disabled=isDisabled;
    input.placeholder=isDisabled?disabledMessage:placeholder;
    send.disabled=isDisabled;
  }
  bar.setState=setState;
  setState(state||'enabled');
  return bar;
}
COMPONENTS['bar/chat-input']={render:renderInputChatBar};

/* ---- message/chat-bubble（Figma node 219:747）使用者發送訊息氣泡 ----
   使用者自己送出的對話內容（靠右對齊），跟 aiSay()／aiAsk() 的系統回覆訊息（.ai-msg／.md-quote）
   是不同樣式，此元件只對應使用者發送的這一種，不要拿去用在系統回覆上。
   純顯示用元件，不含業務邏輯（如 echo 抑制），呼叫端自行決定何時呼叫。
   opts：{className} 可疊加額外 class（例如客製化寬度）。
   唯一呼叫端是 engine.js 的 meSay()，這裡故意不呼叫 down()：meSay() 自己會在
   requestAnimationFrame 裡帶 {smooth:true} 呼叫 down()，讓畫面平滑捲到新一輪頂端
   （見 meSay() 的說明）。這裡如果也跟著即時 down() 一次，會在同一個瞬間先把捲動位置
   瞬間跳到目標值附近，等 meSay() 的平滑捲動接著執行時，起點跟終點已經幾乎重疊，
   使用者會只看到瞬間跳格、看不到滑動過程——這正是「平滑捲動看起來還是一閃就到位」
   的成因，所以這裡改成完全交給呼叫端決定要不要捲、怎麼捲。 */
function renderMessageChatBubble(content,opts){
  opts=opts||{};
  const row=document.createElement('div');row.className='mcb-row'+(opts.className?' '+opts.className:'');
  const bubble=document.createElement('div');bubble.className='mcb';
  bubble.textContent=content;
  row.appendChild(bubble);
  appendToChat(row);
  return row;
}
COMPONENTS['message/chat-bubble']={render:renderMessageChatBubble};

/* ---- list/next-step（Figma node 237:1191／240:898，Chat/next action／Chat/option）說明後的下一步選單 ----
   標題 + 可變數量選項（每項：主標題／副說明／右側 chevron，項目間分隔線），整組嵌入聊天紀錄。
   純顯示用元件，不寫死任何商品名稱／頁面文案，皆由呼叫端的 heading／items 傳入；
   點擊只單純呼叫該項的 onSelect，元件本身不處理「選取後消失」或「產生訊息氣泡」——
   那是對話流程的業務邏輯，交給呼叫端（見 engine.js 的 showNextSteps）決定。
   item.state==='disabled' 時該列不可點擊（Figma 此節點本身沒有 disabled variant，
   樣式依文字規格另行還原：低對比灰階＋半透明）。
   items：[{id, title, description, state, onSelect}]；opts：{className}。 */
const NSL_ICON_CHEVRON=`<svg class="nsl-chevron" viewBox="0 0 7.6011 13.4344" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0.883883 0.883883L6.71722 6.71722L0.883883 12.5505" stroke="currentColor" stroke-width="1.25" stroke-linecap="square"/>
</svg>`;
function renderNextStepList(heading,items,opts){
  opts=opts||{};
  const list=document.createElement('div');list.className='nsl'+(opts.className?' '+opts.className:'');
  list.innerHTML=`<div class="nsl-heading"></div><div class="nsl-items"></div>`;
  list.querySelector('.nsl-heading').textContent=heading;
  const itemsEl=list.querySelector('.nsl-items');
  (items||[]).forEach(item=>{
    const btn=document.createElement('button');btn.type='button';btn.className='nsl-item';
    btn.disabled=item.state==='disabled';
    btn.innerHTML=`<span class="nsl-item-text">
        <span class="nsl-item-title"></span>
      </span>${NSL_ICON_CHEVRON}`;
    btn.querySelector('.nsl-item-title').textContent=item.title;
    if(item.description){
      const desc=document.createElement('span');desc.className='nsl-item-desc';desc.textContent=item.description;
      btn.querySelector('.nsl-item-text').appendChild(desc);
    }
    btn.onclick=()=>{if(item.onSelect)item.onSelect();};
    itemsEl.appendChild(btn);
  });
  appendToChat(list);down();settleTurn();
  return list;
}
COMPONENTS['list/next-step']={render:renderNextStepList};

/* ---- button/primary（Figma node 246:876）全站共用主要行動按鈕（CTA） ----
   跟其他元件不同，這是通用型原子元件，不綁定聊天流程，不會自己 appendChild 到 chatBox——
   呼叫端可能要放進 selpage 表單、chat 的 controls 區、或流程結尾畫面，由呼叫端自行決定掛載位置。
   狀態只靠原生 <button disabled> + CSS :hover 即可，Figma 沒有為 Pressed 做出跟 Default 不同的視覺，
   故不額外實作 :active 覆蓋。
   純文字按鈕，不支援 icon：label 用 textContent 寫入，就算傳字串也只會當純文字顯示，不會渲染成圖示。
   opts：{disabled, onClick, type, className} 皆可省略。 */
function renderButtonPrimary(label,opts){
  opts=opts||{};
  const btn=document.createElement('button');
  btn.type=opts.type||'button';
  btn.className='btn-primary'+(opts.className?' '+opts.className:'');
  btn.textContent=label;
  btn.disabled=!!opts.disabled;
  if(opts.onClick)btn.onclick=opts.onClick;
  return btn;
}
COMPONENTS['button/primary']={render:renderButtonPrimary};

/* ---- card/feedback-qr（Figma node 260:993，ai 投資助理_QR code 掃描）----
   流程結尾的滿意度回饋卡：慶祝圖示＋標題＋三行說明＋QR Code＋再體驗一次按鈕，「立即申購」／
   「諮詢理專」兩條流程共用同一份（見 js/engine.js finishFlow()），不要各自複製一份。
   2026-07-29 依 Figma 更新：新增頂部慶祝圖示（assets/feedback-celebrate.svg，266:1146
   「Business Symbols/優惠＆活動」），標題文案改「非常感謝您的體驗」並改用 Headline token
   （原本誤用 Subtitle-B），說明文字拆成三行獨立段落（原本後兩行擠在同一行），QR Code
   移到說明文字之後（原本在最上面），尺寸依設計稿改 210px。
   2026-07-30：慶祝圖示改用向量 SVG（原本是 80x80 點陣 PNG，在螢幕解析度高於 1x 時會模糊）；
   Figma 匯出的原始圖層本身就是純色路徑，沒有漸層或點陣特效，用 SVG 重組後畫質完全無損，
   任何尺寸／解析度下都清晰。
   說明文字色／字級對應 Content/General/Primary＋Body-R token——這兩個 token 在 Figma
   原稿裡的實際標示是純黑 #000000／16px，專案 token 沒有完全對應的項目，已跟需求方確認
   改用最接近的既有 token（不新增 token）。
   底部的 disabled InputChatBar 不在這個元件裡渲染——那是掛在 #inputbar 的全站共用元件
   （js/bootstrap.js 已經是 disabled 狀態），呼叫端不需要另外處理。
   opts：{qrSrc, onRestart}，qrSrc 先用 placeholder 圖檔，之後有真實問卷連結的 QR 圖再替換路徑即可；
   onRestart 預設呼叫 resetAll()，回到對話流程最初的開始體驗頁。 */
const FBQR_DEFAULTS={qrSrc:'assets/qr-placeholder.svg'};
function renderFeedbackQrCard(opts){
  opts=opts||{};
  const qrSrc=opts.qrSrc||FBQR_DEFAULTS.qrSrc;
  const card=document.createElement('div');card.className='fbqr';
  card.innerHTML=`
    <div class="fbqr-qr">
      <div class="fbqr-intro">
        <img class="fbqr-icon" src="assets/feedback-celebrate.svg" alt="">
        <div class="fbqr-copy">
          <div class="fbqr-qr-title">感謝體驗凱基 AI 智富管家</div>
          <div class="fbqr-qr-desc">
            <p>您的寶貴意見是我們前進的動力！</p>
            <p>誠摯邀請您掃描 QR Code 填寫滿意度問卷</p>
            <p>凱基銀行感謝您的支持與配合。</p>
          </div>
        </div>
      </div>
      <img class="fbqr-qr-img" src="${qrSrc}" alt="滿意度問卷 QR Code">
    </div>
    <div class="fbqr-btn-mount"></div>`;
  card.querySelector('.fbqr-btn-mount').appendChild(
    renderComponent('button/primary','再體驗一次',{onClick:opts.onRestart||resetAll})
  );
  chatBox.appendChild(card);down();
  return card;
}
COMPONENTS['card/feedback-qr']={render:renderFeedbackQrCard};

/* ---- popover/option-select（Figma node 306:1102「問題回答優化」／305:1184「optionselection」）----
   AI 提問選項的浮動選單：問題標題＋選項清單，以覆蓋（overlay）方式掛在 .app 底下、疊在輸入框之上，
   不進 chatBox／不經過 #controls，因此不佔用 #screen 的版面高度（見 css/component-library.css
   .opt-popover-wrap 的說明）。選項清單直接重用既有 choiceBtn()（Message/option 元件），
   不重建/不修改其內部樣式；opts.kw 沿用既有 keywords 機制接上 activeChoices。
   純顯示用元件：選取後「移除浮動選單／把問題與答案顯示進聊天紀錄／觸發後續分析」皆是呼叫端
   （見 flow.js stageC()）的業務邏輯，這裡只負責渲染與回傳選取結果。
   options：[{label, sub, kw}]；onPick(option) 為選中某一項時的回呼；回傳掛載的 wrap 元素，
   呼叫端選取後自行 .remove()。 */
function renderOptionPopover(question,options,onPick){
  const app=document.querySelector('.app');
  const wrap=document.createElement('div');wrap.className='opt-popover-wrap';
  const pop=document.createElement('div');pop.className='opt-popover';
  const title=document.createElement('div');title.className='opt-popover-title';title.textContent=question;
  const list=document.createElement('div');list.className='choice-group';
  pop.appendChild(title);pop.appendChild(list);wrap.appendChild(pop);
  /* 這個浮動選單掛在 .app 底下，不在 #screen／#controls 裡面，resetAll() 清畫面時本來會漏掉它
     （見 engine.js activePopover 的說明）。這裡記住「目前顯示中的是哪一個」，讓 resetAll()
     在使用者還沒選、就直接點「重新開始」時，也能找到並移除它，不會殘留蓋在新畫面上。 */
  if(activePopover&&activePopover!==wrap)activePopover.remove();
  activePopover=wrap;
  (app||document.body).appendChild(wrap);
  (options||[]).forEach(opt=>{
    list.appendChild(choiceBtn(opt.label,opt.sub||null,()=>{
      if(activePopover===wrap)activePopover=null;
      onPick(opt);
    },opt.kw));
  });
  /* 這個浮動選單釘在畫面底部（.opt-popover-wrap 是 position:absolute; bottom:16px，跟
     #screen 的捲動內容是分開的兩層），不會因為 #screen 內容變多而自動往下讓位。如果它
     前面已經生成的內容（例如 stageC() 的圓餅圖＋文字＋折線圖）比視窗還高，浮動選單就會
     直接疊在那段內容的尾端上面，把使用者還沒看完的東西蓋住（見使用者回報：折線圖後半段
     被選項彈窗蓋住）。這裡量一下浮動選單實際疊進 #screen 可視範圍多少，就把 #screen
     往下捲開等量的距離，讓內容自己讓出這塊位置——只有真的疊到才會捲動，原本內容夠短、
     不會被蓋到的情況（大部分既有提問）完全不受影響。
     先呼叫 syncSpacer()：內容＋浮動選單合計高度若超過視窗，單靠原生 scrollHeight 捲不夠遠
     （會被夾在「捲到底了還是差一截」），借用跟一般對話輪次（down()）同一套捲動緩衝空間，
     才能確保捲得到需要的位置，不受限於當下內容剛好多長。
     重疊量要拿「目前最後一段內容」的下緣去跟浮動選單的上緣比較，不能拿 #screen 自己的
     可視範圍下緣（sRect.bottom）去比——後者是視窗本身的固定邊界，不會因為 #screen 捲動而
     改變，拿它算出來的重疊量是個常數。
     捲動改呼叫 animateScrollTop()（跟一般對話輪次 down({smooth:true}) 同一套緩動＋時長
     計算），取代原本 s.scrollTop=... 的瞬間跳轉——使用者回報「剛生成圖表那段捲到最下面
     太快」，直接設定 scrollTop 是零時間跳轉，改用平滑捲動比較不突兀；maxScrollTop 直接
     訂在算好的目標值（而不是動畫途中當下的 s.scrollTop），這樣 clampScroll() 才不會在
     動畫還沒跑完時就把它夾回動畫起點，跟平滑捲動互相打架。 */
  requestAnimationFrame(()=>{
    const s=screen();
    syncSpacer();
    const last=chatBox&&chatBox.lastElementChild;
    if(!last)return;
    const contentBottom=last.getBoundingClientRect().bottom,popRect=wrap.getBoundingClientRect();
    const overlap=contentBottom-popRect.top;
    if(overlap<=0)return;
    const target=Math.min(s.scrollHeight-s.clientHeight,s.scrollTop+overlap+16);
    maxScrollTop=target;
    if(prefersReducedMotion())s.scrollTop=target;
    else animateScrollTop(s,target);
  });
  return wrap;
}
COMPONENTS['popover/option-select']={render:renderOptionPopover};

/* ---- selection/option（Figma node 370:3005，Selection/Option）可重複使用的單選/多選選項卡 ----
   icon／label 皆由呼叫端傳入，不寫死目前 Figma 稿裡的錢袋圖示與「選項文案」佔位字；
   icon 可傳 SVG markup 字串或既有 DOM node，元件只負責 80x80 容器置中（見
   css/component-library.css .selopt-icon），不處理 icon 本身的繪製，換圖示不影響排版。
   語意預設 role="radio"＋aria-checked（單選情境，例如同一組互斥選項）；若要改成多選（checkbox），
   呼叫端把 opts.role 傳 'checkbox' 即可——role="checkbox" 一樣讀 aria-checked，不需要改其他邏輯，
   只是不會有「選一個、其餘取消」的互斥語意（那是 renderSelectionOptionGroup 的 radiogroup 行為）。
   selected 是受控狀態：本元件點擊時不會自己切換 selected（避免跟外部資料狀態失去同步），
   只會呼叫 opts.onSelect(cardEl)，實際要不要切換選取視覺由呼叫端呼叫回傳元素的
   setSelected(bool) 決定；renderSelectionOptionGroup() 是這個模式的現成用法。
   Pressed 狀態用 mousedown/touchstart～mouseup/touchend/mouseleave/keydown/keyup 手動切 class，
   不用純 CSS :active——鍵盤 Enter/Space 觸發 <button> 時，:active 偽類在部分瀏覽器對「鍵盤觸發」
   的支援不一致，手動切 class 才能讓滑鼠／觸控／鍵盤三種輸入都有一致的按下視覺回饋。
   <button> 原生就支援 Tab 聚焦與 Enter/Space 觸發 click，不需要額外的 keydown→click 轉發。
   Figma 稿的 Hover／Pressed 兩個 variant 視覺完全相同，Selected 疊加 Hover/Pressed 也沒有對應的稿
   （見 css/component-library.css 這段的 TODO 註解），因此按下視覺共用同一組 CSS 規則，
   這裡不需要在 JS 另外區分 Hover 跟 Pressed。
   opts：{selected, onSelect, disabled, role, className}。 */
function renderSelectionOptionCard(icon,label,opts){
  opts=opts||{};
  const card=document.createElement('button');
  card.type='button';
  card.className='selopt'+(opts.className?' '+opts.className:'');
  card.setAttribute('role',opts.role||'radio');
  card.disabled=!!opts.disabled;
  card.innerHTML='<span class="selopt-icon" aria-hidden="true"></span><span class="selopt-label"></span>';
  const iconEl=card.querySelector('.selopt-icon');
  if(icon instanceof Node)iconEl.appendChild(icon);
  else if(icon!=null)iconEl.innerHTML=icon;
  card.querySelector('.selopt-label').textContent=label||'';

  function setSelected(v){
    card.classList.toggle('is-selected',!!v);
    card.setAttribute('aria-checked',v?'true':'false');
  }
  setSelected(!!opts.selected);

  function setPressed(v){card.classList.toggle('is-pressed',!!v);}
  ['mousedown','touchstart'].forEach(evt=>card.addEventListener(evt,()=>setPressed(true)));
  ['mouseup','mouseleave','touchend','touchcancel'].forEach(evt=>card.addEventListener(evt,()=>setPressed(false)));
  card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat)setPressed(true);});
  card.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' ')setPressed(false);});

  card.addEventListener('click',()=>{if(opts.onSelect)opts.onSelect(card);});

  card.setSelected=setSelected;
  return card;
}
COMPONENTS['selection/option']={render:renderSelectionOptionCard};

/* renderSelectionOptionGroup：包一層容器重複渲染多張 selection/option 卡片（如 Figma 稿的堆疊示意），
   預設當作單選（radio）群組使用：點擊某張卡片會自動取消其餘卡片的選取，呼叫端不用自己管理互斥邏輯；
   opts.role 傳 'checkbox' 則關閉互斥、改成各卡片獨立切換（多選）。
   items：[{icon,label,selected,disabled,className,onSelect}]；opts：{role,className,ariaLabel,direction}
   direction 傳 'row' 會加上 .row modifier class（橫向排列，見 css/component-library.css .selopt-group.row），
   預設沿用 Figma 稿的縱向堆疊＋Spacing/20 間距。
   沒有另外加 name/groupName prop：ARIA 的 radiogroup 是靠「同一個 role="radiogroup" 容器底下的
   role="radio" 子項」這層 DOM 包含關係辨識同一組，不像原生 <input type="radio"> 需要共用 name
   屬性才能互斥；兩個獨立呼叫 renderSelectionOptionGroup() 本來就是兩個獨立容器，天生不會互相干擾，
   加這個 prop 不會多解決什麼問題。
   單選模式下鍵盤支援 WAI-ARIA Radio Group pattern 的「roving tabindex」：同一時間只有一張卡片
   在 Tab 順序上（tabIndex=0，其餘卡片 tabIndex=-1），方向鍵（↑↓←→，不分橫直排列一律線性往前/往後）
   在卡片間移動並「立即選取」該卡片（比照原生 <input type="radio"> 方向鍵的行為，不需要再按一次
   Enter/Space 確認）；多選（checkbox）模式維持每張卡片各自獨立的原生 Tab 順序，不套用 roving
   tabindex（ARIA Checkbox 沒有這個慣例，各自都要能被 Tab 到）。 */
function renderSelectionOptionGroup(items,opts){
  opts=opts||{};
  const isRadio=(opts.role||'radio')==='radio';
  const wrap=document.createElement('div');
  wrap.className='selopt-group'+(opts.direction==='row'?' row':'')+(opts.className?' '+opts.className:'');
  if(isRadio)wrap.setAttribute('role','radiogroup');
  if(opts.ariaLabel)wrap.setAttribute('aria-label',opts.ariaLabel);
  const cards=[];

  function updateRovingTabIndex(){
    if(!isRadio)return;
    let active=cards.findIndex(c=>c.classList.contains('is-selected')&&!c.disabled);
    if(active<0)active=cards.findIndex(c=>!c.disabled);
    cards.forEach((c,i)=>{c.tabIndex=(i===active)?0:-1;});
  }
  function selectByIndex(i){
    const card=cards[i];
    if(!card||card.disabled)return;
    if(isRadio)cards.forEach((c,ci)=>c.setSelected(ci===i));
    else card.setSelected(!card.classList.contains('is-selected'));
    updateRovingTabIndex();
    if(items[i].onSelect)items[i].onSelect(items[i],i);
  }

  (items||[]).forEach((item,i)=>{
    const card=renderSelectionOptionCard(item.icon,item.label,{
      selected:!!item.selected,
      disabled:item.disabled,
      role:opts.role,
      className:item.className,
      onSelect:()=>selectByIndex(i)
    });
    if(isRadio)card.addEventListener('keydown',e=>{
      const dir=(e.key==='ArrowRight'||e.key==='ArrowDown')?1:(e.key==='ArrowLeft'||e.key==='ArrowUp')?-1:0;
      if(!dir)return;
      e.preventDefault();
      let next=i;
      for(let step=0;step<cards.length;step++){
        next=(next+dir+cards.length)%cards.length;
        if(!cards[next].disabled)break;
      }
      selectByIndex(next);
      cards[next].focus();
    });
    cards.push(card);
    wrap.appendChild(card);
  });
  updateRovingTabIndex();
  return wrap;
}
COMPONENTS['selection/option-group']={render:renderSelectionOptionGroup};
