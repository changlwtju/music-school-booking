import { request } from '../../utils/request';

Page({
  data: { records: [] },
  async onShow() {
    const app = getApp();
    const summary = await request(`/students/${app.globalData.studentId}/summary`);
    const records = (summary?.records || []).map((item) => ({ ...item, billableText: item.billable ? '有效课时' : '无效课时' }));
    this.setData({ records });
  }
});
