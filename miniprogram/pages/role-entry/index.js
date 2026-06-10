Page({
  enterStudent() {
    const app = getApp();
    app.globalData.role = 'student';
    wx.navigateTo({ url: '/pages/student-home/index' });
  },
  enterTeacher() {
    const app = getApp();
    app.globalData.role = 'teacher';
    wx.navigateTo({ url: '/pages/teacher-home/index' });
  }
});
