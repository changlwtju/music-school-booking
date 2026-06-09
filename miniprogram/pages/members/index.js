import { request } from '../../utils/request';

Page({
  data: {
    keyword: '',
    activeFilter: 'active',
    filters: [
      { label: '在读会员', value: 'active' },
      { label: '已到期会员', value: 'expired' },
      { label: '分期会员', value: 'installment' }
    ],
    members: []
  },
  onLoad() { this.load(); },
  onInput(event) { this.setData({ keyword: event.detail.value }); },
  selectFilter(event) {
    this.setData({ activeFilter: event.currentTarget.dataset.value });
    this.load();
  },
  async load() {
    const app = getApp();
    const members = await request(`/teachers/${app.globalData.teacherId}/students?keyword=${encodeURIComponent(this.data.keyword)}&filter=${this.data.activeFilter}`) || [];
    this.setData({ members });
  }
});
