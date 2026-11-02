(function(){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bullet=items=>'<ul>'+items.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>';
 const section=(id,title,body)=>'<section class="qr-section" data-section="'+id+'"><h2>'+title+'</h2>'+body+'</section>';
 function experience(items){return items.map(p=>'<article class="qr-entry"><header><h3>'+esc(p.title)+'</h3><p class="qr-meta">'+[p.role,p.date].filter(Boolean).map(esc).join('｜')+'</p></header>'+bullet(p.details)+(p.digital?'<button type="button" id="goStudio" class="qr-work-link qr-screen-only">查看数字作品 ↗</button>':'')+'</article>').join('');}
 function render(){
  const d=window.STUDIO_QUICK_RESUME,c=d.contact||{},phone=String(c.phone||'').trim(),email=String(c.email||'').trim();
  const personalContact='<div class="qr-personal-row"><span class="qr-birth">生日：'+esc(d.personalInfo.birth)+'</span>'+(phone?'<a class="qr-phone" href="tel:'+esc(phone.replace(/[^\d+]/g,''))+'">电话：'+esc(phone)+'</a>':'')+'</div>'+(email?'<p class="qr-email"><a href="mailto:'+esc(email)+'">电子邮箱：'+esc(email)+'</a></p>':'');
  return '<article id="quickResume" class="quick-resume"><div class="qr-tools qr-screen-only"><button type="button" id="printResume">打印 / 保存PDF</button><button type="button" id="qrDetails">查看详细经历</button></div><header class="qr-personal" data-section="01"><p class="qr-kicker">01 / 个人信息 <span>QUICK RESUME</span></p><h1>'+esc(d.personalInfo.name)+'</h1>'+personalContact+'</header>'+section('03','03 / 教育背景',d.education.map(e=>'<article class="qr-education qr-entry"><p class="qr-education-line"><strong>'+esc(e.title)+'</strong><span class="qr-meta">｜'+esc(e.date)+'｜均分：'+esc(e.score)+'</span>；'+(e.direction?esc(e.direction):'')+esc(e.body)+'</p></article>').join(''))+section('04','04 / 技能与证书','<div class="qr-skill-layout"><div><h3>证书</h3><p class="qr-certificates">'+d.certificates.map(esc).join('、')+'</p></div><div><h3>技能</h3><ol class="qr-numbered-skills">'+d.skills.map((text,index)=>'<li><span class="qr-skill-number">'+(index+1)+'.</span>'+esc(text)+'</li>').join('')+'</ol></div></div>')+section('05','05 / 实习经历',experience(d.internships))+section('06','06 / 项目经历','<div class="qr-project-group"><h3 class="qr-subheading">A. 核心个人项目</h3>'+experience(d.personalProjects)+'</div><div class="qr-project-group"><h3 class="qr-subheading">B. 调研与社会实践项目</h3>'+experience(d.researchProjects)+'</div>')+section('07','07 / 荣誉奖励',bullet(d.awards))+'</article>';
 }
 let previousTitle='';
 function state(){const opened=!!document.querySelector('#overlay:not([hidden]) #quickResume');document.body.classList.toggle('quick-resume-open',opened);return opened;}
 const overlay=document.getElementById('overlay'),content=document.getElementById('modalContent');
 new MutationObserver(state).observe(overlay,{attributes:true,attributeFilter:['hidden']});new MutationObserver(state).observe(content,{childList:true});
 window.addEventListener('beforeprint',()=>{if(state()){previousTitle=document.title;document.title=window.STUDIO_QUICK_RESUME.personalInfo.name+'-个人简历';}});
 window.addEventListener('afterprint',()=>{if(previousTitle){document.title=previousTitle;previousTitle='';}});
 window.StudioQuickResume={render};
})();
