let S={};
const screen=()=>document.getElementById('screen');
const ctrls=()=>document.getElementById('controls');
const setProgress=p=>document.getElementById('progbar').style.width=p+'%';
const down=()=>{const s=screen();s.scrollTop=s.scrollHeight;};
function setControls(node){freeOverride=null;const c=ctrls();c.innerHTML='';if(node)c.appendChild(node);down();}
function clearControls(){ctrls().innerHTML='';}
function wrap(){return document.createElement('div');}
const isHigh=()=>S.assetRange==='200 萬以上';               // ≥200萬
function assetMid(){return {'100 萬以下':800000,'100 萬 – 200 萬':1500000,'200 萬以上':3200000}[S.assetRange]||1000000;}

function resetAll(){
  S={assetRange:null,ratio:50,q1:null,q2:null,q3:null,depositWeight:'mid',reco:null,otherAmt:null,otherRatio:null};
  clearControls();setProgress(0);step1();
}

/* ================= 階段一 互動一：純選擇頁 ================= */
function step1(){
  setProgress(8);clearControls();hideInput();
  const p=wrap();p.className='selpage';
  p.innerHTML=`
    <div class="kicker">智慧理財 · 資產健檢</div>
    <h1>先了解您的資產概況</h1>
    <div class="lead">請提供您的資產概況，我們將為您進行初步分析。</div>
    <div class="q">1. 您目前可運用的資產大約多少？</div>
    <div id="rangeOpts"></div>
    <div class="q">2. 其中已投入投資的比例大約是？</div>
    <div class="slider-wrap"><label>投資占比 <span class="val" id="rv">50%</span></label>
      <input type="range" min="0" max="100" step="5" value="50" id="rr"></div>
    <button class="primary" id="startBtn" disabled>開始分析 →</button>`;
  screen().innerHTML='';screen().appendChild(p);
  const ro=p.querySelector('#rangeOpts');
  ['100 萬以下','100 萬 – 200 萬','200 萬以上'].forEach(x=>{
    const b=document.createElement('button');b.className='opt';b.textContent=x;
    b.onclick=()=>{ro.querySelectorAll('.opt').forEach(o=>o.classList.remove('sel'));
      b.classList.add('sel');S.assetRange=x;startBtn.disabled=false;};
    ro.appendChild(b);
  });
  const rr=p.querySelector('#rr'),rv=p.querySelector('#rv'),startBtn=p.querySelector('#startBtn');
  const upd=()=>{rv.textContent=rr.value+'%';rr.style.setProperty('--fill',rr.value+'%');S.ratio=+rr.value;};
  rr.oninput=upd;upd();
  startBtn.onclick=()=>step2();
}

/* ================= 階段一：銀行 App 首頁 ================= */
function step2(){
  setProgress(18);clearControls();
  const s=screen();s.innerHTML='';const v=wrap();
  v.innerHTML=`
    <div class="apphead"><div class="apptop"><h2>帳務</h2>
      <div class="icons"><span class="bell">🔔</span><span>🔍</span><span>▣</span></div></div></div>
    <div class="tabs"><div class="tab">帳務總覽</div><div class="tab on"><span class="ic">＄</span>存款</div>
      <div class="tab">信用卡</div><div class="tab">投資</div><div class="tab">貸款</div></div>
    <div class="seg"><div class="on">臺幣</div><div>外幣</div></div>
    <div class="total"><div class="k">存款總額</div><div class="v"><small>NTD</small>＊＊＊＊ 👁</div></div>
    <div class="hintcard"><span class="x">✕</span>
      <div class="top"><div class="bot">🤖</div>
        <div class="msg">發現你帳戶有筆資金默默躺了一個月，要不要撥一點做「定期定額」或「高股息投資」，把這些閒置資產活化起來！</div></div>
      <div class="cta"><button id="learnBtn">我想了解 ›</button></div></div>
    <div class="sec-title">臺幣存款</div>
    <div class="sec-sub">臺幣總計 2 筆　NTD ＊＊＊＊</div>
    <div class="acct"><div class="an">無摺綜</div><div class="no">60388000008997</div>
      <div class="foot"><span>🇹🇼 臺幣</span><span>NTD ＊＊＊＊ ›</span></div></div>
    <div class="acct"><div class="an">數位活儲</div><div class="no">60388000012345</div>
      <div class="foot"><span>🇹🇼 臺幣</span><span>NTD ＊＊＊＊ ›</span></div></div>`;
  s.appendChild(v);
  v.querySelector('#learnBtn').onclick=()=>enterChat();
  v.querySelector('.x').onclick=()=>{v.querySelector('.hintcard').style.display='none';};
}

/* ================= 對話輔助 ================= */
let chatBox=null,activeChoices=[],freeOverride=null,suppressNextEcho=false;
function enterChat(){setProgress(28);showInput();activeChoices=[];const s=screen();s.innerHTML='';
  chatBox=wrap();chatBox.className='chat';s.appendChild(chatBox);ch_reveal();}
function aiSay(msgs,done){
  let i=0;(function next(){
    if(i>=msgs.length){if(done)done();return;}
    const t=document.createElement('div');t.className='typing';
    t.innerHTML='<span class="d"></span><span class="d"></span><span class="d"></span>';
    chatBox.appendChild(t);down();
    setTimeout(()=>{t.remove();const m=document.createElement('div');m.className='ai-msg';
      m.innerHTML=msgs[i];chatBox.appendChild(m);down();i++;setTimeout(next,300);},620);
  })();
}
function note(html){const n=document.createElement('div');n.className='note';n.innerHTML=html;chatBox.appendChild(n);down();}
function tagline(text){const t=document.createElement('div');t.className='tagline';t.textContent=text;chatBox.appendChild(t);down();}
function meSay(text){if(suppressNextEcho){suppressNextEcho=false;return;}
  const m=document.createElement('div');m.className='me-msg';m.innerHTML='<span>'+text+'</span>';chatBox.appendChild(m);down();}
function choiceBtn(label,sub,onClick,multi,keywords){const b=document.createElement('button');
  b.className='choice'+(multi?' multi':'');b.innerHTML=label+(sub?'<small>'+sub+'</small>':'');
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
      <div class="hole"><div><div class="hv">${idle}%</div><div class="hl">閒置</div></div></div></div>
    <div class="legend">
      <div class="li"><span class="dot" style="background:var(--brand)"></span>已投資<span class="amt">$${inv.toLocaleString()}</span></div>
      <div class="li"><span class="dot" style="background:var(--idle)"></span>閒置活存<span class="amt">$${idl.toLocaleString()}</span></div>
    </div>`;
  chatBox.appendChild(card);down();return card;
}
function refreshDonut(id,investedPct,amount){
  const c=document.getElementById(id);if(!c)return;const idle=100-investedPct;
  const inv=Math.round(amount*investedPct/100),idl=amount-inv;
  c.querySelector('.donut').style.background=`conic-gradient(var(--brand) 0 ${investedPct}%,var(--idle) ${investedPct}% 100%)`;
  c.querySelector('.hv').textContent=idle+'%';
  const a=c.querySelectorAll('.amt');a[0].textContent='$'+inv.toLocaleString();a[1].textContent='$'+idl.toLocaleString();
}

/* ================= 階段一 互動二：閒置資金 + 風險承受 ================= */
function ch_reveal(){
  const idle=100-S.ratio;
  aiSay(["您好，我是智慧理財助理。我先依您的帳戶概況進行初步分析。"],()=>{
    setTimeout(()=>{
      addDonut(S.ratio,assetMid());
      aiSay([`分析完成。您目前約有 <b>${idle}%</b> 的資金以活存形式持有，活存利率通常低於定存與多數投資工具。`,
        "接下來用三個簡短問題，幫您釐清較適合的方向。"],()=>ch_q1());
    },700);
  });
}
/* Q1 現金流需求 → 決定存款佔比 */
function ch_q1(){
  setProgress(46);
  aiSay(["Q1. 這筆資金，您預期多久內可能會用到？"],()=>{
    const w=wrap();
    const o=[
      ['3 個月內','','high',['3個月','三個月','很快','馬上','短期','隨時','近期']],
      ['半年到一年','','mid',['半年','一年','1年','年內','中期']],
      ['一年以上都用不到','','low',['一年以上','1年以上','很久','長期','不會用','都用不到','放很久']],
      ['沒特別想過','','mid',['沒想','不確定','不知道','沒特別','沒差','都可以']],
    ];
    o.forEach(([l,s,wt,kw])=>w.appendChild(choiceBtn(l,s,()=>{S.q1=l;S.depositWeight=wt;meSay(l);clearControls();ch_q2();},false,kw)));
    setControls(w);
  });
}
/* Q2 風險承受度 → 決定是否進入投資型商品 */
function ch_q2(){
  setProgress(60);
  aiSay(["Q2. 如果短期出現帳面小幅波動，您會？"],()=>{
    const w=wrap();
    w.appendChild(choiceBtn('要保本，不能有波動',null,()=>{S.q2='保本';meSay('要保本，不能有波動');clearControls();offerDeeper();},false,['保本','不能','不要波動','不想虧','零風險','安全','不能虧','怕']));
    w.appendChild(choiceBtn('小波動可以接受',null,()=>{S.q2='低波動';meSay('小波動可以接受');clearControls();ch_q3();},false,['小波動','可以接受','還好','一點點','小幅','ok','OK','接受','小']));
    w.appendChild(choiceBtn('為了更高報酬，可接受中度波動',null,()=>{S.q2='中波動';meSay('可接受中度波動');clearControls();ch_q3();},false,['中度','高報酬','沒問題','敢','波動沒關係','中等','可以波動','衝']));
    setControls(w);
  });
}

/* Q3 債券/基金偏好 → 決定產品線（僅在 Q2 非保本時觸發） */
function ch_q3(){
  setProgress(74);
  aiSay(["Q3. 如果要考慮投資型商品，您比較重視哪一項？"],()=>{
    const w=wrap();
    w.appendChild(choiceBtn('到期領回金額確定、想鎖住現在利率','傾向債券',()=>{S.q3='債券';meSay('想鎖住利率、到期領回確定');clearControls();offerDeeper();},false,['鎖','到期','確定','固定','領回','利率','債']));
    w.appendChild(choiceBtn('想要成長潛力，能接受淨值持續波動','傾向基金',()=>{S.q3='基金';meSay('想要成長、能接受波動');clearControls();offerDeeper();},false,['成長','潛力','淨值','波動','基金','賺','漲']));
    w.appendChild(choiceBtn('都可以，想先看比較','債券 vs 基金對比',()=>{S.q3='比較';meSay('想先看比較');clearControls();compareCard();},false,['都可以','比較','看看','先看','不確定','兩個','差別','不知道']));
    setControls(w);
  });
}
/* 債券 vs 基金 對比卡片（Q3 選「都可以」時） */
function compareCard(){
  aiSay(["這是債券與基金的重點比較，供您參考："],()=>{
    const c=document.createElement('div');c.className='compare';
    c.innerHTML=`
      <div class="cmpcol"><div class="cmph">債券</div>
        <div class="cmpr"><span>收益方式</span>固定配息</div>
        <div class="cmpr"><span>價格波動</span>相對較低</div>
        <div class="cmpr"><span>到期</span>領回金額確定</div>
        <div class="cmpr"><span>適合</span>想鎖利率、要穩定現金流</div></div>
      <div class="cmpcol"><div class="cmph">基金</div>
        <div class="cmpr"><span>收益方式</span>淨值成長／配息</div>
        <div class="cmpr"><span>價格波動</span>中等</div>
        <div class="cmpr"><span>到期</span>無固定、可隨時申贖</div>
        <div class="cmpr"><span>適合</span>想要成長、能接受波動</div></div>`;
    chatBox.appendChild(c);down();
    aiSay(["看完之後，您比較傾向哪一個方向？"],()=>{
      const w=wrap();
      w.appendChild(choiceBtn('債券方向',null,()=>{S.q3='債券';meSay('債券方向');clearControls();offerDeeper();},false,['債','鎖','固定','穩','領回']));
      w.appendChild(choiceBtn('基金方向',null,()=>{S.q3='基金';meSay('基金方向');clearControls();offerDeeper();},false,['基金','成長','波動','漲','潛力']));
      setControls(w);
    });
  });
}
/* 更進一步（選填）：他行資產，納入整體分析 */
function offerDeeper(){
  setProgress(80);
  aiSay(["在提供配置建議前，若您願意補充在其他金融機構的資產，我可以納入整體、給更完整的分析。"],()=>{
    const w=wrap();
    w.appendChild(choiceBtn("好，補充他行資產做更完整分析",null,()=>{meSay('補充他行資產');clearControls();otherAssets();},false,['好','補充','願意','可以','要','他行','其他','完整','更']));
    w.appendChild(choiceBtn("不用，直接看結果",null,()=>{meSay('直接看結果');clearControls();resolveReco();},false,['不用','不','直接','看結果','跳過','沒有','免','快']));
    setControls(w);
  });
}
function otherMid(){return {'50 萬以下':350000,'50–100 萬':750000,'100–300 萬':2000000,'300 萬以上':4000000}[S.otherAmt]||1000000;}
function otherAssets(){
  setProgress(84);
  aiSay(["您在其他金融機構的資產大約多少？"],()=>{
    const w=wrap();const chips=document.createElement('div');chips.className='chips';
    ['50 萬以下','50–100 萬','100–300 萬','300 萬以上'].forEach(x=>{
      const c=document.createElement('button');c.className='chip';c.textContent=x;
      c.onclick=()=>{S.otherAmt=x;meSay(x);clearControls();otherRatio();};chips.appendChild(c);});
    w.appendChild(chips);setControls(w);
    freeOverride=(t)=>{const n=parseInt(t.replace(/[^\d]/g,''));let picked=null;
      if(!isNaN(n)){const wan=n>=10000?n/10000:n;
        picked=wan<50?'50 萬以下':wan<100?'50–100 萬':wan<300?'100–300 萬':'300 萬以上';}
      const hit=picked&&[...chips.children].find(c=>c.textContent===picked);
      if(hit){suppressNextEcho=true;hit.click();return;}clarify();};
  });
}
function otherRatio(){
  setProgress(87);
  aiSay(["其中已投入投資的比例大約是？（下方圖表會同步更新）"],()=>{
    addDonut(50,otherMid(),'liveDonut');
    const w=wrap();w.innerHTML=`<div class="cslider">
      <label>他行投資占比 <span class="val" id="rv2">50%</span></label>
      <input type="range" min="0" max="100" step="5" value="50" id="rr2"></div>`;
    const nx=document.createElement('button');nx.className='primary';nx.style.marginTop='8px';nx.textContent='完成';
    w.appendChild(nx);setControls(w);
    const rr=w.querySelector('#rr2'),rv=w.querySelector('#rv2');
    const upd=()=>{rv.textContent=rr.value+'%';rr.style.setProperty('--fill',rr.value+'%');S.otherRatio=+rr.value;
      refreshDonut('liveDonut',S.otherRatio,otherMid());};
    rr.oninput=upd;upd();
    nx.onclick=()=>{meSay('他行投資約 '+S.otherRatio+'%');clearControls();resolveReco();};
    freeOverride=(t)=>{const n=parseInt(t.replace(/[^\d]/g,''));
      if(!isNaN(n)){S.otherRatio=Math.max(0,Math.min(100,n));
        rr.value=S.otherRatio;rr.style.setProperty('--fill',S.otherRatio+'%');rv.textContent=S.otherRatio+'%';
        refreshDonut('liveDonut',S.otherRatio,otherMid());clearControls();resolveReco();}
      else clarify();};
  });
}
/* 綜合三題（＋選填他行資產），決定產品線與配置建議 */
function resolveReco(){
  setProgress(90);
  if(S.q2==='保本') S.reco='高利活存';
  else S.reco=(S.q3==='基金')?'基金':'債券';
  const msgs=[];
  if(S.otherAmt) msgs.push(`納入您在其他機構約「${S.otherAmt}」的資產一起看，整體配置的樣貌會更完整。`);
  let allocNote;
  if(S.reco==='高利活存'){
    allocNote='考量您希望保本、不承受波動，建議以高利活存／定存為主，兼顧安全與隨時動用的彈性。';
  }else{
    const pct={high:70,mid:40,low:15}[S.depositWeight||'mid'];
    allocNote=`綜合您的用途時間與波動接受度，建議可保留約 <b>${pct}%</b> 於高利活存以備動用，其餘約 <b>${100-pct}%</b> 配置於${S.reco}，兼顧流動性與成長。`;
  }
  msgs.push(allocNote,`為您整理的參考方向為 <b>${S.reco==='高利活存'?'高利活存':S.reco+'商品'}</b>。`);
  aiSay(msgs,()=>stepCalc());
}

/* ================= 階段四：依商品試算 ================= */
function stepCalc(){
  setProgress(90);
  const cfg=RECO[S.reco];const defAmt=200000;
  aiSay([`以下試算可協助您比較不同方案的預估年收益（${cfg.calcTitle}）：`,
    "調整金額，即可比較各方案的預估結果："],()=>{
    const card=document.createElement('div');card.className='calc';
    card.innerHTML=`<div class="calc-title">${cfg.calcTitle}</div>
      <div class="calc-head">試算金額 <b id="camt">$${defAmt.toLocaleString()}</b></div>
      <input type="range" min="100000" max="3000000" step="50000" value="${defAmt}" id="camtR">
      <div class="calc-rows" id="crows"></div>
      <div class="calc-note">＊以單利、稅前估算，僅供比較參考；實際收益依商品條件而定。</div>`;
    chatBox.appendChild(card);down();
    const rr=card.querySelector('#camtR'),camt=card.querySelector('#camt'),rows=card.querySelector('#crows');
    const colors=['#b6bdc9','#2ea97f','var(--brand)'];
    function draw(){
      const amt=+rr.value;camt.textContent='$'+amt.toLocaleString();
      rr.style.setProperty('--fill',((amt-100000)/2900000*100)+'%');
      const base=amt*cfg.scen[0][1]/100;
      rows.innerHTML=cfg.scen.map((s,i)=>{
        const yr=Math.round(amt*s[1]/100),diff=Math.round(yr-base);
        return `<div class="crow ${i===cfg.hi?'hi':''}"><span class="cbar" style="background:${colors[i]||'var(--brand)'}"></span>
          <span class="cn">${s[0]}<small>${s[1]}%</small></span>
          <span class="cy">$${yr.toLocaleString()}<small>/年</small></span>
          <span class="cd">${diff>0?'+$'+diff.toLocaleString():'—'}</span></div>`;
      }).join('');
    }
    rr.oninput=draw;draw();
    const w=wrap();
    w.appendChild(choiceBtn(`查看相關商品資訊`,null,()=>{
      meSay('查看商品資訊');clearControls();productList();},false,['看','商品','好','可以','繼續','清單','了解','下一步','ok','OK']));
    setControls(w);
  });
}

/* ================= 商品清單 + 完成 ================= */
function productList(){
  setProgress(96);
  const cfg=RECO[S.reco];const list=PRODUCTS[cfg.list];
  aiSay([`以下為與此方向相關的商品，供您參考：`],()=>{
    list.forEach(p=>{
      const rc={low:'r-low',mid:'r-mid',high:'r-high'}[p.r];
      const el=document.createElement('div');el.className='prod';
      el.innerHTML=`<div class="ph"><div class="pn">${p.n}</div><span class="tag">${p.tag}</span></div>
        <div class="yield">${p.y}<small>參考年報酬</small></div>
        <div class="meta"><span class="risk ${rc}">${p.rt}</span> · ${p.fit}</div>`;
      chatBox.appendChild(el);down();
    });
    setProgress(100);
    const end=document.createElement('div');end.className='endcard';
    end.innerHTML=`<div class="ic" style="color:#1f9d57">✓</div><div class="t">初步分析完成</div>
      <div class="summary">
        資金用途時間：<b>${S.q1||'—'}</b><br>
        波動接受度：<b>${S.q2==='保本'?'希望保本':S.q2==='低波動'?'可接受小幅波動':S.q2==='中波動'?'可接受中度波動':'—'}</b><br>
        ${S.otherAmt?'含他行資產：<b>'+S.otherAmt+'</b><br>':''}建議參考方向：<b>${cfg.name}</b>
      </div>
      <div class="d">以上為初步參考分析，非投資建議。<br>完整規劃與商品資訊，歡迎洽詢專員。</div>`;
    chatBox.appendChild(end);down();
    const w=wrap();const b=document.createElement('button');b.className='primary';b.style.marginTop='4px';
    b.textContent='重新開始';b.onclick=resetAll;w.appendChild(b);setControls(w);
    freeOverride=()=>aiSay(["本次分析已完成。若要重新開始，請點選下方按鈕。"]);
  });
}
(function(){const ci=document.getElementById('chatInput'),cs=document.getElementById('chatSend');
  const send=()=>{const v=ci.value.trim();if(!v)return;ci.value='';handleFree(v);};
  if(cs)cs.onclick=send;if(ci)ci.addEventListener('keydown',e=>{if(e.key==='Enter')send();});
})();
resetAll();
