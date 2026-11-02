(function(){
'use strict';
const data=window.STUDIO_DATA;
const panel=document.getElementById('detailPanel');
const panelContent=document.getElementById('panelContent');
const panelKicker=document.getElementById('panel-kicker');
const overlay=document.getElementById('overlay');
const modalTitle=document.getElementById('modalTitle');
const modalContent=document.getElementById('modalContent');
const dock=document.getElementById('dock');
const phoneOverlay=document.getElementById('phoneOverlay');
const phoneContent=document.getElementById('phoneContent');
const phoneShell=phoneOverlay.querySelector('.phone-shell');
let phoneReturnFocus=null,phoneBackground=[];
let scene=null,avatar=null,album=null,active=null,exploration=null;
let avatarStarts=0,roomStarts=0,avatarStarted=false,roomStarted=false,roomScheduled=false;
function publishUI(){let element=document.getElementById('uiRuntimeReport');if(!element){element=document.createElement('script');element.type='application/json';element.id='uiRuntimeReport';document.body.append(element);}element.textContent=JSON.stringify({avatarStarts,roomStarts,route:location.hash,roomView:scene?.target||null,resources:performance.getEntriesByType('resource').filter(r=>/^https?:/.test(r.name)).map(r=>({url:r.name,bytes:r.encodedBodySize})),avatar:document.getElementById('avatarCanvas').dataset.state,room:document.getElementById('glCanvas').dataset.furnitureReady});}
const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tags=(arr)=>`<div class="chips">${arr.map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div>`;
function speak(str){exploration?.speak(str)}
function openZone(id){ui.openZone(id)}
function closeZone(){ui.closeZone()}
function closeModal(){ui.closeModal()}
function openModal(title,html){ui.openModal(title,html)}
// Phone profile is entirely local and reads only the independent phone-data.js file.
function phoneMedia(path,alt,kind){
  const safe=typeof path==='string'&&/^\.\/assets\//.test(path)&&!path.includes('..');
  return `<div class="phone-media ${kind}"><span class="phone-media-placeholder"><span aria-hidden="true">${kind==='phone-avatar'?'✿':'◇'}</span><small>${kind==='phone-avatar'?'头像待添加':'封面待添加'}</small></span>${safe?`<img src="${esc(path)}" alt="${esc(alt)}" />`:''}</div>`;
}
function renderPhone(){
  const p=window.STUDIO_PHONE_DATA||{},works=Array.isArray(p.works)?p.works:[];
  const screenshot=window.StudioAlbumData.localImage(p.profileScreenshot);
  if(screenshot)return `<div class="phone-screenshot-view" tabindex="0" aria-label="抖音主页截图，可上下滚动"><h2 id="phoneTitle">抖音主页</h2><p class="phone-screenshot-note">主页截图 · 非实时数据</p><img class="phone-profile-screenshot" src="${esc(screenshot)}" alt="我的抖音个人主页完整截图" decoding="async"><p class="phone-screenshot-note">截图展示，可上下滚动查看。</p></div>`;
  let profileURL='';try{const url=new URL(p.profileURL);if(url.protocol==='https:'&&['www.douyin.com','douyin.com'].includes(url.hostname))profileURL=url.href;}catch{}
  const count=Number.isInteger(p.workCount)&&p.workCount>=0?String(p.workCount):'待补充';
  return `<div class="phone-cover"><span>DOUYIN / 创作日记</span><span aria-hidden="true">✦</span></div>
    <div class="phone-profile">${phoneMedia(p.avatar,'抖音主页头像','phone-avatar')}
    <span class="phone-platform">抖音个人主页</span><h2 id="phoneTitle">${esc(p.nickname||'昵称待填写')}</h2>
    <p class="phone-account">${esc(p.account||'抖音号待填写')}</p>
    <p class="phone-bio">${esc(p.bio||'账号简介待补充')}</p>
    <p id="phoneNotice" class="phone-notice">${p.isPlaceholder!==false?'占位预览 · 非真实账号资料':'个人主页展示 · 手动更新'}</p>
    <div class="phone-work-heading"><h3>作品 <span>${esc(count)}</span></h3><span>代表作品</span></div>
    <div class="phone-works">${works.map((w,i)=>`<figure class="phone-work">${phoneMedia(w.cover,w.title||'作品封面','phone-cover-image')}<figcaption><span class="phone-work-number">0${i+1}</span><strong>${esc(w.title||'作品待添加')}</strong><p>${esc(w.description||'作品简介待补充')}</p></figcaption></figure>`).join('')||'<p class="phone-empty">代表作品待添加</p>'}</div>
    ${profileURL?`<a class="phone-real-link" href="${esc(profileURL)}" target="_blank" rel="noopener noreferrer">前往真实抖音主页 ↗</a>`:'<p class="phone-notice">真实主页链接待提供</p>'}<p class="phone-local-note">这是工作室内的主页展示，内容由本人整理。</p></div>`;
}
function openPhone(){ui.openPhone()}
function closePhone(restore=true,returnFocus=true){ui.closePhone(restore,returnFocus)}
phoneContent.addEventListener('error',e=>{if(e.target.tagName==='IMG')e.target.hidden=true},true);
document.getElementById('closePhone').addEventListener('click',()=>closePhone());
phoneOverlay.addEventListener('click',e=>{if(e.target===phoneOverlay)closePhone()});
document.getElementById('phoneCreative').addEventListener('click',()=>{openZone('creative');document.getElementById('closePanel').focus({preventScroll:true})});
phoneShell.addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;
  const buttons=[...phoneShell.querySelectorAll('button')],first=buttons[0],last=buttons[buttons.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
function resumeHtml(){return window.StudioQuickResume.render()}
function contactHtml(){const c=data.contact||{};return `<p class="mini-body">欢迎交流研究、项目与创作。</p>${c.phone?`<div class="resume-block"><div class="resume-heading">PHONE / 电话</div><p class="mini-body"><a href="tel:${esc(c.phone.replace(/[^\d+]/g,''))}">${esc(c.phone)}</a></p></div>`:''}${c.email?`<div class="resume-block"><div class="resume-heading">EMAIL / 邮箱</div><p class="mini-body"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p></div>`:''}${c.social?`<div class="resume-block"><div class="resume-heading">SOCIAL / 公开账号</div><p class="mini-body">${esc(c.social)}</p></div>`:''}${!c.phone&&!c.email&&!c.social?`<div class="note">${esc(c.note||'公开联系方式待本人确认后补充。')}</div>`:''}`;}
function helpHtml(){return `<p class="mini-body">可以直接浏览内容，也可以在工作室里发现我的故事。</p><div class="resume-block">${[['探索房间','拖动旋转、滚轮缩放，也可以使用画面旁的＋、−和复位按钮。'],['认识人物','在人物区域拖动观察、滚轮缩放；四个按钮切换造型，再点已选造型可恢复日常穿搭。衣柜也能带你来换装。'],['浏览内容','家具图标悬停或聚焦时显示名称；点击一次打开内容。底部四项导航打开同一份内容。详情页支持返回列表和分享网址。'],['生活碎片','点击墙面相框浏览照片，左右方向键翻页，可展开照片总览；Esc关闭。'],['小小彩蛋','桌面手机展示创作主页；点击小猫会收到回应。'],['快速了解','右上角快速简历可直接打开，无需等待人物或房间加载。']].map(([a,b])=>`<div class="resume-item"><b style="min-width:76px">${a}</b><p style="margin:0">${b}</p></div>`).join('')}</div>`;}
// Cards are independent of the side-mounted avatar viewer.
panelContent.addEventListener('click',e=>{const card=e.target.closest('.project-card[role="button"]');if(card){card.classList.toggle('expanded');card.setAttribute('aria-expanded',card.classList.contains('expanded')?'true':'false')}});
panelContent.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.project-card[role="button"]')){e.preventDefault();e.target.click()}});
dock.addEventListener('click',e=>{const b=e.target.closest('button[data-target]');if(b)openZone(b.dataset.target)});
document.getElementById('closePanel').addEventListener('click',closeZone);document.getElementById('backRoom').addEventListener('click',closeZone);
document.getElementById('resumeBtn').addEventListener('click',()=>{openModal('快速简历',resumeHtml());modalContent.scrollTop=0;});
document.getElementById('contactBtn').addEventListener('click',()=>openModal('联系我',contactHtml()));
document.getElementById('aboutBtn').addEventListener('click',()=>openModal('玩法说明',helpHtml()));
document.getElementById('closeModal').addEventListener('click',closeModal);overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!phoneOverlay.hidden){closePhone();return}closeModal();closeZone()}});
modalContent.addEventListener('click',e=>{if(e.target.id==='printResume')window.print();if(e.target.id==='qrDetails'){closeModal();openZone('computer');}if(e.target.id==='goStudio'){closeModal();closeZone()}});
document.getElementById('zoomIn').addEventListener('click',()=>scene&&scene.changeZoom(1));
document.getElementById('zoomOut').addEventListener('click',()=>scene&&scene.changeZoom(-1));
document.getElementById('resetCamera').addEventListener('click',()=>{closeZone();scene&&scene.reset()});
function showMobileView(view){document.body.dataset.mobileView=view;document.getElementById('showAvatar').setAttribute('aria-pressed',String(view==='avatar'));document.getElementById('showStudio').setAttribute('aria-pressed',String(view==='studio'));if(view==='studio')startRoom();}
document.getElementById('showAvatar').addEventListener('click',()=>{closeZone();showMobileView('avatar')});
document.getElementById('showStudio').addEventListener('click',()=>{closeZone();showMobileView('studio')});
const avatarConfig=window.STUDIO_AVATAR_CONFIG;
const avatarButtonLabels={lolita:'洛丽塔',lady:'淑女裙',qipao:'旗袍',hanfu:'汉服'};
document.getElementById('avatarOutfits').innerHTML=Object.entries(avatarConfig.outfits).filter(([,item])=>item.selectable!==false).map(([id,item])=>`<button type="button" data-avatar-outfit="${esc(id)}" aria-pressed="${id===avatarConfig.defaultOutfit}" title="切换为${esc(item.label)}">${esc(avatarButtonLabels[id]||item.label)}</button>`).join('');
function syncOutfit({outfit,requested,state}){document.querySelectorAll('[data-avatar-outfit]').forEach(button=>{const selected=button.dataset.avatarOutfit===(outfit||avatarConfig.defaultOutfit);button.setAttribute('aria-pressed',String(selected));button.title=selected?'再次点击，恢复日常穿搭':'切换为'+avatarConfig.outfits[button.dataset.avatarOutfit].label;button.toggleAttribute('data-loading',state==='loading'&&button.dataset.avatarOutfit===requested);});}
document.getElementById('avatarOutfits').addEventListener('click',async e=>{const button=e.target.closest('[data-avatar-outfit]');if(!button||!avatar)return;const outfit=button.getAttribute('aria-pressed')==='true'?avatarConfig.defaultOutfit:button.dataset.avatarOutfit;try{const applied=await avatar.setOutfit(outfit);if(applied)exploration?.outfit(outfit)}catch(error){console.warn('Avatar outfit could not load:',error.message)}});
for(const [id,action] of [['avatarZoomIn',()=>avatar&&avatar.zoom(1)],['avatarZoomOut',()=>avatar&&avatar.zoom(-1)],['avatarReset',()=>avatar&&avatar.reset()]])document.getElementById(id).addEventListener('click',action);

const awards=window.createAwardsArchive({navigate:path=>ui.navigate(path)});
const ui=window.createStudioUI({scene:()=>scene,album:()=>album,awards:()=>awards,discovered:id=>{if(id==='awards')exploration?.mark('awards');else if(id.startsWith('album:'))exploration?.mark('album');else if(id==='phone')exploration?.mark('phone');},mobile:showMobileView,speak,phone:renderPhone,snapshot:publishUI,resumeEngines:startEnginesForHome});
album=new window.StudioAlbum(null,()=>{closePhone(false,false);closeModal();ui.navigate('');});
album.onClose=()=>ui.gate();
exploration=window.createStudioExploration({avatar:()=>avatar,mobile:showMobileView,closeContent:()=>ui.prepareExploration()});
function startAvatar(){
 avatar?.destroy();avatarStarted=true;avatarStarts++;ui.loading('avatar','loading');
 avatar=new window.StudioAvatar(document.getElementById('avatarCanvas'),{status:document.getElementById('avatarStatus'),note:document.getElementById('avatarModelNote'),onChange:state=>{syncOutfit(state);if(state.state==='error')ui.loading('avatar','error');else if(state.state==='ready')ui.loading('avatar','ready');}});
 window.STUDIO_AVATAR_VIEWER=avatar;avatar.ready.then(()=>{ui.loading('avatar','ready');publishUI();},()=>ui.loading('avatar','error'));return avatar.ready;
}
function startRoom(){
 if(roomStarted)return;roomStarted=true;roomStarts++;ui.loading('room','loading');
 try{scene=window.createStudioRoom(document.getElementById('glCanvas'),document.getElementById('hotspots'),openZone);window.StudioContent.applyRoomLabels(scene);window.STUDIO_ROOM=scene;album.scene=scene;
 Promise.resolve(scene.ready).then(()=>{const canvas=document.getElementById('glCanvas'),failed=['unavailable','native-fallback'].includes(canvas.dataset.renderer)||canvas.dataset.furnitureReady==='partial';ui.loading('room',failed?'error':'ready');ui.showHint();window.StudioContent.applyRoomLabels(scene);document.querySelectorAll('.hotspot').forEach(button=>button.setAttribute('aria-label',button.lastElementChild?.textContent||button.textContent.trim()));publishUI();},()=>ui.loading('room','error'));
 }catch(error){ui.loading('room','error');}
}
document.getElementById('avatarRetry').addEventListener('click',()=>{if(avatar?.renderer){ui.loading('avatar','loading');avatar.setOutfit(avatar.requested||avatarConfig.defaultOutfit).then(ok=>ui.loading('avatar',ok?'ready':'error'));}else startAvatar();});
document.getElementById('roomRetry').addEventListener('click',()=>{scene?.destroy();document.getElementById('hotspots').replaceChildren();const old=document.getElementById('glCanvas'),fresh=old.cloneNode(false);old.replaceWith(fresh);roomStarted=false;startRoom();});
function startEnginesForHome(){
 if(document.body.classList.contains('detail-open')||!overlay.hidden)return;
 if(!avatarStarted)startAvatar();
 if(!matchMedia('(max-width:700px)').matches&&!roomStarted&&!roomScheduled){roomScheduled=true;Promise.race([avatar.ready.catch(()=>{}),new Promise(resolve=>setTimeout(resolve,1800))]).then(()=>{roomScheduled=false;if(!matchMedia('(max-width:700px)').matches&&!document.body.classList.contains('detail-open'))startRoom();});}
 else if(!roomStarted)document.getElementById('roomLoad').hidden=true;
}
window.addEventListener('hashchange',startEnginesForHome);matchMedia('(max-width:700px)').addEventListener('change',startEnginesForHome);startEnginesForHome();
})();
