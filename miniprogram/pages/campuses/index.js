import { request } from '../../utils/request';

Page({
  data: { campuses: [] },
  async onLoad() {
    this.setData({ campuses: await request('/campuses') || [] });
  },
  openLocation(event) {
    const item = event.currentTarget.dataset.item;
    wx.openLocation({
      latitude: Number(item.latitude || 31.2304),
      longitude: Number(item.longitude || 121.4737),
      name: item.name,
      address: item.address,
      scale: 16
    });
  }
});
