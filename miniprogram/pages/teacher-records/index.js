import { request } from '../../utils/request';

Page({
  data: {
    records: []
  },
  onShow() {
    this.load();
  },
  async load() {
    const app = getApp();
    const records = await request(`/lesson-records?teacherId=${app.globalData.teacherId}`) || [];
    this.setData({
      records: records.map((item) => ({
        ...item,
        billableText: item.billable ? '有效课时' : '无效课时'
      }))
    });
  }
});
