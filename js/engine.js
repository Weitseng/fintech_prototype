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
    if((m=line.match(/^>\s?(.*)/))){closeList();out.push(`<div class="md-quote">${mdInline(m[1])}</div>`);return;}
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
/* 需要使用者實際回答的提問句：用醒目的引言卡呈現（跟 aiSay 內文用 "> " 語法的效果一致），
   跟一般敘述性訊息區分開，讓使用者一眼看出「這句是要請你選」，不會被前面的說明文字稀釋掉 */
function aiAsk(question){
  const m=document.createElement('div');m.className='ai-msg';
  m.innerHTML=`<div class="md-quote">${mdInline(question)}</div>`;
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
