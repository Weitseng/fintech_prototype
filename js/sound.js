/* ============================================================
   全域音效小工具（目前只有「選項卡片被選中」這個音效在用，見
   js/component-library.js renderSelectionOptionGroup() 的 selectByIndex()）。
   獨立成一個檔案、不塞進 component-library.js——之後如果要加其他音效（例如
   提交／完成音效），都集中在這裡管理，呼叫端只需要 SOUND.playSelect()，
   不需要知道底層怎麼播放、有沒有靜音、音效池怎麼輪替。
   音效池（SOUND_POOL_SIZE 個 Audio instance 輪流播放，不是同一顆 currentTime=0
   重播）：使用者快速連續點擊不同選項卡片時，前一個音效可能還沒播完，輪替到
   下一顆 instance 才能讓聲音重疊播放，而不是打斷前一個。
   靜音偏好存 localStorage（key: kgiSoundMuted），跨次造訪記得使用者的選擇。
   ============================================================ */
const SOUND_SELECT_SRC='assets/select.mp3';
const SOUND_MUTE_KEY='kgiSoundMuted';
const SOUND_POOL_SIZE=4;

const SOUND=(function(){
  const pool=Array.from({length:SOUND_POOL_SIZE},()=>{
    const a=new Audio(SOUND_SELECT_SRC);
    a.preload='auto';
    a.load();
    return a;
  });
  let poolIndex=0;
  let muted=localStorage.getItem(SOUND_MUTE_KEY)==='1';

  function playSelect(){
    if(muted)return;
    const a=pool[poolIndex];
    poolIndex=(poolIndex+1)%pool.length;
    a.currentTime=0;
    /* play() 是在使用者點擊事件（user gesture）裡同步呼叫的，理論上不會被瀏覽器的
       autoplay 限制擋掉；catch 只是防呆，避免極端情況（例如瀏覽器分頁被切到背景）
       噴出 unhandled promise rejection 到 console。 */
    a.play().catch(()=>{});
  }

  function isMuted(){return muted;}

  function updateToggleUI(){
    const btn=document.getElementById('soundToggle');
    if(!btn)return;
    btn.classList.toggle('is-muted',muted);
    btn.setAttribute('aria-pressed',muted?'true':'false');
    btn.setAttribute('aria-label',muted?'開啟音效':'靜音');
  }

  function setMuted(v){
    muted=!!v;
    localStorage.setItem(SOUND_MUTE_KEY,muted?'1':'0');
    updateToggleUI();
  }

  function toggleMute(){setMuted(!muted);}

  function init(){
    const btn=document.getElementById('soundToggle');
    if(btn)btn.addEventListener('click',toggleMute);
    updateToggleUI();
  }

  return {playSelect,isMuted,setMuted,toggleMute,init};
})();
SOUND.init();
