/* ShapingOrb — vanilla-JS port of thinking-orbs' "shaping" canvas animation
   (dotted outline morphing circle → triangle → square), ported line-for-line
   from the React source (see ShapingOrb.tsx in the thinking-orbs package)
   since this project has no bundler/React runtime — same drawing math,
   driven imperatively via mountShapingOrb() instead of hooks.
   Theme is fixed to light (this site has no dark mode), unlike the
   original's auto dark-mode detection — that path is dropped, not ported. */
(function(global){
  function smoothE(x){return x*x*(3-2*x);}
  function polyPath(verts){
    const V=verts.length;const L=[];let total=0;
    for(let i=0;i<V;i++){const a=verts[i],b=verts[(i+1)%V];
      const l=Math.hypot(b[0]-a[0],b[1]-a[1]);L.push(l);total+=l;}
    return function(f){
      let target=f*total,i=0;
      while(target>L[i]&&i<V-1){target-=L[i];i++;}
      const a=verts[i],b=verts[(i+1)%V];
      const ff=L[i]?Math.min(1,target/L[i]):0;
      return [a[0]+(b[0]-a[0])*ff,a[1]+(b[1]-a[1])*ff];
    };
  }
  const CIRCLE=function(f){const a=-Math.PI/2+f*2*Math.PI;return [Math.cos(a)*0.24,Math.sin(a)*0.24];};
  const TRIANGLE=polyPath([[0.0,-0.26],[0.24,0.16],[-0.24,0.16]]);
  const SQUARE=polyPath([[0,-0.2],[0.2,-0.2],[0.2,0.2],[-0.2,0.2],[-0.2,-0.2]]);
  const CYCLE=[CIRCLE,TRIANGLE,SQUARE];
  function morphN(d){return Math.max(6,Math.round(34*d));}
  const HOLD=1.4,MORPH=0.9,SEG=HOLD+MORPH;

  function parseColor(color){
    if(!color)return undefined;
    const m=/^#?([0-9a-f]{6})$/i.exec(color.trim());
    if(!m)return undefined;
    const n=parseInt(m[1],16);
    return [(n>>16)&255,(n>>8)&255,n&255];
  }

  function drawShaping(ctx,size,t,ink,rDot,iconD,spread,rMin){
    const K=CYCLE.length;
    const tc=t%(SEG*K);
    const k=Math.floor(tc/SEG);
    const local=tc-k*SEG;
    const m=local>HOLD?smoothE((local-HOLD)/MORPH):0;
    const pA=CYCLE[k],pB=CYCLE[(k+1)%K];
    const M=160,pts=[];
    for(let i=0;i<M;i++){const f=i/M,a=pA(f),b=pB(f);
      pts.push([(a[0]+(b[0]-a[0])*m)*spread,(a[1]+(b[1]-a[1])*m)*spread]);}
    const L=[];let total=0;
    for(let i=0;i<M;i++){const a=pts[i],b=pts[(i+1)%M];
      const l=Math.hypot(b[0]-a[0],b[1]-a[1]);L.push(l);total+=l;}
    const n=morphN(iconD);
    const re=rDot*1.35*spread;
    const pulse=1+0.02*Math.sin(local*3.1);
    const c2=size/2;let seg=0,acc=0;
    const bg=[255,255,255];
    for(let k2=0;k2<n;k2++){
      const target=(k2/n)*total;
      while(acc+L[seg]<target&&seg<M-1){acc+=L[seg];seg++;}
      const a=pts[seg],b=pts[(seg+1)%M];
      const f=L[seg]?Math.min(1,(target-acc)/L[seg]):0;
      const x=(a[0]+(b[0]-a[0])*f)*pulse;
      const y=(a[1]+(b[1]-a[1])*f)*pulse;
      const px=c2+x*size,py=c2+y*size;
      const r=Math.max(0.35,re*size);
      const w=0.1;
      let rr,gg,bb;
      if(ink){rr=Math.round(ink[0]*(1-w)+bg[0]*w);gg=Math.round(ink[1]*(1-w)+bg[1]*w);bb=Math.round(ink[2]*(1-w)+bg[2]*w);}
      else{const v=Math.round(w*255);rr=gg=bb=v;}
      ctx.fillStyle='rgb('+rr+','+gg+','+bb+')';
      ctx.beginPath();
      ctx.arc(px,py,Math.max(rMin,r),0,Math.PI*2);
      ctx.fill();
    }
  }

  /* opts: {size=64, speed=1, color} → returns {destroy()} to stop the rAF
     loop and remove the canvas (call when the host node is discarded). */
  function mountShapingOrb(container,opts){
    opts=opts||{};
    const size=opts.size||64,speed=opts.speed||1;
    const ink=parseColor(opts.color);
    const canvas=document.createElement('canvas');
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Shaping…');
    canvas.style.width=size+'px';canvas.style.height=size+'px';canvas.style.display='block';
    container.appendChild(canvas);
    const dpr=Math.min(2,(typeof devicePixelRatio!=='undefined'&&devicePixelRatio)||1);
    canvas.width=Math.round(size*dpr);canvas.height=Math.round(size*dpr);
    const ctx=canvas.getContext('2d');
    if(!ctx)return {destroy:function(){canvas.remove();}};
    const rDot=0.0083*(opts.dotScale||1),iconD=0.54*(opts.density||1),spread=1.45,rMin=0.25;
    const frame=function(tSec){
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size,size);
      drawShaping(ctx,size,tSec,ink,rDot,iconD,spread,rMin);
    };
    const reduced=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){frame(0.6);return {destroy:function(){canvas.remove();}};}
    let raf=0,running=false;
    const loop=function(){frame((performance.now()/1000)*speed);if(running)raf=requestAnimationFrame(loop);};
    const start=function(){if(running)return;running=true;raf=requestAnimationFrame(loop);};
    const stop=function(){running=false;cancelAnimationFrame(raf);};
    frame((performance.now()/1000)*speed);
    let visible=true;
    const io=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(function(entries){
      visible=entries[0].isIntersecting;
      if(visible&&document.visibilityState!=='hidden')start();else stop();
    }):null;
    if(io)io.observe(canvas);
    const onVis=function(){if(document.visibilityState==='hidden')stop();else if(visible)start();};
    document.addEventListener('visibilitychange',onVis);
    if(!io)start();
    return {destroy:function(){
      stop();
      if(io)io.disconnect();
      document.removeEventListener('visibilitychange',onVis);
      canvas.remove();
    }};
  }

  global.mountShapingOrb=mountShapingOrb;
})(window);
