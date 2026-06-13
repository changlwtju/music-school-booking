import { request } from '../../utils/request';

Page({
  data: {
    summary: { nextAppointments: [] },
    isInspector: false,
    inspectorProfiles: [],
    inspectorLabels: [],
    activeInspectorIndex: 0
  },
  onShow() {
    this.load();
  },
  async loadInspectorProfiles() {
    const app = getApp();
    if (!app.globalData.authToken) {
      this.setData({ isInspector: false, inspectorProfiles: [], inspectorLabels: [] });
      return;
    }
    const result = await request('/auth/inspector-profiles', { silent: true });
    if (!result?.profiles) {
      this.setData({ isInspector: false, inspectorProfiles: [], inspectorLabels: [] });
      return;
    }
    const profiles = result?.profiles || [];
    this.setData({
      isInspector: true,
      inspectorProfiles: profiles,
      inspectorLabels: profiles.map((item) => `${item.name} · ${item.course || '-'} · ${item.teacher_name || item.campus_name || ''}`),
      activeInspectorIndex: Math.max(0, profiles.findIndex((item) => item.id === app.globalData.studentId))
    });
  },
  async load() {
    const app = getApp();
    await this.loadInspectorProfiles();
    const summary = await request(`/students/${app.globalData.studentId}/summary`);
    if (!summary) return;
    summary.nextAppointments = (summary.nextAppointments || []).map((item) => ({
      ...item,
      statusText: item.status === 'booked' ? '已预约' : item.status
    }));
    this.setData({ summary });
  },
  async switchInspectorProfile(event) {
    const profile = this.data.inspectorProfiles[Number(event.detail.value)];
    if (!profile) return;
    const result = await request('/auth/inspector-switch', { method: 'POST', data: { profileId: profile.id } });
    if (!result?.profile) return;
    const app = getApp();
    app.globalData.authToken = result.authToken || '';
    app.globalData.currentUser = result.user || app.globalData.currentUser;
    app.globalData.studentId = result.profile.id;
    app.globalData.campusId = result.profile.campus_id;
    wx.setStorageSync('roleAuthToken', app.globalData.authToken);
    wx.setStorageSync('roleUser', app.globalData.currentUser);
    wx.setStorageSync('roleProfile', result.profile);
    await this.load();
  },
  goBooking() { wx.navigateTo({ url: '/pages/booking/index' }); },
  goCampuses() { wx.navigateTo({ url: '/pages/campuses/index' }); },
  goProfile() { wx.navigateTo({ url: '/pages/profile/index' }); },
  goContracts() { wx.navigateTo({ url: '/pages/contracts/index' }); }
});
