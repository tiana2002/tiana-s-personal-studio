(function(){
 'use strict';
 window.createStudioUI=function(hooks){
  const $=id=>document.getElementById(id),C=window.StudioContent,cats=C.categories;
  const panel=$('detailPanel'),content=$('panelContent'),detail=$('contentDetail'),modal=$('overlay'),phone=$('phoneOverlay');
  let portfolioModalOpen=false;
  let category=null,routeKey='',trigger=null,modalTrigger=null,phoneTrigger=null,restoreImageRoute=false;
  const scrolls={},selected={};
  document.querySelector('.main').append(panel);panel.inert=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.tabIndex=-1;
  const room=()=>hooks.scene(),album=()=>hooks.album();
  const awards=()=>hooks.awards?.();
  const photoOpen=()=>!$('albumOverlay').hidden;
  function focusReturn(element){const target=element?.isConnected&&element.getClientRects().length&&getComputedStyle(element).visibility==='visible'?element:$('resumeBtn');target.focus({preventScroll:true});}
  function camera(){document.body.dataset.uiRoomView=JSON.stringify(room()?.target||null);}
  function gate(){
   const blocking=!modal.hidden||!phone.hidden||photoOpen()||!!awards()?.isOpen(),covered=panel.classList.contains('open')||!detail.hidden||blocking;
   $('stage').inert=covered;document.querySelector('.scene-tools').inert=covered;
   document.body.classList.toggle('content-covered',covered);
   document.querySelector('.main').inert=blocking;
   for(const el of document.querySelectorAll('.header,.mobile-switch,#dock,.bottom-caption'))el.inert=blocking;
   panel.inert=!panel.classList.contains('open')||blocking;detail.inert=blocking;
   document.body.classList.toggle('modal-open',!modal.hidden);
   hooks.snapshot?.();
  }
  function saveScroll(){if(category&&panel.classList.contains('open')&&!content.dataset.projectDetail)scrolls[category]=content.scrollTop;}
  function hidePanel(){saveScroll();panel.classList.remove('open');panel.setAttribute('aria-hidden','true');document.body.classList.remove('panel-open');panel.inert=true;}
  function hideDetail(){detail.hidden=true;document.body.classList.remove('detail-open');}
  function resetRoute(){history.replaceState(null,'',location.pathname+location.search+'#/');routeKey='';hidePanel();hideDetail();category=null;$('avatarPanel').classList.remove('wardrobe-active');sync();}
  function sync(){
   document.querySelectorAll('#dock [data-target]').forEach(b=>{const on=cats[category]?.zone===b.dataset.target;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
   document.querySelectorAll('.hotspot').forEach(b=>b.classList.toggle('active',cats[category]?.zone===b.dataset.zone));
   $('drawerTabs').innerHTML=Object.entries(cats).map(([key,c])=>`<a href="#/${key}" ${category===key?'aria-current="page"':''}>${c.label}</a>`).join('');
  }
  function navigate(path){if(location.hash==='#/'+path)render();else location.hash='/'+path;}
  function closeSpecial(){
   portfolioModalOpen=false;
   awards()?.hide();
   if(album()&&!$('albumOverlay').hidden)album().close(true,false);
   phone.hidden=true;document.body.classList.remove('phone-open');modal.hidden=true;restoreImageRoute=false;
  }
  function render(){
   const previousRoute=routeKey;saveScroll();closeSpecial();hidePanel();hideDetail();$('avatarPanel').classList.remove('wardrobe-active');const parts=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean),kind=parts[0],id=parts[1];
   if(kind==='awards'){category=null;routeKey=parts.join('/');awards()?.open(id);sync();gate();camera();document.body.dataset.uiRoute=routeKey;return;}
   if(!cats[kind]){category=null;routeKey='';sync();gate();camera();document.body.dataset.uiRoute='home';if(trigger||previousRoute)focusReturn(trigger);return;}
   category=kind;routeKey=parts.join('/');
   if(id&&kind!=='skills'&&kind!=='projects'){
    selected[kind]=id;$('detailBack').href='#/'+kind;$('detailBack').textContent='← 返回'+cats[kind].label;$('detailBack').setAttribute('aria-label','返回'+cats[kind].label);detail.setAttribute('aria-label',cats[kind].label+'详情');$('detailArticle').innerHTML=C.detail(kind,id);detail.hidden=false;document.body.classList.add('detail-open');detail.scrollTop=0;gate();$('detailBack').focus({preventScroll:true});
   }else{
   $('panel-kicker').textContent='STUDIO ARCHIVE';panel.setAttribute('aria-label',cats[kind].label+'预览');const projectDetail=kind==='projects'&&!!id;content.dataset.projectDetail=projectDetail?id:'';content.innerHTML=projectDetail?C.detail(kind,id):C.list(kind);
    panel.classList.add('open');panel.setAttribute('aria-hidden','false');document.body.classList.add('panel-open');gate();content.scrollTop=projectDetail?0:scrolls[kind]||0;
    if(projectDetail)selected[kind]=id;
    const previous=!projectDetail&&selected[kind]?content.querySelector(`a[href="#/${kind}/${selected[kind]}"]`):null;
    (projectDetail?content.querySelector('.project-list-back'):(previous||$('closePanel'))).focus({preventScroll:true});
   }
   sync();camera();document.body.dataset.uiRoute=routeKey;
  }
  function openZone(id){
   dismissHint();trigger=document.activeElement;
   hooks.discovered?.(id);
   if(id.startsWith('album:')){closeSpecial();resetRoute();gate();album()?.open(Number(id.split(':')[1]));gate();return;}
   if(id==='phone'){openPhone();return;}
   if(id==='wardrobe'){closeSpecial();resetRoute();gate();hooks.mobile('avatar');$('avatarPanel').classList.add('wardrobe-active');(document.querySelector('[data-avatar-outfit][aria-pressed="true"]')||document.querySelector('[data-avatar-outfit]'))?.focus({preventScroll:true});hooks.speak('选择一套穿搭，再次点击可恢复日常穿搭。');return;}
   const kind=Object.keys(cats).find(k=>cats[k].zone===id)||(id==='awards'?'awards':null);if(kind)navigate(kind);
  }
  function closeZone(){if(panel.classList.contains('open')||!detail.hidden||awards()?.isOpen()){navigate('');}else{gate();} $('avatarPanel').classList.remove('wardrobe-active');}
  function prepareExploration(){closeSpecial();resetRoute();gate();}
  function closeModal(){if(modal.hidden)return;const backToPortfolio=portfolioModalOpen;portfolioModalOpen=false;modal.hidden=true;gate();hooks.resumeEngines?.();if(backToPortfolio)navigate('creative');else focusReturn(modalTrigger);restoreImageRoute=false;}
  function openModal(title,html,preserveRoute=false){
   modalTrigger=document.activeElement;closeSpecial();restoreImageRoute=preserveRoute;if(!preserveRoute)resetRoute();
   $('modalTitle').textContent=title;$('modalContent').innerHTML=html;modal.hidden=false;gate();$('closeModal').focus({preventScroll:true});
  }
  function openPhone(){
   phoneTrigger=document.activeElement;closeSpecial();resetRoute();$('phoneContent').innerHTML=hooks.phone();$('phoneContent').scrollTop=0;phone.hidden=false;document.body.classList.add('phone-open');gate();$('closePhone').focus({preventScroll:true});
  }
  function closePhone(restore=true,returnFocus=true){if(phone.hidden)return;phone.hidden=true;document.body.classList.remove('phone-open');gate();if(returnFocus)focusReturn(phoneTrigger);}
  function dismissHint(){ $('studioHint').hidden=true;try{localStorage.setItem('studio-hint-dismissed','1');}catch{} }
  function showHint(){let seen=false;try{seen=localStorage.getItem('studio-hint-dismissed')==='1';}catch{}if(!seen)$('studioHint').hidden=false;}
  $('dismissHint').addEventListener('click',dismissHint);$('stage').addEventListener('pointerup',dismissHint);$('stage').addEventListener('wheel',dismissHint,{once:true});
  $('detailStudio').addEventListener('click',()=>navigate(''));
  for(const box of [content,$('detailArticle')])box.addEventListener('click',e=>{const zoom=e.target.closest('[data-gallery-zoom]');if(zoom){const gallery=zoom.closest('.portfolio-gallery');openModal('作品大图',C.portfolioGallery(gallery.dataset.series,Number(gallery.dataset.index)||0,true),true);portfolioModalOpen=true;return;}const image=e.target.closest('.creative-image');if(image){const path=window.StudioAlbumData.localImage(image.dataset.image);if(path)openModal(image.dataset.title,`<img class="creative-full-image" src="${C.esc(path)}" alt="${C.esc(image.dataset.title)}">`,true);}});
  document.addEventListener('keydown',e=>{
   if(photoOpen())return;
   const current=awards()?.isOpen()?awards().element:!modal.hidden?modal.querySelector('.modal'):!phone.hidden?phone.querySelector('.phone-shell'):!detail.hidden?detail:panel.classList.contains('open')?panel:null;
   if(!current)return;
   if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(awards()?.isOpen()&&awards().escape())return;if(!modal.hidden)closeModal();else if(!phone.hidden)closePhone();else closeZone();}
   if(e.key==='Tab'){const controls=[...current.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"],summary')].filter(e=>e.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  },true);
  window.addEventListener('hashchange',render);
  const observer=new MutationObserver(gate);observer.observe($('albumOverlay'),{attributes:true,attributeFilter:['hidden']});
  function loading(kind,state){const box=$(kind+'Load'),text=$(kind+'LoadText');box.hidden=state==='ready';box.dataset.state=state;text.textContent=state==='error'?(kind==='avatar'?'人物暂未加载，可重试或继续浏览内容。':'工作室暂未加载，文字内容仍可浏览。'):(kind==='avatar'?'正在打开人物…':'正在布置工作室…');$(kind+'Retry').hidden=state!=='error';}
  render();return{openZone,closeZone,openModal,closeModal,openPhone,closePhone,gate,showHint,dismissHint,loading,navigate,prepareExploration};
 };
})();
