import { request } from '../../utils/request';

Page({
  data: { courses: [], syncEvents: [] },
  async onLoad() {
    this.load();
  },
  onShow() {
    this.loadSyncEvents();
  },
  async load() {
    const courses = await request('/courses') || [];
    this.setData({ courses });
    this.loadSyncEvents();
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
