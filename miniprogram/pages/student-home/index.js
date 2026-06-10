import { request } from '../../utils/request';

Page({
  data: { summary: { nextAppointments: [] } },
  onShow() {
    this.load();
  },
  async load() {
    const app = getApp();
    const summary = await request(`/students/${app.globalData.studentId}/summary`);
    if (!summary) return;
    summary.nextAppointments = (summary.nextAppointments || []).map((item) => ({
      ...item,
      statusText: item.status === 'booked' ? '已预约' : item.status
    }));
    this.setData({ summary });
  },
  goBooking() { wx.navigateTo({ url: '/pages/booking/index' }); },
  goCampuses() { wx.navigateTo({ url: '/pages/campuses/index' }); },
  goProfile() { wx.navigateTo({ url: '/pages/profile/index' }); },
  goContracts() { wx.navigateTo({ url: '/pages/contracts/index' }); }
});
