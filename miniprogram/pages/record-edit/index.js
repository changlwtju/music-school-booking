import { request } from '../../utils/request';

Page({
  data: {
    appointmentId: '',
    form: { content: '', progress: '', difficulty: '', homework: '', notes: '' }
  },
  onLoad(query) {
    this.setData({ appointmentId: query.appointmentId || '' });
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },
  async submit() {
    if (!this.data.form.content.trim()) {
      wx.showToast({ title: '请填写学习内容', icon: 'none' });
      return;
    }
    const result = await request('/lesson-records', {
      method: 'POST',
      data: { appointmentId: this.data.appointmentId, ...this.data.form }
    });
    if (result) {
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 600);
    }
  },
  onShareAppMessage() {
    return {
      title: '菠菜现代音乐上课记录',
      path: '/pages/role-entry/index'
    };
  }
});
