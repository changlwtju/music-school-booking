import { request } from '../../utils/request';

Page({
  data: { summary: { student: {}, contracts: [], bindings: [] }, paymentText: '', teacherNames: '' },
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
    const paymentText = {
      installment: '分期中',
      paid: '全款已付',
      pending: '待确认',
      trial: '体验课'
    }[summary.student.payment_status] || summary.student.payment_status || '待确认';
    this.setData({
      summary,
      paymentText,
      teacherNames: [...new Set(bindings.map((item) => item.teacher_name).filter(Boolean))].join('、')
    });
  },
  goRecords() { wx.navigateTo({ url: '/pages/records/index' }); }
});
