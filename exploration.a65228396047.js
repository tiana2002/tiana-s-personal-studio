(function(){
 'use strict';
 const D=window.STUDIO_EXPLORATION;
 const read=key=>{try{return sessionStorage.getItem(key);}catch{return null;}};
 const write=key=>{try{sessionStorage.setItem(key,'1');}catch{}};
 const icon=name=>{
  const paths={cat:'<path d="M4 10 3 3l6 4h6l6-4-1 7c3 12-19 12-16 0Z"/><path d="M8 12h.01M16 12h.01m-5 3h2m-8-1-4-1m4 4-4 1m18-4 4-1m-4 4 4 1"/>',photo:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l3 4h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',phone:'<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 5h4m-3 14h2"/>'};
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
 };
 window.createStudioExploration=function(hooks){
  const $=id=>document.getElementById(id),speech=$('guideSpeech'),message=$('guideSpeechText'),guide=$('explorationGuide'),canvas=$('avatarCanvas'),invitation=$('explorationInvitation'),slot=document.querySelector('.guide-speech-slot');
  let greeting=0,timer,fadeTimer,guideReturnView=null,welcomeShown=!!read('studio-guide-welcomed'),invitationDismissed=!!read('studio-invitation-dismissed'),hints=null;
  const aliases={album:'photo-frame',awards:'awards-folder'},oldKey={'photo-frame':'album','awards-folder':'awards'};
  const discovered=new Set(D.objects.filter(o=>read('studio-discovered-'+o.id)||(oldKey[o.id]&&read('studio-discovered-'+oldKey[o.id]))).map(o=>o.id));
  $('guideWelcomeText').textContent=D.welcome;
  $('guideObjects').innerHTML=D.objects.map(o=>`<li>${icon(o.icon)}<div><h3>${o.title}</h3><strong>${o.prompt}</strong><p>${o.description}</p></div></li>`).join('');
  $('invitationObjects').innerHTML=D.objects.map(o=>`<span title="${o.title}：${o.invite}">${icon(o.icon)}<span>${o.title}</span><small>${o.invite}</small></span>`).join('');
  const compact=matchMedia('(max-width:1000px)');
  function syncInvitation(){
   const home=!document.body.classList.contains('content-covered')&&guide.hidden;
   const permitted=!invitationDismissed&&home&&(!compact.matches||$('avatarPanel').getClientRects().length>0);
   invitation.hidden=!permitted||(compact.matches&&!speech.hidden);invitation.inert=!home;
   slot.classList.toggle('with-invitation',compact.matches&&!invitationDismissed);
  }
  function mountInvitation(){(compact.matches?slot:$('app')).append(invitation);syncInvitation();}
  compact.addEventListener('change',mountInvitation);
  function hideSpeech(){clearTimeout(timer);speech.classList.remove('visible');if(speech.contains(document.activeElement))canvas.focus({preventScroll:true});clearTimeout(fadeTimer);fadeTimer=setTimeout(()=>{speech.hidden=true;syncInvitation();},D.timing.fadeFor);}
  function speak(text,duration=D.timing.speechFor){clearTimeout(timer);clearTimeout(fadeTimer);message.textContent=text;speech.hidden=false;speech.classList.add('visible');syncInvitation();timer=setTimeout(hideSpeech,duration);}
  function ready(){if(welcomeShown||canvas.dataset.state!=='ready'||!canvas.dataset.renderedOutfit||!$('avatarPanel').getClientRects().length||$('avatarPanel').closest('[inert]'))return;welcomeShown=true;write('studio-guide-welcomed');speak(D.welcome,D.timing.welcomeFor);canvas.dataset.guideWelcomed='true';}
  $('closeGuideSpeech').addEventListener('click',hideSpeech);
  function closeGuide(restore=true){if(guide.hidden)return;guide.hidden=true;$('explorationGuideBtn').setAttribute('aria-expanded','false');if(guideReturnView&&restore)hooks.mobile(guideReturnView);guideReturnView=null;if(restore)$('explorationGuideBtn').focus({preventScroll:true});syncInvitation();}
  function openGuide(){
   hooks.closeContent();hideSpeech();
   if(matchMedia('(max-width:700px)').matches){guideReturnView=document.body.dataset.mobileView;hooks.mobile('studio');}
   guide.hidden=false;$('explorationGuideBtn').setAttribute('aria-expanded','true');$('closeExplorationGuide').focus({preventScroll:true});syncInvitation();
  }
  $('explorationGuideBtn').addEventListener('click',()=>guide.hidden?openGuide():closeGuide());
  $('closeExplorationGuide').addEventListener('click',()=>closeGuide());
  $('replayGuideWelcome').addEventListener('click',()=>{closeGuide();hooks.mobile('avatar');speak(D.welcome,D.timing.welcomeFor);});
  $('closeExplorationInvitation').addEventListener('click',()=>{invitationDismissed=true;write('studio-invitation-dismissed');syncInvitation();hints?.activity();});
  $('openInvitationGuide').addEventListener('click',openGuide);
  $('reopenExplorationInvitation').addEventListener('click',()=>{closeGuide();hooks.mobile('avatar');invitationDismissed=false;try{sessionStorage.removeItem('studio-invitation-dismissed');}catch{}syncInvitation();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!guide.hidden){e.preventDefault();e.stopImmediatePropagation();closeGuide();}},true);
  function saveDiscovered(id){discovered.add(id);write('studio-discovered-'+id);}
  function mark(id){id=aliases[id]||id;if(D.objects.some(o=>o.id===id))hints.mark(id);}
  hints=window.createDiscoveryHints({data:D,discovered,onDiscovered:saveDiscovered,isGuideOpen:()=>!guide.hidden});
  const readyObserver=new MutationObserver(ready);readyObserver.observe(canvas,{attributes:true,attributeFilter:['data-state','data-rendered-outfit']});
  const visibilityObserver=new MutationObserver(()=>{if(document.body.classList.contains('content-covered')){closeGuide(false);hideSpeech();}else ready();syncInvitation();});
  visibilityObserver.observe(document.body,{attributes:true,attributeFilter:['class','data-mobile-view']});
  const pointers=new Set();let press=null;
  canvas.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);if(pointers.size!==1){press=null;return;}press={id:e.pointerId,x:e.clientX,y:e.clientY,distance:0};},{capture:true});
  canvas.addEventListener('pointermove',e=>{if(press?.id===e.pointerId)press.distance=Math.max(press.distance,Math.hypot(e.clientX-press.x,e.clientY-press.y));},{capture:true});
  canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);press=null;},{capture:true});
  canvas.addEventListener('pointerup',e=>{
   pointers.delete(e.pointerId);const clicked=press?.id===e.pointerId&&press.distance<7&&(e.button===0||e.pointerType==='touch');press=null;if(!clicked)return;
   const viewer=hooks.avatar();if(!viewer?.root||canvas.dataset.state!=='ready')return;
   const rect=canvas.getBoundingClientRect(),ray=new viewer.T.Raycaster(),point=new viewer.T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
   ray.setFromCamera(point,viewer.camera);if(ray.intersectObject(viewer.root,true).length){hints.activity();speak(D.greetings[greeting++%D.greetings.length]);}
  },{capture:true});
  canvas.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&canvas.dataset.state==='ready'){e.preventDefault();speak(D.greetings[greeting++%D.greetings.length]);}});
  mountInvitation();ready();return {speak,ready,closeGuide,mark,updateHints:()=>hints.refresh(),outfit:id=>speak(D.outfits[id]||'换好新造型啦～')};
 };
})();
