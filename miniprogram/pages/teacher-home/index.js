import { request } from '../../utils/request';

Page({
  data: {
    syncEvents: [],
    teacher: {},
    isInspector: false,
    inspectorProfiles: [],
    inspectorLabels: [],
    activeInspectorIndex: 0
  },
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
    await this.loadInspectorProfiles();
    const teachers = await request(`/teachers?campusId=${app.globalData.campusId}`) || [];
    const teacher = teachers.find((item) => item.id === app.globalData.teacherId) || teachers[0] || {};
    if (teacher.id) {
      app.globalData.teacherId = teacher.id;
      app.globalData.campusId = teacher.campus_id;
    }
    this.setData({ teacher });
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
      inspectorLabels: profiles.map((item) => `${item.name} · ${item.course || '-'} · ${item.campus_name || ''}`),
      activeInspectorIndex: Math.max(0, profiles.findIndex((item) => item.id === app.globalData.teacherId))
    });
  },
  async switchInspectorProfile(event) {
    const profile = this.data.inspectorProfiles[Number(event.detail.value)];
    if (!profile) return;
    const result = await request('/auth/inspector-switch', { method: 'POST', data: { profileId: profile.id } });
    if (!result?.profile) return;
    const app = getApp();
    app.globalData.authToken = result.authToken || '';
    app.globalData.currentUser = result.user || app.globalData.currentUser;
    app.globalData.teacherId = result.profile.id;
    app.globalData.campusId = result.profile.campus_id;
    wx.setStorageSync('roleAuthToken', app.globalData.authToken);
    wx.setStorageSync('roleUser', app.globalData.currentUser);
    wx.setStorageSync('roleProfile', result.profile);
    await this.load();
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
  goPayment() { wx.navigateTo({ url: '/pages/payment-code/index' }); },
  onShareAppMessage() {
    return {
      title: '菠菜现代音乐老师工作台',
      path: '/pages/role-entry/index'
    };
  }
});
