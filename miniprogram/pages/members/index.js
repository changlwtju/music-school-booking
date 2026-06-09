import { request } from '../../utils/request';

Page({
  data: { keyword: '', members: [] },
  onLoad() { this.load(); },
  onInput(event) { this.setData({ keyword: event.detail.value }); },
  async load() {
    const app = getApp();
    const members = await request(`/teachers/${app.globalData.teacherId}/students?keyword=${encodeURIComponent(this.data.keyword)}`) || [];
    this.setData({ members });
  }
});
