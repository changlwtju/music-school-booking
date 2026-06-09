import { request } from '../../utils/request';

Page({
  data: { summary: { student: {}, contracts: [] }, paymentText: '' },
  async onShow() {
    const app = getApp();
    const summary = await request(`/students/${app.globalData.studentId}/summary`);
    if (!summary) return;
    const bindings = summary.bindings || [];
    summary.contracts = (summary.contracts || []).map((item) => {
      const binding = bindings.find((entry) => entry.contract_id === item.id) || {};
      return {
        ...item,
        teacherName: binding.teacher_name || '',
        modeText: item.mode === 'fixed20' ? '20课时制' : '按册学习',
        statusText: item.status === 'active' ? '学习中' : '已到期'
      };
    });
    summary.latestRecord = (summary.records || [])[0] || null;
    this.setData({
      summary,
      paymentText: summary.student.payment_status === 'installment' ? '分期中' : '全款已付'
    });
  },
  goRecords() { wx.navigateTo({ url: '/pages/records/index' }); }
});
