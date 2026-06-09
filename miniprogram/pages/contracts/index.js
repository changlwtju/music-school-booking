import { request } from '../../utils/request';

Page({
  data: { contracts: [] },
  async onShow() {
    const app = getApp();
    const summary = await request(`/students/${app.globalData.studentId}/summary`);
    const contracts = (summary?.contracts || []).map((item) => ({
      ...item,
      statusText: item.status === 'active' ? '有效' : item.status,
      modeText: item.mode === 'fixed20' ? '20课时固定课时制' : '按册学习'
    }));
    this.setData({ contracts });
  }
});
