(function(){
 'use strict';
 let serial=0;
 // One delegated listener set for both the existing detail page and its existing large-image modal.
 function record(root){return window.STUDIO_PORTFOLIO.items.find(p=>p.id===root.dataset.series);}
 function mark(root,index){root.dataset.index=String(index);root.querySelector('.portfolio-counter').textContent=(index+1)+' / '+record(root).images.length;root.querySelectorAll('[data-gallery-index]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.galleryIndex)===index)));}
 async function select(root,index){
  const item=record(root);if(!item)return;index=(index+item.images.length)%item.images.length;
  const path=window.StudioAlbumData.localImage(item.images[index]);if(!path)return;
  const token=String(++serial);root.dataset.request=token;const status=root.querySelector('.portfolio-image-status');status.textContent='正在打开图片…';status.hidden=false;
  const pending=new Image();pending.src=path;
  try{await pending.decode();if(!root.isConnected||root.dataset.request!==token)return;const image=root.querySelector('.portfolio-main-image');pending.className='portfolio-main-image';pending.alt=item.title+' '+(index+1);image.replaceWith(pending);status.hidden=true;mark(root,index);}
  catch{if(root.isConnected&&root.dataset.request===token){status.hidden=false;status.textContent='图片暂时无法加载，请尝试其他图片。';}}
 }
 document.addEventListener('click',e=>{
  const control=e.target.closest('[data-gallery-step],[data-gallery-index]'),root=control?.closest('.portfolio-gallery');if(!root)return;
  e.preventDefault();const index=Number(root.dataset.index)||0;select(root,control.hasAttribute('data-gallery-index')?Number(control.dataset.galleryIndex):index+Number(control.dataset.galleryStep));
 });
 document.addEventListener('keydown',e=>{
  const root=e.target.closest?.('.portfolio-gallery');if(!root||!['ArrowLeft','ArrowRight'].includes(e.key))return;
  e.preventDefault();select(root,(Number(root.dataset.index)||0)+(e.key==='ArrowRight'?1:-1));
 });
 document.addEventListener('error',e=>{const img=e.target;if(!img.matches?.('.portfolio-main-image,.portfolio-card img,.phone-profile-screenshot'))return;img.hidden=true;const note=document.createElement('p');note.className='portfolio-image-error';note.textContent='图片暂时无法加载，请稍后重试。';img.after(note);},true);
 window.StudioPortfolioGallery={select};
})();
