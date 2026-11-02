(function(){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const items=()=> (Array.isArray(window.STUDIO_AWARDS_DATA?.items)?window.STUDIO_AWARDS_DATA.items:[]).filter(x=>x&&typeof x.title==='string'&&x.title.trim());
 const image=item=>window.StudioAlbumData.localImage(item?.certificate||item?.image);
 const metadata=item=>[item.date,item.category||item.level,item.issuer].filter(Boolean).map(esc).join(' · ');
 const listHTML=()=>items().length?`<div class="awards-list">${items().map((item,i)=>`<button class="award-summary" type="button" data-award="a${i+1}"><span class="award-symbol" aria-hidden="true">✧</span><span><strong>${esc(item.title)}</strong><small>${metadata(item)||'详细资料待补充'}</small></span><span aria-hidden="true">↗</span></button>`).join('')}</div>`:'<div class="awards-empty"><span aria-hidden="true">✧</span><h3>获奖资料正在整理中</h3><p>目前尚未提供可公开的真实获奖记录。</p><p>真实资料确认后，将在这里展示奖项、获奖时间及相关证明。</p></div>';
 function detailHTML(id){
  const index=/^a[1-9]\d*$/.test(id)?Number(id.slice(1))-1:-1,item=items()[index];
  if(!item)return '<p class="awards-empty">这条记录暂未找到，可以返回获奖列表。</p>';
  const path=image(item);
  return `<article class="award-detail"><h3>${esc(item.title)}</h3><p class="award-meta">${metadata(item)||'详细资料待补充'}</p>${item.description?`<p>${esc(item.description)}</p>`:''}${path?`<button class="award-image-open" type="button" aria-label="放大${esc(item.title)}的证书"><img src="${esc(path)}" alt="${esc(item.title)}的证书" loading="lazy"><span>放大查看证书</span></button>`:'<p class="award-meta">暂未提供证书图片。</p>'}</article>`;
 }
 window.StudioAwardsArchive={items,listHTML,detailHTML};
 window.createAwardsArchive=function({navigate}){
  const overlay=document.getElementById('awardsOverlay'),content=document.getElementById('awardsContent'),back=document.getElementById('awardsBack');
  let current=null,zoomed=false,listScroll=0;
  function open(id){
   current=id||null;zoomed=false;overlay.hidden=false;overlay.dataset.view=current?'detail':'list';
   back.hidden=!current;back.textContent='← 返回获奖列表';content.innerHTML=current?detailHTML(current):listHTML();content.scrollTop=current?0:listScroll;
   document.getElementById('closeAwards').focus({preventScroll:true});
  }
  function hide(){if(!overlay.hidden&&!current)listScroll=content.scrollTop;overlay.hidden=true;}
  function unzoom(){if(!zoomed)return false;zoomed=false;content.innerHTML=detailHTML(current);back.textContent='← 返回获奖列表';content.querySelector('.award-image-open')?.focus({preventScroll:true});return true;}
  document.getElementById('closeAwards').addEventListener('click',()=>navigate(''));
  overlay.addEventListener('click',e=>{if(e.target===overlay)navigate('');});
  back.addEventListener('click',()=>{if(!unzoom())navigate('awards');});
  content.addEventListener('click',e=>{
   const record=e.target.closest('[data-award]');if(record){listScroll=content.scrollTop;navigate('awards/'+record.dataset.award);return;}
   if(e.target.closest('.award-image-open')){
    const item=items()[Number(current.slice(1))-1],path=image(item);if(!path)return;
    zoomed=true;content.innerHTML=`<figure class="award-image-full"><img src="${esc(path)}" alt="${esc(item.title)}的证书"><figcaption>${esc(item.title)}</figcaption></figure>`;back.textContent='← 返回获奖详情';back.focus({preventScroll:true});
   }
  });
  content.addEventListener('error',e=>{if(e.target.tagName==='IMG'){e.target.hidden=true;const note=document.createElement('p');note.className='award-meta';note.textContent='证书图片暂时无法加载，文字记录仍可查看。';e.target.after(note);}},true);
  return {open,hide,escape:unzoom,isOpen:()=>!overlay.hidden,element:overlay.querySelector('.awards-dialog')};
 };
})();
