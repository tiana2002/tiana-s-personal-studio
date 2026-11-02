(function(){
 'use strict';
 window.createDiscoveryHints=function({data,discovered,onDiscovered,isGuideOpen}){
  const stage=document.getElementById('stage'),layer=document.getElementById('hotspots'),bubble=document.getElementById('discoveryPrompt');
  const scheduler=new window.DiscoveryScheduler(data.objects.map(o=>o.id),data.timing,discovered);
  let timer,frame,activeTarget=null,activeId=null,pointers=new Set(),preview=null,lastPointerMove=-Infinity,restoringFocus=false;
  const report=document.createElement('script');report.type='application/json';report.id='discoveryReport';document.body.append(report);
  const now=()=>performance.now();
  const getObject=id=>data.objects.find(o=>o.id===id);
  function region(){const r=stage.getBoundingClientRect();return {left:Math.max(0,r.left),right:Math.min(innerWidth,r.right),top:Math.max(0,r.top),bottom:Math.min(innerHeight,r.bottom)};}
  function targetVisible(button){if(!button||button.hidden||!button.getClientRects().length||getComputedStyle(button).display==='none')return false;const r=button.getBoundingClientRect(),clip=region();return r.width>0&&r.height>0&&r.left+r.width/2>clip.left&&r.left+r.width/2<clip.right&&r.top+r.height/2>clip.top&&r.top+r.height/2<clip.bottom;}
  function targetFor(id){return [...layer.querySelectorAll(getObject(id).selector)].find(targetVisible);}
  function available(){return data.objects.filter(o=>targetFor(o.id)).map(o=>o.id);}
  function blocked(){return document.hidden||document.body.classList.contains('content-covered')||!stage.getClientRects().length||document.getElementById('glCanvas').dataset.furnitureReady!=='true'||document.getElementById('avatarCanvas').dataset.state==='loading'||isGuideOpen()||pointers.size>0;}
  function publish(){const time=now(),due=preview?.until??scheduler.due();report.textContent=JSON.stringify({started:scheduler.started,startedAt:scheduler.startedAt,paused:scheduler.paused,complete:scheduler.complete(),active:activeId,mode:preview?'preview':'automatic',seen:[...scheduler.seen],nextAt:scheduler.nextAt,until:scheduler.until,sampledAt:time,wallDue:due==null?null:Date.now()+due-time,timing:data.timing,history:scheduler.history,available:available()});}
  const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.right)-Math.max(a.x,b.left))*Math.max(0,Math.min(a.y+a.h,b.bottom)-Math.max(a.y,b.top));
  function place(){
   if(!activeTarget||bubble.hidden)return;
   if(!targetVisible(activeTarget)){preview=null;scheduler.activity(now());refresh();return;}
   const r=activeTarget.getBoundingClientRect(),clip=region(),stageRect=stage.getBoundingClientRect(),w=bubble.offsetWidth,h=bubble.offsetHeight,gap=10;
   const candidates=[{x:r.left+(r.width-w)/2,y:r.top-h-gap},{x:r.right+gap,y:r.top+(r.height-h)/2},{x:r.left-w-gap,y:r.top+(r.height-h)/2},{x:r.left+(r.width-w)/2,y:r.bottom+gap}];
   if(activeId==='photo-frame')candidates.unshift(candidates.splice(2,1)[0]);
   const obstacles=[...layer.querySelectorAll('button:not([hidden])')].filter(e=>e!==activeTarget&&targetVisible(e)).map(e=>e.getBoundingClientRect());
   let best=null;
   for(const [index,c] of candidates.entries()){
    const p={x:Math.max(clip.left+6,Math.min(c.x,clip.right-w-6)),y:Math.max(clip.top+6,Math.min(c.y,clip.bottom-h-6)),w,h};
    const score=overlap(p,r)*10+obstacles.reduce((sum,b)=>sum+overlap(p,b),0)+Math.hypot(p.x-c.x,p.y-c.y)+index;
    if(!best||score<best.score)best={...p,score};
   }
   Object.assign(bubble.style,{left:best.x-stageRect.left+'px',top:best.y-stageRect.top+'px'});
  }
  const positionObserver=new MutationObserver(()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=null;place();});});
  function show(id){
   const button=id?targetFor(id):null;
   if(id===activeId&&button===activeTarget)return;
   const previous=activeTarget,returnFocus=document.activeElement===bubble;
   positionObserver.disconnect();cancelAnimationFrame(frame);frame=null;activeTarget?.classList.remove('hint-active');activeTarget=null;activeId=null;bubble.hidden=true;
   if(!button){if(returnFocus&&previous?.isConnected&&targetVisible(previous)&&!blocked()){restoringFocus=true;previous.focus({preventScroll:true});restoringFocus=false;}return;}
   activeTarget=button;activeId=id;button.classList.add('hint-active');bubble.dataset.object=id;bubble.textContent=getObject(id).hint;bubble.setAttribute('aria-label',getObject(id).title+'，'+getObject(id).hint);bubble.hidden=false;
   positionObserver.observe(button,{attributes:true,attributeFilter:['style','hidden','class']});place();
  }
  function refresh(){
   clearTimeout(timer);const time=now(),ready=document.getElementById('glCanvas').dataset.furnitureReady==='true',paused=blocked();
   if(ready&&!scheduler.started&&!paused){scheduler.paused=false;scheduler.start(time);}
   scheduler.pause(paused,time);
   if(paused){preview=null;show(null);publish();return;}
   if(preview&&time>=preview.until){preview=null;scheduler.activity(time);}
   if(preview){show(preview.id);publish();timer=setTimeout(refresh,Math.max(1,preview.until-time));return;}
   scheduler.tick(time,available());show(scheduler.active);publish();const due=scheduler.due();if(due!=null)timer=setTimeout(refresh,Math.max(1,due-time));
  }
  function activity(){preview=null;scheduler.activity(now());refresh();}
  function mark(id){scheduler.mark(id,now());preview=null;onDiscovered(id);refresh();}
  function attach(){
   for(const o of data.objects)for(const button of layer.querySelectorAll(o.selector)){
    if(button.dataset.cycleBound)continue;button.dataset.cycleBound='true';
    button.addEventListener('click',()=>{if(o.id!=='cat'||!button.querySelector('.cat-bubble')?.hidden)mark(o.id);});
    const previewHint=()=>{if(restoringFocus||blocked()||scheduler.seen.has(o.id))return;preview={id:o.id,until:now()+data.timing.previewFor};scheduler.activity(now());refresh();};
    button.addEventListener('pointerenter',()=>{if(now()-lastPointerMove<data.timing.pointerRecent)previewHint();});
    button.addEventListener('focus',()=>{if(button.matches(':focus-visible'))previewHint();});
   }
   refresh();
  }
  bubble.addEventListener('click',e=>{e.stopPropagation();const button=activeTarget;if(button)button.click();});
  for(const event of ['pointerdown','pointerup'])bubble.addEventListener(event,e=>e.stopPropagation());
  stage.addEventListener('pointermove',()=>lastPointerMove=now(),{passive:true});
  for(const region of [stage,document.getElementById('avatarPanel'),document.querySelector('.scene-tools')]){
   region.addEventListener('pointerdown',e=>{if(e.target.closest('#discoveryPrompt'))return;pointers.add(e.pointerId);activity();},{capture:true,passive:true});
   region.addEventListener('wheel',activity,{passive:true});
   region.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home','Enter',' '].includes(e.key))activity();});
  }
  for(const event of ['pointerup','pointercancel'])document.addEventListener(event,e=>{if(pointers.delete(e.pointerId))activity();},{capture:true,passive:true});
  document.addEventListener('visibilitychange',refresh);
  new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['class','data-mobile-view']});
  const roomObserver=new MutationObserver(refresh);let observedRoomCanvas=null;
  function bindRoomCanvas(){const current=document.getElementById('glCanvas');if(current===observedRoomCanvas)return;roomObserver.disconnect();observedRoomCanvas=current;if(current)roomObserver.observe(current,{attributes:true,attributeFilter:['data-furniture-ready']});}
  bindRoomCanvas();new MutationObserver(()=>{bindRoomCanvas();refresh();}).observe(stage,{childList:true});
  new MutationObserver(refresh).observe(document.getElementById('avatarCanvas'),{attributes:true,attributeFilter:['data-state']});
  new MutationObserver(refresh).observe(document.getElementById('explorationGuide'),{attributes:true,attributeFilter:['hidden']});
  new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&n.matches?.('button'))))attach();}).observe(layer,{childList:true});
  window.addEventListener('resize',()=>{place();refresh();});
  attach();return {mark,activity,refresh};
 };
})();
