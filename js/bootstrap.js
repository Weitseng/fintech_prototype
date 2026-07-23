/* ============================================================
   App 啟動（共用，通常不需異動）：輸入列繫結 + 開場
   必須最後載入，確保 engine.js／flow-*.js 都已定義完成
   ============================================================ */
(function(){const ci=document.getElementById('chatInput'),cs=document.getElementById('chatSend');
  const send=()=>{const v=ci.value.trim();if(!v)return;ci.value='';handleFree(v);};
  if(cs)cs.onclick=send;if(ci)ci.addEventListener('keydown',e=>{if(e.key==='Enter')send();});
})();
resetAll();
