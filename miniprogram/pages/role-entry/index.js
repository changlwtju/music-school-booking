import { request } from '../../utils/request';

Page({
  data: { courses: [] },
  async onLoad() {
    this.setData({ courses: await request('/courses') || [] });
  },
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
