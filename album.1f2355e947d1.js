(function(){
  'use strict';
  class StudioAlbum {
    constructor(scene,beforeOpen){
      this.scene=scene;this.beforeOpen=beforeOpen;this.overlay=document.getElementById('albumOverlay');
      this.dialog=this.overlay.querySelector('.album-dialog');this.stage=document.getElementById('albumPhotoStage');
      this.status=document.getElementById('albumStatus');this.title=document.getElementById('albumPhotoTitle');
      this.caption=document.getElementById('albumCaption');this.counter=document.getElementById('albumCounter');
      this.notice=document.getElementById('albumNotice');this.prev=document.getElementById('albumPrev');this.next=document.getElementById('albumNext');
      this.overview=document.getElementById('albumOverview');this.overviewToggle=document.getElementById('albumOverviewToggle');
      this.overviewToggle?.addEventListener('click',()=>this.toggleOverview());
      this.zoom=document.getElementById('albumZoom');this.closeButton=document.getElementById('closeAlbum');this.token=0;
      this.closeButton.addEventListener('click',()=>this.close());
      this.overlay.addEventListener('click',e=>{if(e.target===this.overlay)this.close()});
      this.prev.addEventListener('click',()=>this.move(-1));this.next.addEventListener('click',()=>this.move(1));
      this.zoom.addEventListener('click',()=>this.setZoom(!this.stage.classList.contains('zoomed')));
      document.addEventListener('keydown',e=>{
        if(this.overlay.hidden)return;
        if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.close();return}
        if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();this.move(e.key==='ArrowLeft'?-1:1)}
        if(e.key==='Tab'){
          const buttons=[...this.dialog.querySelectorAll('button')].filter(b=>!b.disabled),first=buttons[0],last=buttons[buttons.length-1];
          if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
          else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
        }
      },true);
    }
    open(index=0){
      if(!this.overlay.hidden)return;
      this.returnFocus=document.activeElement;this.beforeOpen();
      if(this.overview){this.overview.hidden=true;this.overview.replaceChildren();this.overviewToggle.setAttribute('aria-expanded','false');}
      this.photos=window.StudioAlbumData.photos();this.index=this.photos.length?index%this.photos.length:0;
      this.scene&&this.scene.focusAlbum(index);
      this.overlay.hidden=false;document.body.classList.add('album-open');
      this.background=[...document.querySelectorAll('.header,.main,.mobile-switch,#dock,.bottom-caption,#detailPanel,#overlay,#phoneOverlay')].map(el=>[el,el.inert]);
      this.background.forEach(([el])=>el.inert=true);
      this.render();this.closeButton.focus({preventScroll:true});
    }
    close(restore=true,returnFocus=true){
      if(this.overlay.hidden)return;
      this.token++;this.overlay.hidden=true;document.body.classList.remove('album-open');
      this.scene&&this.scene.leaveAlbum(restore);this.background.forEach(([el,value])=>el.inert=value);
      this.onClose?.();
      this.stage.querySelector('img')?.remove();this.zoom.disabled=true;
      if(returnFocus&&this.returnFocus?.isConnected)this.returnFocus.focus({preventScroll:true});
    }
    move(direction){if(this.photos.length<2)return;this.index=(this.index+direction+this.photos.length)%this.photos.length;this.render()}
    setZoom(zoomed){
      this.stage.classList.toggle('zoomed',zoomed);this.zoom.setAttribute('aria-pressed',String(zoomed));this.zoom.textContent=zoomed?'缩小照片':'放大照片';
      this.stage.scrollTop=0;this.stage.scrollLeft=0;
    }
    toggleOverview(){
      if(!this.overview)return;
      this.overview.hidden=!this.overview.hidden;this.overviewToggle.setAttribute('aria-expanded',String(!this.overview.hidden));
      if(!this.overview.hidden&&!this.overview.children.length){
        this.photos.forEach((photo,index)=>{
          const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','查看'+(photo.title||'照片'+(index+1)));
          const path=window.StudioAlbumData.localImage(photo.thumbnail||photo.image);
          if(path){const image=document.createElement('img');image.src=path;image.alt=photo.title||'生活照片';image.loading='lazy';image.addEventListener('error',()=>{image.hidden=true;});button.appendChild(image);}
          const label=document.createElement('span');label.textContent=photo.title||'照片'+(index+1);button.appendChild(label);
          button.addEventListener('click',()=>{this.index=index;this.render();});this.overview.appendChild(button);
        });
      }
      this.highlightOverview();
    }
    highlightOverview(){if(this.overview)this.overview.querySelectorAll('button').forEach((button,index)=>button.setAttribute('aria-pressed',String(index===this.index)));}
    render(){
      this.highlightOverview();const token=++this.token,p=this.photos[this.index];this.setZoom(false);this.zoom.disabled=true;
      this.stage.querySelector('img')?.remove();this.status.hidden=false;this.status.textContent=p?'正在打开照片…':'相册还在整理中，生活照片待添加。';
      this.title.textContent=p?.title||'生活照片待添加';this.caption.textContent=p?.caption||'';
      this.counter.textContent=this.photos.length?`${this.index+1} / ${this.photos.length}`:'0 / 0';
      this.notice.textContent=p?.placeholder!==false?'本地占位插画 · 非真实生活照':'生活相册';
      this.prev.disabled=this.next.disabled=this.photos.length<2;
      const path=window.StudioAlbumData.localImage(p?.image);
      if(!path){if(p)this.status.textContent='照片暂时无法显示，请稍后再来看看。';return}
      const img=document.createElement('img');img.alt=p.title||'生活照片';img.decoding='async';img.hidden=true;
      img.addEventListener('load',()=>{if(token!==this.token||this.overlay.hidden)return;img.hidden=false;this.status.hidden=true;this.zoom.disabled=false});
      img.addEventListener('error',()=>{if(token!==this.token||this.overlay.hidden)return;img.remove();this.status.hidden=false;this.status.textContent='这张照片暂时无法加载，你可以继续翻看其他照片。';this.zoom.disabled=true});
      this.stage.appendChild(img);img.src=path;
    }
  }
  window.StudioAlbum=StudioAlbum;
})();
