(function(){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safe=path=>window.StudioAlbumData.localImage(path);
 const categories={
  research:{zone:'books',label:'教育经历',en:'EDUCATION',title:'教育经历',icon:'book-open',dockLines:['教育','经历'],divider:false},
  skills:{zone:'skills',label:'能力证书',en:'CAPABILITIES & CERTIFICATES',title:'能力 / 证书',icon:'ability',dockLines:['能力','证书'],divider:true},
  projects:{zone:'computer',label:'实习项目',en:'INTERNSHIPS & PROJECTS',title:'实习/项目',icon:'monitor',dockLines:['实习','项目'],divider:true},
  creative:{zone:'creative',label:'个人作品',en:'PERSONAL WORKS',title:'个人作品',icon:'pencil',dockLines:['个人','作品'],divider:false}
 };
 function icon(name){
  if(name==='ability')return '✧';
  const paths={
   monitor:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 21h8M12 16v5"/>',
   'book-open':'<path d="M12 5.5C9 3.5 5.5 3.5 2 4.5v15c3.5-1 7-1 10 1 3-2 6.5-2 10-1v-15c-3.5-1-7-1-10 1Zm0 0v15"/>',
   pencil:'<path d="m16 3 5 5L8 21H3v-5L16 3Zm-2 2 5 5M3 16l5 5"/>'
  };
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||''}</svg>`;
 }
 // Presentation-only adapter: keep renderer geometry, coordinates and event bindings intact.
 function applyRoomLabels(scene){
  for(const room of [scene,scene?.fallback].filter(Boolean))for(const c of Object.values(categories)){
   if(room.labels?.[c.zone])room.labels[c.zone]=[icon(c.icon),c.label];
   const button=room.layer?.querySelector(`.hotspot[data-zone="${c.zone}"]`);
   if(!button)continue;
   const symbol=button.querySelector('.hotspot-icon');
   if(symbol){symbol.innerHTML=icon(c.icon);symbol.dataset.icon=c.icon;symbol.setAttribute('aria-hidden','true');}
   button.lastElementChild.textContent=c.label;button.setAttribute('aria-label',c.label);
  }
 }
 // Fill only with confirmed public assets. No life-album data is used by this gallery.
 window.STUDIO_CONTENT_MEDIA=window.STUDIO_CONTENT_MEDIA||{projects:{},creative:{}};
 const media=(kind,i)=>window.STUDIO_CONTENT_MEDIA[kind]?.[i]||{};
 const items=kind=>kind==='creative'?window.STUDIO_PORTFOLIO.items:window.STUDIO_DATA[{projects:'projects',research:'research',creative:'creative'}[kind]]||[];
 const link=(kind,i)=>`#/${kind}/${kind[0]}${i+1}`;
 function cover(kind,i,large=false){const m=media(kind,i),path=safe(m.cover);return path?`<img class="content-cover" src="${esc(path)}" alt="${esc(items(kind)[i]?.title)}" loading="lazy">`:`<div class="content-placeholder ${large?'large':''}"><span aria-hidden="true">${kind==='projects'?'▣':'◇'}</span><small>${kind==='projects'?'项目截图待补充':'真实作品素材待补充'}</small></div>`;}
 const arrow='<span class="content-arrow" aria-hidden="true">↗</span>';
 function projects(){const data=window.STUDIO_PROJECTS;return '<p class="content-intro">点击下方卡片，查看具体经历与项目内容。</p><div class="experience-groups">'+data.groups.map(g=>'<section class="experience-group"><h3 class="micro-label">'+esc(g.title)+'</h3><div class="experience-cards">'+data.items.filter(p=>p.category===g.id).map(p=>'<a class="experience-card" href="#/projects/'+esc(p.id)+'"><span class="experience-role">'+esc(p.role)+'</span><h4>'+esc(p.title)+'</h4><time>'+esc(p.date)+'</time><p>'+esc(p.summary)+'</p><span class="text-link">查看详情 '+arrow+'</span></a>').join('')+'</div></section>').join('')+'</div>';}
 function projectDetail(id){const p=window.STUDIO_PROJECTS.items.find(p=>p.id===id),back='<a class="project-list-back" href="#/projects">← 返回项目列表</a>';if(!p)return back+'<h2>这份内容暂未找到</h2>';return '<article class="project-record">'+back+'<header><span class="micro-label">INTERNSHIPS &amp; PROJECTS</span><h2>'+esc(p.title)+'</h2><p class="experience-meta">'+esc(p.date)+'<br>'+esc(p.role)+(p.direction?' · '+esc(p.direction):'')+'</p></header>'+(p.background?'<section><h3>项目背景</h3><p>'+esc(p.background)+'</p></section>':'')+'<section><h3>'+esc(p.detailsTitle)+'</h3><ul>'+p.details.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></section><section><h3>核心能力</h3><p>'+esc(p.skills)+'</p></section>'+(p.outcome?'<section><h3>项目成果</h3><p>'+esc(p.outcome)+'</p></section>':'')+(p.studioLink?'<a class="text-link project-studio-link" href="#/">返回探索工作室 ↗</a>':'')+'</article>';}
 function research(){return `<div class="education-list">${window.STUDIO_DATA.education.map((e,i)=>`<article class="education-entry"><span class="micro-label">0${i+1} / ${esc(e.level)}</span><h3>${esc(e.title)}</h3><p class="education-meta">${esc(e.subtitle)}</p><p class="education-description">${esc(e.body)}</p></article>`).join('')}</div>`;}
 const capabilities={
  certificates:['IELTS 6.5','CET-6','CET-4'],
  abilities:['熟练使用 Word、Excel、PowerPoint','数据整理、台账维护与信息核验','材料撰写、文献检索与长文本处理','调研访谈、沟通协调与项目执行','熟练使用 ChatGPT、DeepSeek、Kimi 等 AI 工具','具备基础网页搭建及 3D 数字内容项目实践能力']
 };
 function skills(){return '<div class="capabilities-content"><section class="capabilities-section"><h3 class="micro-label">01 / 证书</h3><ul class="certificate-list">'+capabilities.certificates.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></section><hr class="capabilities-divider"><section class="capabilities-section"><h3 class="micro-label">02 / 能力</h3><ul class="capability-list">'+capabilities.abilities.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></section></div>';}
 function portfolioGallery(id,index=0,large=false){const p=window.STUDIO_PORTFOLIO.items.find(p=>p.id===id);if(!p)return '';const photos=p.images.filter(safe);index=Math.max(0,Math.min(index,photos.length-1));return '<div class="portfolio-gallery '+(large?'is-large ':'')+(p.screenshot?'is-screenshot':'')+'" data-series="'+esc(id)+'" data-index="'+index+'" tabindex="0" aria-label="'+esc(p.title)+'图集"><p class="portfolio-image-status" role="status" hidden></p><div class="portfolio-image-stage"><img class="portfolio-main-image" src="'+esc(photos[index])+'" alt="'+esc(p.title)+' '+(index+1)+'" decoding="async"></div><div class="portfolio-gallery-tools"><button type="button" data-gallery-step="-1" '+(photos.length<2?'disabled':'')+'>← 上一张</button><span class="portfolio-counter">'+(index+1)+' / '+photos.length+'</span><button type="button" data-gallery-step="1" '+(photos.length<2?'disabled':'')+'>下一张 →</button>'+(!large?'<button type="button" data-gallery-zoom>放大查看</button>':'')+'</div><div class="portfolio-thumbnails" aria-label="选择作品照片">'+photos.map((path,i)=>'<button type="button" data-gallery-index="'+i+'" aria-label="查看'+esc(p.title)+'第'+(i+1)+'张" aria-pressed="'+(i===index)+'"><img src="'+esc(path)+'" alt="" loading="lazy"></button>').join('')+'</div>'+(large?'<a class="text-link" href="#/creative">关闭图集，返回作品列表</a>':'')+'</div>';}
 function creative(){const data=window.STUDIO_PORTFOLIO;return '<div class="portfolio-groups">'+data.groups.map(g=>'<section class="portfolio-group"><h3 class="micro-label">'+esc(g.title)+'</h3><div class="portfolio-cards">'+data.items.filter(p=>p.category===g.id).map(p=>(p.displayOnly?'<article class="portfolio-card">':'<a class="portfolio-card" href="#/creative/'+esc(p.id)+'">')+'<img src="'+esc(safe(p.images[0]))+'" alt="'+esc(p.title)+'封面" loading="lazy"><h4>'+esc(p.title)+'</h4><p>'+esc(p.summary)+'</p>'+(p.displayOnly?'':'<span class="text-link">'+(p.images.length>1?'浏览图集':'查看作品')+' '+arrow+'</span>')+(p.displayOnly?'</article>':'</a>')).join('')+'</div></section>').join('')+'</div>';}
 function portfolioDetail(id){const p=window.STUDIO_PORTFOLIO.items.find(p=>p.id===id);if(!p)return '<h1>这份内容暂未找到</h1>';return '<header class="detail-heading"><span class="micro-label">'+esc(window.STUDIO_PORTFOLIO.groups.find(g=>g.id===p.category).title)+'</span><h1>'+esc(p.title)+'</h1><p>'+esc(p.summary)+'</p></header>'+portfolioGallery(id)+(p.studioLink?'<a class="plain-button portfolio-studio-link" href="#/">探索3D工作室 ↗</a>':'')+'<p><a class="text-link" href="#/creative">关闭详情，返回作品列表</a></p>';}
 function list(kind){return `<div class="content-heading"><span class="micro-label">${categories[kind].en}</span><h2>${categories[kind].title}</h2></div>`+({projects,research,skills,creative}[kind]||projects)();}
 function detail(kind,id){if(kind==='projects')return projectDetail(id);if(kind==='creative')return portfolioDetail(id);const index=Number(id?.slice(1))-1,p=items(kind)[index];if(!p||id!==kind[0]+(index+1))return '<h1>这份内容暂未找到</h1><p>可以返回列表继续浏览。</p>';
 let body='';
 if(kind==='research')body=`<section><h2>研究概述</h2><p>${esc(p.summary)}</p></section><section><h2>核心问题</h2><p>具体问题界定与章节结构待补充。</p></section><section><h2>史料与方法</h2><p>既有背景：中国近代史研究、中英文档案阅读。此条目的具体史料清单与方法说明待补充。</p></section><section><h2>研究进展及相关成果</h2><p>尚未提供具体进展或发表信息，不将该条目标记为已发表成果。</p></section>`;
 return `<header class="detail-heading"><span class="micro-label">${esc(p.type||categories[kind].en)}</span><h1>${esc(p.title)}</h1><p>${esc(p.summary)}</p></header>${body}`;}
 window.StudioContent={esc,categories,list,detail,link,icon,applyRoomLabels,portfolioGallery};
})();
