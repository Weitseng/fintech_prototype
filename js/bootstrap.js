/* ============================================================
   App 啟動（共用，通常不需異動）：底部輸入列掛載 + 開場
   必須最後載入，確保 engine.js／flow-*.js 都已定義完成。
   輸入列目前預設 disabled（展覽期間限定），之後要開放自由輸入時，
   把下面 renderComponent 的第二個參數改成 'enabled' 即可。
   ============================================================ */
(function(){
  const mount=document.getElementById('inputbar');
  const bar=renderComponent('bar/chat-input','disabled',{onSubmit:handleFree});
  bar.id='inputbar';bar.style.display='none';
  mount.replaceWith(bar);
})();
resetAll();
