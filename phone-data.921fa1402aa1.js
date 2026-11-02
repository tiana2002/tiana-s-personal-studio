// v1.2 手机主页资料：与房间和简历内容独立。所有空白图片均显示本地占位图形。
// 将图片放进 assets 后填写相对路径，例如 ./assets/douyin-avatar.jpg。
window.STUDIO_PHONE_DATA = {
  profileScreenshot: './assets/social/douyin-profile-41a5f3c59a90.jpg',
  isPlaceholder: false,
  avatar: '',
  nickname: '昵称待填写',
  account: '抖音号待填写',
  bio: '这里将展示我的账号简介。真实资料确认后，再介绍我的创作方向和日常分享。',
  workCount: null, // null 表示尚未提供；真实数量可以为 0。
  works: [
    { title: '代表作品一 · 待添加', description: '作品简介待补充', cover: '' },
    { title: '代表作品二 · 待添加', description: '作品简介待补充', cover: '' },
    { title: '代表作品三 · 待添加', description: '作品简介待补充', cover: '' }
  ]
};
