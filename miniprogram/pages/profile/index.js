import { request } from '../../utils/request';

Page({
  data: { summary: { student: {}, contracts: [] }, paymentText: '' },
  async onShow() {
    const app = getApp();
    const summary = await request(`/students/${app.globalData.studentId}/summary`);
    if (!summary) return;
    summary.contracts = (summary.contracts || []).map((item) => ({
      ...item,
      modeText: item.mode === 'fixed20' ? '20课时制' : '按册学习'
    }));
    this.setData({
      summary,
      paymentText: summary.student.payment_status === 'installment' ? '分期中' : '全款已付'
    });
  },
  goRecords() { wx.navigateTo({ url: '/pages/records/index' }); }
});
