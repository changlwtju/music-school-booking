import { request } from '../../utils/request';

Page({
  data: { campuses: [] },
  async onLoad() {
    this.setData({ campuses: await request('/campuses') || [] });
  },
  openLocation(event) {
    const item = event.currentTarget.dataset.item;
    wx.openLocation({
      latitude: Number(item.latitude || 43.8171),
      longitude: Number(item.longitude || 125.3235),
      name: item.name,
      address: item.address,
      scale: 16
    });
  }
});
