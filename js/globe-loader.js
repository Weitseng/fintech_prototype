/* Interactive Globe — vanilla-JS port of the user-supplied React/canvas component.
   忠實移植使用者提供的原始程式碼（DEFAULT_MARKERS／DEFAULT_CONNECTIONS／
   latLngToXYZ／rotateX／rotateY／project／draw() 內每一段繪製邏輯），只做兩件事：
   1) 拿掉原本的 onPointerDown/Move/Up 拖曳互動（使用者確認不需要，直接刪除，不保留
      cursor:grab 之類的殘留樣式）。
   2) 沒有 React 執行環境，改成 mountInteractiveGlobe(container, opts) 這個 imperative
      掛載函式取代 useRef／useCallback／useEffect 那一套，架構比照同目錄 shaping-orb.js
      的 mountShapingOrb()：回傳 {destroy()} 給呼叫端（js/engine.js aiSay()）在 loading
      結束或被 cancelToken 取消時停掉 rAF 迴圈、移除 canvas。
   【密度／對比度調整】原本的點數（1200）／線條與地名透明度是直接照使用者原始程式碼的
   參數，在實際使用的尺寸（js/flow.js catalogGlobeLoaderOpts()：220px）下太密、對比太低——
   1200 個點擠在半徑不到 90px 的球面上，視覺上糊成一片顆粒狀噪點，連線跟地名的顏色又跟
   背景點群同一色系、透明度也低，整個看起來很模糊，分不出「哪些是點、哪些是連線、哪些是
   地名」。這裡依使用者回饋調整三組參數，讓畫面在小尺寸下仍然清楚：
   - 點數大幅減少（1200→450），且整體透明度調低（乘上 DOT_ALPHA_SCALE），讓背景點群
     退成一層淡淡的網格紋理，不會跟前景的連線／據點搶注意力
   - 連線（arc）透明度、線寬都提高，讓連線清楚浮在點群之上
   - 據點地名字級加大、透明度大幅提高（0.6→0.9），不然幾乎看不見
   其餘（城市據點座標、連線兩端、旋轉／投影公式）維持使用者原始程式碼不動。 */
(function(global){
  /* 據點刪減：原本 11 個城市在畫面上還是常常擠在一起（尤其 Delhi／Erbil／Moscow／
     Taipei／Singapore 這一區，見使用者截圖），拿掉 Moscow／Mexico City（本來就沒有
     連線、純孤立據點，拿掉不影響網絡故事）跟 Erbil（跟 Taipei 同一區最密集的據點，
     不是特別具代表性的城市），把 Taipei 這一區的密度降下來，讓 Taipei 的地名比較不會
     被其他據點的地名蓋過去、看不出來。
     後來使用者又回饋畫面「上方」看起來太空——用固定的 rotX=0.3 傾角換算，剩下的 8 個
     據點在預設視角下幾乎都落在畫面中下段，上半部只剩底圖的裝飾點、沒有任何據點。加了
     Johannesburg：換算過座標，它在預設視角＋整個 loading 期間的自轉範圍內，落點都在
     畫面上半部，且離鏡頭夠近、地名幾乎全程都會顯示，比較能填補這塊視覺空白。
     後來使用者希望 Taipei 置中顯示，拿掉了 Tokyo——這兩個據點的螢幕位置太接近，Taipei
     轉到畫面正中央、離鏡頭最近的角度時，Tokyo 剛好也在那附近，地名會疊字，兩者只能
     留一個，拿掉 Tokyo（Sydney 原本經 Tokyo 中繼連到 London 那條路徑，改成不需要，
     Sydney 仍靠 Singapore 那條連線留在網絡裡）。 */
  const DEFAULT_MARKERS=[
    {lat:37.78,lng:-122.42,label:'San Francisco'},
    {lat:51.51,lng:-0.13,label:'London'},
    {lat:-33.87,lng:151.21,label:'Sydney'},
    {lat:1.35,lng:103.82,label:'Singapore'},
    {lat:-23.55,lng:-46.63,label:'São Paulo'},
    {lat:28.61,lng:77.21,label:'Delhi'},
    {lat:25.03,lng:121.56,label:'Taipei'},
    {lat:-26.20,lng:28.05,label:'Johannesburg'}
  ];
  const DEFAULT_CONNECTIONS=[
    {from:[37.78,-122.42],to:[51.51,-0.13]},
    {from:[37.78,-122.42],to:[1.35,103.82]},
    {from:[51.51,-0.13],to:[28.61,77.21]},
    {from:[37.78,-122.42],to:[-23.55,-46.63]},
    {from:[1.35,103.82],to:[-33.87,151.21]},
    {from:[25.03,121.56],to:[1.35,103.82]},
    {from:[-26.20,28.05],to:[-23.55,-46.63]}
  ];

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
    return [x*scale+cx,y*scale+cy,z];
  }

  /* opts: {size=600, dotColor, arcColor, markerColor, autoRotateSpeed=0.002,
     connections=DEFAULT_CONNECTIONS, markers=DEFAULT_MARKERS} → 回傳 {destroy()}。 */
  function mountInteractiveGlobe(container,opts){
    opts=opts||{};
    const size=opts.size||600;
    const dotColor=opts.dotColor||'rgba(100, 180, 255, ALPHA)';
    const arcColor=opts.arcColor||'rgba(100, 180, 255, 0.5)';
    const markerColor=opts.markerColor||'rgba(100, 220, 255, 1)';
    const autoRotateSpeed=opts.autoRotateSpeed!=null?opts.autoRotateSpeed:0.002;
    const connections=opts.connections||DEFAULT_CONNECTIONS;
    const markers=opts.markers||DEFAULT_MARKERS;

    const canvas=document.createElement('canvas');
    canvas.className='globe-loader-canvas';
    canvas.style.width=size+'px';
    canvas.style.height=size+'px';
    container.appendChild(canvas);
    const ctx=canvas.getContext('2d');
    if(!ctx)return {destroy:function(){canvas.remove();}};

    /* 起始 rotY：5.625（讓 Taipei 精確置中）實測會跟 Delhi 疊字成「TaipeiDelhi」——
       用估計字寬算出來「不重疊」，但實際字型量出來的寬度比估的寬，兩個地名還是黏在一起，
       所以改用有留足夠安全間距、實測過不會疊字的角度（5.355）：Taipei 落在螢幕偏中央
       （非正中央，但已經是這幾個候選角度裡最靠近中央、z 值也最靠前的一個），跟其他
       據點之間留了明顯的垂直間距，不會疊字；Johannesburg 顯示時間比例較低，這裡優先
       確保 Taipei 清楚可讀、不疊字。 */
    let rotY=5.355,rotX=0.3,time=0;

    // Fibonacci sphere
    const dots=[];
    const numDots=450;
    const DOT_ALPHA_SCALE=0.55;
    const LABEL_Z_RATIO=-0.25; // 只在據點 z < radius*LABEL_Z_RATIO（較正面）時才畫地名
    const LABEL_OFFSET=10; // 地名沿「球心→據點」方向外推的距離（px）
    const goldenRatio=(1+Math.sqrt(5))/2;
    for(let i=0;i<numDots;i++){
      const theta=(2*Math.PI*i)/goldenRatio;
      const phi=Math.acos(1-(2*(i+0.5))/numDots);
      const x=Math.cos(theta)*Math.sin(phi);
      const y=Math.cos(phi);
      const z=Math.sin(theta)*Math.sin(phi);
      dots.push([x,y,z]);
    }

    function draw(){
      const dpr=window.devicePixelRatio||1;
      const w=canvas.clientWidth;
      const h=canvas.clientHeight;
      canvas.width=w*dpr;
      canvas.height=h*dpr;
      ctx.scale(dpr,dpr);

      const cx=w/2;
      const cy=h/2;
      const radius=Math.min(w,h)*0.38;
      const fov=600;

      rotY+=autoRotateSpeed;

      time+=0.015;

      ctx.clearRect(0,0,w,h);

      // Outer glow
      const glowGrad=ctx.createRadialGradient(cx,cy,radius*0.8,cx,cy,radius*1.5);
      glowGrad.addColorStop(0,'rgba(60, 140, 255, 0.03)');
      glowGrad.addColorStop(1,'rgba(60, 140, 255, 0)');
      ctx.fillStyle=glowGrad;
      ctx.fillRect(0,0,w,h);

      // Globe outline
      ctx.beginPath();
      ctx.arc(cx,cy,radius,0,Math.PI*2);
      ctx.strokeStyle='rgba(100, 180, 255, 0.06)';
      ctx.lineWidth=1;
      ctx.stroke();

      const ry=rotY;
      const rx=rotX;

      // Draw dots
      for(let i=0;i<dots.length;i++){
        let [x,y,z]=dots[i];
        x*=radius;
        y*=radius;
        z*=radius;

        [x,y,z]=rotateX(x,y,z,rx);
        [x,y,z]=rotateY(x,y,z,ry);

        if(z>0)continue; // back-face cull

        const [sx,sy]=project(x,y,z,cx,cy,fov);
        const depthAlpha=Math.max(0.1,1-(z+radius)/(2*radius));
        const dotSize=1+depthAlpha*0.8;

        ctx.beginPath();
        ctx.arc(sx,sy,dotSize,0,Math.PI*2);
        ctx.fillStyle=dotColor.replace('ALPHA',(depthAlpha*DOT_ALPHA_SCALE).toFixed(2));
        ctx.fill();
      }

      // Draw connections as arcs
      for(const conn of connections){
        const [lat1,lng1]=conn.from;
        const [lat2,lng2]=conn.to;

        let [x1,y1,z1]=latLngToXYZ(lat1,lng1,radius);
        let [x2,y2,z2]=latLngToXYZ(lat2,lng2,radius);

        [x1,y1,z1]=rotateX(x1,y1,z1,rx);
        [x1,y1,z1]=rotateY(x1,y1,z1,ry);
        [x2,y2,z2]=rotateX(x2,y2,z2,rx);
        [x2,y2,z2]=rotateY(x2,y2,z2,ry);

        // Only draw if both points face camera
        if(z1>radius*0.3&&z2>radius*0.3)continue;

        const [sx1,sy1]=project(x1,y1,z1,cx,cy,fov);
        const [sx2,sy2]=project(x2,y2,z2,cx,cy,fov);

        // Elevated midpoint for arc
        const midX=(x1+x2)/2;
        const midY=(y1+y2)/2;
        const midZ=(z1+z2)/2;
        const midLen=Math.sqrt(midX*midX+midY*midY+midZ*midZ);
        const arcHeight=radius*1.25;
        const elevX=(midX/midLen)*arcHeight;
        const elevY=(midY/midLen)*arcHeight;
        const elevZ=(midZ/midLen)*arcHeight;
        const [scx,scy]=project(elevX,elevY,elevZ,cx,cy,fov);

        ctx.beginPath();
        ctx.moveTo(sx1,sy1);
        ctx.quadraticCurveTo(scx,scy,sx2,sy2);
        ctx.strokeStyle=arcColor;
        ctx.lineWidth=1.6;
        ctx.stroke();

        // Traveling dot along arc
        const t=(Math.sin(time*1.2+lat1*0.1)+1)/2;
        const tx=(1-t)*(1-t)*sx1+2*(1-t)*t*scx+t*t*sx2;
        const ty=(1-t)*(1-t)*sy1+2*(1-t)*t*scy+t*t*sy2;

        ctx.beginPath();
        ctx.arc(tx,ty,2,0,Math.PI*2);
        ctx.fillStyle=markerColor;
        ctx.fill();
      }

      // Draw markers
      for(const marker of markers){
        let [x,y,z]=latLngToXYZ(marker.lat,marker.lng,radius);
        [x,y,z]=rotateX(x,y,z,rx);
        [x,y,z]=rotateY(x,y,z,ry);

        if(z>radius*0.1)continue;

        const [sx,sy]=project(x,y,z,cx,cy,fov);

        // Pulse ring
        const pulse=Math.sin(time*2+marker.lat)*0.5+0.5;
        ctx.beginPath();
        ctx.arc(sx,sy,4+pulse*4,0,Math.PI*2);
        ctx.strokeStyle=markerColor.replace('1)',`${0.2+pulse*0.15})`);
        ctx.lineWidth=1;
        ctx.stroke();

        // Core dot
        ctx.beginPath();
        ctx.arc(sx,sy,2.5,0,Math.PI*2);
        ctx.fillStyle=markerColor;
        ctx.fill();

        /* Label：兩個問題各自處理。
           1) 球體持續自轉，任何據點遲早都會轉到畫布邊緣附近——地名固定畫在據點右邊時，
              轉到右半邊的據點文字會被畫布邊界切掉（例如 São Paulo）。改成沿著「球心→
              據點」的方向往外偏移（dirX/dirY），而不是固定往右：偏移方向本來就跟著據點
              在畫布上的實際位置走，天然不會往畫布外面長。
           2) 好幾個據點剛好轉到螢幕上彼此靠近時，地名會疊成一團看不清楚（例如 Delhi／
              London／Erbil／Moscow 同時擠在畫面中央下方）。這裡只在據點轉到球體「較正面」
              （z 夠負，離中心夠近）時才畫地名，其餘時候只留光點——同一時間會顯示地名的
              城市變少，擠在一起的機率也跟著降低；再加上①的方向偏移讓地名往各自不同方向
              散開，兩者一起處理，比只做其中一個更有效。
              代價：地名會隨球體轉動更明顯地淡入淡出，不是固定一直顯示。 */
        if(marker.label&&z<radius*LABEL_Z_RATIO){
          const dx=sx-cx,dy=sy-cy;
          const dist=Math.sqrt(dx*dx+dy*dy)||1;
          const dirX=dx/dist,dirY=dy/dist;
          const lx=sx+dirX*LABEL_OFFSET;
          const ly=sy+dirY*LABEL_OFFSET;
          ctx.font='600 11px system-ui, sans-serif';
          ctx.fillStyle=markerColor.replace('1)','0.9)');
          ctx.textAlign=dirX>=0?'right':'left';
          ctx.textBaseline='middle';
          ctx.fillText(marker.label,lx,ly);
          ctx.textAlign='left';
          ctx.textBaseline='alphabetic';
        }
      }
    }

    let raf=0;
    function loop(){draw();raf=requestAnimationFrame(loop);}
    raf=requestAnimationFrame(loop);

    return {destroy:function(){
      cancelAnimationFrame(raf);
      canvas.remove();
    }};
  }

  global.mountInteractiveGlobe=mountInteractiveGlobe;
})(window);
