/* Interactive Globe — vanilla-JS port of a React/canvas 互動地球元件（使用者提供的參考程式碼：
   <canvas> + Fibonacci sphere 灑點、經緯度轉 3D 座標、弧線連接據點、自轉＋滑鼠拖曳），
   用在 loading/globe-loader 這個 loading 狀態（js/engine.js aiSay() 的 opts.loader==='globe'
   分支，目前只有 js/flow.js stageGList() 產出商品清單前會用到），讓使用者覺得系統正在從
   各個地方幫他蒐集商品（債券／基金／定存）資訊，不是憑空生出清單。
   拿掉參考程式碼原本的 onPointerDown/Move/Up 拖曳互動與 React state／ref——這裡只是清單
   出現前幾秒鐘的短暫 loading 畫面，不需要可操作性，也沒有 React 執行環境，改成單一
   mountInteractiveGlobe() imperative 掛載函式，只保留自轉。架構比照同目錄 shaping-orb.js
   的 mountShapingOrb()：回傳 {destroy()} 給呼叫端在 loading 結束或被 cancelToken 取消時，
   停掉 rAF 迴圈、移除 canvas，避免背景留著一顆看不到卻還在耗效能的地球。
   顏色不沿用參考程式碼寫死的霓虹藍色碼，改讀 One KGI Design Guideline 既有的 Chart/Blue
   token（--color-chart-blue-2nd／-3rd／-4th）——這個 loading 沒有像 .cube-loader 那組
   青紫靛霓虹色一樣「使用者指定沿用識別配色」的前提，照 Design Guideline 慣例接 token，
   跟站內其他元件同一套色票（含 Dark Mode 對應值，token 换了這裡不用跟著改）。
   據點改用凱基銀行業務相關的全球金融中心（台北為據點，輻射連到紐約／倫敦／盧森堡／
   新加坡／東京／香港／法蘭克福——盧森堡、法蘭克福是常見的境外基金註冊地，呼應
   「蒐集債券、基金」的情境），不是原始範例的舊金山／雪梨等一般示意城市。 */
(function(global){
  const MARKERS=[
    {lat:25.03,lng:121.56,label:'台北'},
    {lat:40.71,lng:-74.01,label:'紐約'},
    {lat:51.51,lng:-0.13,label:'倫敦'},
    {lat:49.61,lng:6.13,label:'盧森堡'},
    {lat:1.35,lng:103.82,label:'新加坡'},
    {lat:35.68,lng:139.69,label:'東京'},
    {lat:22.32,lng:114.17,label:'香港'},
    {lat:50.11,lng:8.68,label:'法蘭克福'}
  ];
  /* 全部從台北（凱基銀行所在地）輻射連到其他據點，畫面上呈現「從各地把資料連回台北」
     的意象，不是任兩點隨機互連 */
  const HUB=MARKERS[0];
  const CONNECTIONS=MARKERS.slice(1).map(m=>({from:[HUB.lat,HUB.lng],to:[m.lat,m.lng]}));

  function latLngToXYZ(lat,lng,radius){
    const phi=(90-lat)*Math.PI/180;
    const theta=(lng+180)*Math.PI/180;
    return [
      -(radius*Math.sin(phi)*Math.cos(theta)),
      radius*Math.cos(phi),
      radius*Math.sin(phi)*Math.sin(theta)
    ];
  }
  function rotateY(x,y,z,angle){
    const cos=Math.cos(angle),sin=Math.sin(angle);
    return [x*cos+z*sin,y,-x*sin+z*cos];
  }
  function rotateX(x,y,z,angle){
    const cos=Math.cos(angle),sin=Math.sin(angle);
    return [x,y*cos-z*sin,y*sin+z*cos];
  }
  function project(x,y,z,cx,cy,fov){
    const scale=fov/(fov+z);
    return [x*scale+cx,y*scale+cy];
  }
  /* 讀站內既有的 Design Guideline token（含 Dark Mode 對應值），拿不到才退回參數給的
     備用色——備用色只在 token 檔案沒載入之類的極端狀況才會用到，正常情況下不會用到。 */
  function readToken(name,fallback){
    const v=getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v||fallback;
  }

  /* opts: {size=168, autoRotateSpeed=0.0035} → 回傳 {destroy()}，架構比照 mountShapingOrb()：
     停止 rAF 迴圈、移除 canvas，呼叫端（engine.js aiSay()）在 loading 結束或被
     cancelToken 取消時呼叫。 */
  function mountInteractiveGlobe(container,opts){
    opts=opts||{};
    const size=opts.size||168;
    const autoRotateSpeed=opts.autoRotateSpeed!=null?opts.autoRotateSpeed:0.0035;
    const dotColor=readToken('--color-chart-blue-4th','#96C8FA');
    const arcColor=readToken('--color-chart-blue-3rd','#4E97FF');
    const markerColor=readToken('--color-chart-blue-2nd','#3773DC');
    const canvas=document.createElement('canvas');
    canvas.className='globe-loader-canvas';
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label','正在彙整全球商品資料');
    canvas.style.width=size+'px';canvas.style.height=size+'px';
    container.appendChild(canvas);
    const dpr=Math.min(2,(typeof devicePixelRatio!=='undefined'&&devicePixelRatio)||1);
    canvas.width=Math.round(size*dpr);canvas.height=Math.round(size*dpr);
    const ctx=canvas.getContext('2d');
    if(!ctx)return {destroy:function(){canvas.remove();}};

    /* Fibonacci sphere 灑點：數量比參考程式碼的 1200 少（700），因為這裡的畫布只有
       168px 見方（參考程式碼預設 600px），點數不減少的話疊在一起反而看不出球體輪廓 */
    const dots=[];
    const numDots=700;
    const goldenRatio=(1+Math.sqrt(5))/2;
    for(let i=0;i<numDots;i++){
      const theta=2*Math.PI*i/goldenRatio;
      const phi=Math.acos(1-2*(i+0.5)/numDots);
      dots.push([Math.cos(theta)*Math.sin(phi),Math.cos(phi),Math.sin(theta)*Math.sin(phi)]);
    }

    let rotY=0.4,rotX=0.32,time=0;
    const cx=size/2,cy=size/2,radius=size*0.36,fov=600;

    function frame(){
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,size,size);
      rotY+=autoRotateSpeed;
      time+=0.015;

      const glow=ctx.createRadialGradient(cx,cy,radius*0.8,cx,cy,radius*1.5);
      glow.addColorStop(0,'rgba(60,140,255,0.06)');
      glow.addColorStop(1,'rgba(60,140,255,0)');
      ctx.fillStyle=glow;ctx.fillRect(0,0,size,size);

      ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);
      ctx.strokeStyle='rgba(100,180,255,0.14)';ctx.lineWidth=1;ctx.stroke();

      ctx.fillStyle=dotColor;
      for(let i=0;i<dots.length;i++){
        let [x,y,z]=dots[i];
        x*=radius;y*=radius;z*=radius;
        [x,y,z]=rotateX(x,y,z,rotX);
        [x,y,z]=rotateY(x,y,z,rotY);
        if(z>0)continue; // 背面剔除
        const [sx,sy]=project(x,y,z,cx,cy,fov);
        const depthAlpha=Math.max(0.12,1-(z+radius)/(2*radius));
        const dotSize=0.8+depthAlpha*0.7;
        ctx.globalAlpha=depthAlpha;
        ctx.beginPath();ctx.arc(sx,sy,dotSize,0,Math.PI*2);ctx.fill();
      }
      ctx.globalAlpha=1;

      CONNECTIONS.forEach(conn=>{
        const [lat1,lng1]=conn.from,[lat2,lng2]=conn.to;
        let [x1,y1,z1]=latLngToXYZ(lat1,lng1,radius);
        let [x2,y2,z2]=latLngToXYZ(lat2,lng2,radius);
        [x1,y1,z1]=rotateX(x1,y1,z1,rotX);[x1,y1,z1]=rotateY(x1,y1,z1,rotY);
        [x2,y2,z2]=rotateX(x2,y2,z2,rotX);[x2,y2,z2]=rotateY(x2,y2,z2,rotY);
        if(z1>radius*0.3&&z2>radius*0.3)return; // 兩端都在背面才跳過，避免弧線劃過球體正面卻不畫
        const [sx1,sy1]=project(x1,y1,z1,cx,cy,fov);
        const [sx2,sy2]=project(x2,y2,z2,cx,cy,fov);
        const midX=(x1+x2)/2,midY=(y1+y2)/2,midZ=(z1+z2)/2;
        const midLen=Math.sqrt(midX*midX+midY*midY+midZ*midZ)||1;
        const arcHeight=radius*1.25;
        const elevX=(midX/midLen)*arcHeight,elevY=(midY/midLen)*arcHeight,elevZ=(midZ/midLen)*arcHeight;
        const [scx,scy]=project(elevX,elevY,elevZ,cx,cy,fov);
        ctx.beginPath();ctx.moveTo(sx1,sy1);ctx.quadraticCurveTo(scx,scy,sx2,sy2);
        ctx.strokeStyle=arcColor;ctx.globalAlpha=0.5;ctx.lineWidth=1.2;ctx.stroke();
        ctx.globalAlpha=1;
        /* 沿弧線跑動的小光點：每條連線各自依緯度錯開節奏，避免所有據點同時「送出資料」，
           看起來更像持續、分散地在各地蒐集，而不是同步閃爍 */
        const t=(Math.sin(time*1.2+lat1*0.1)+1)/2;
        const tx=(1-t)*(1-t)*sx1+2*(1-t)*t*scx+t*t*sx2;
        const ty=(1-t)*(1-t)*sy1+2*(1-t)*t*scy+t*t*sy2;
        ctx.beginPath();ctx.arc(tx,ty,2,0,Math.PI*2);ctx.fillStyle=markerColor;ctx.fill();
      });

      MARKERS.forEach(marker=>{
        let [x,y,z]=latLngToXYZ(marker.lat,marker.lng,radius);
        [x,y,z]=rotateX(x,y,z,rotX);[x,y,z]=rotateY(x,y,z,rotY);
        if(z>radius*0.1)return;
        const [sx,sy]=project(x,y,z,cx,cy,fov);
        const pulse=Math.sin(time*2+marker.lat)*0.5+0.5;
        ctx.beginPath();ctx.arc(sx,sy,3+pulse*3,0,Math.PI*2);
        ctx.strokeStyle=markerColor;ctx.globalAlpha=0.2+pulse*0.15;ctx.lineWidth=1;ctx.stroke();
        ctx.globalAlpha=1;
        ctx.beginPath();ctx.arc(sx,sy,2,0,Math.PI*2);ctx.fillStyle=markerColor;ctx.fill();
      });
    }

    const reduced=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){frame();return {destroy:function(){canvas.remove();}};}
    /* 這裡不像 shaping-orb.js 的 mountShapingOrb() 額外接 IntersectionObserver 來暫停
       捲出畫面外的動畫——globe-loader 只會在自己剛掛載、畫面正捲到可視範圍內的當下出現，
       壽命最多幾秒鐘（見 js/flow.js stageGList() 的 loadingMs），沒有「使用者捲走了但
       畫面上還留著一個沒人看到、卻持續佔用效能的動畫」這種需要額外處理的情境，加這層
       判斷只是多一份不會真的用到的複雜度。分頁切到背景時仍然暫停（document.visibilitychange），
       避免使用者切走分頁時白白耗電。 */
    let raf=0,running=false;
    const loop=function(){frame();if(running)raf=requestAnimationFrame(loop);};
    const start=function(){if(running)return;running=true;raf=requestAnimationFrame(loop);};
    const stop=function(){running=false;cancelAnimationFrame(raf);};
    const onVis=function(){if(document.visibilityState==='hidden')stop();else start();};
    document.addEventListener('visibilitychange',onVis);
    start();
    return {destroy:function(){
      stop();
      document.removeEventListener('visibilitychange',onVis);
      canvas.remove();
    }};
  }

  global.mountInteractiveGlobe=mountInteractiveGlobe;
})(window);
