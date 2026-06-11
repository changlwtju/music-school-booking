import { request } from '../../utils/request';

Page({
  data: { syncEvents: [], teacher: {} },
  async onLoad() {
    this.load();
  },
  onShow() {
    this.loadSyncEvents();
  },
  async load() {
    await this.loadTeacher();
    this.loadSyncEvents();
  },
  async loadTeacher() {
    const app = getApp();
    const teachers = await request(`/teachers?campusId=${app.globalData.campusId}`) || [];
    const teacher = teachers.find((item) => item.id === app.globalData.teacherId) || teachers[0] || {};
    if (teacher.id) {
      app.globalData.teacherId = teacher.id;
      app.globalData.campusId = teacher.campus_id;
    }
    this.setData({ teacher });
  },
  async loadSyncEvents() {
    const app = getApp();
    const syncEvents = await request(`/sync-events?teacherId=${app.globalData.teacherId}&limit=3`) || [];
    this.setData({ syncEvents });
  },
  goSchedule() { wx.navigateTo({ url: '/pages/teacher-schedule/index' }); },
  goRecords() { wx.navigateTo({ url: '/pages/teacher-records/index' }); },
  goMembers() { wx.navigateTo({ url: '/pages/members/index' }); },
  goCampuses() { wx.navigateTo({ url: '/pages/campuses/index' }); },
  goPayment() { wx.navigateTo({ url: '/pages/payment-code/index' }); }
});
