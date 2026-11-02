// 生活相册独立配置。三张照片由本人于2026-11-01明确提供用于此相册，按发送顺序展示。
window.STUDIO_ALBUM_DATA = {
  photos: [
    { id: 'photo-01', image: './assets/album/life-01-3de742ace154.jpg', thumbnail: './assets/album/life-thumb-01-1f2a48b918f6.jpg', title: '生活照片 01', caption: '', order: 1, placeholder: false },
    { id: 'photo-02', image: './assets/album/life-02-ab5739d6a779.jpg', thumbnail: './assets/album/life-thumb-02-827106164b4b.jpg', title: '生活照片 02', caption: '', order: 2, placeholder: false },
    { id: 'photo-03', image: './assets/album/life-03-083cd20f1d74.jpg', thumbnail: './assets/album/life-thumb-03-f1a2d595062f.jpg', title: '生活照片 03', caption: '', order: 3, placeholder: false }
  ]
};
// Shared validation keeps remote URLs and path traversal out of public image slots.
window.StudioAlbumData = {
  localImage(path) {
    return typeof path==='string' && /^\.\/assets\/[\w\-\u0080-\uffff /]+\.(?:png|jpe?g|webp|avif|svg)$/i.test(path) && !path.includes('..') ? path : '';
  },
  photos() {
    const items=window.STUDIO_ALBUM_DATA?.photos;
    return (Array.isArray(items)?items:[]).filter(p=>p&&typeof p==='object').slice().sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
  }
};
