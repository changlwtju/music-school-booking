import { request, today } from '../../utils/request';

const statusText = {
  available: '可预约',
  occupied: '已被预约',
  closed: '休息',
  disabled: '不可预约',
  unreleased: '未释放'
};

Page({
  data: {
    managerName: '',
    students: [],
    studentLabels: [],
    activeIndex: 0,
    activeDate: today(),
    slots: [],
    appointments: []
  },
  async onLoad() {
    const app = getApp();
    if (!app.globalData.authToken) {
      wx.showToast({ title: '请先登录管理员端', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.setData({ managerName: app.globalData.manager?.name || '管理员' });
    await this.loadStudents();
    await this.loadAppointments();
  },
  async loadStudents() {
    const students = await request('/manager/students') || [];
    this.setData({
      students,
      studentLabels: students.map((item) => `${item.name} · ${item.course} · ${item.teacher_name}`),
      activeIndex: 0
    });
    await this.loadSlots();
  },
  async loadSlots() {
    const active = this.data.students[this.data.activeIndex];
    if (!active) {
      this.setData({ slots: [] });
      return;
    }
    const result = await request(`/manager/schedule-slots?bindingId=${active.binding_id}&date=${this.data.activeDate}`);
    this.setData({
      slots: (result?.slots || []).map((item) => ({
        ...item,
        statusText: statusText[item.status] || item.reason || item.status
      }))
    });
  },
  async loadAppointments() {
    const appointments = await request(`/manager/appointments?from=${this.data.activeDate}`) || [];
    this.setData({ appointments });
  },
  async changeStudent(event) {
    this.setData({ activeIndex: Number(event.detail.value) });
    await this.loadSlots();
  },
  async changeDate(event) {
    this.setData({ activeDate: event.detail.value });
    await this.loadSlots();
    await this.loadAppointments();
  },
  async book(event) {
    const slot = event.currentTarget.dataset.slot;
    const active = this.data.students[this.data.activeIndex];
    if (!active || slot.status !== 'available') {
      wx.showToast({ title: slot.reason || '该时段不可预约', icon: 'none' });
      return;
    }
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '确认代约',
        content: `${active.name} · ${active.course}\n${this.data.activeDate} ${slot.startTime}`,
        success: (res) => resolve(res.confirm)
      });
    });
    if (!confirmed) return;
    const result = await request('/manager/appointments', {
      method: 'POST',
      data: {
        studentId: active.student_id,
        bindingId: active.binding_id,
        date: this.data.activeDate,
        startTime: slot.startTime
      }
    });
    if (!result) return;
    wx.showToast({ title: '代约成功', icon: 'success' });
    await this.loadSlots();
    await this.loadAppointments();
  },
  async cancel(event) {
    const item = event.currentTarget.dataset.item;
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '确认取消',
        content: `${item.student_name} · ${item.date} ${item.start_time}`,
        confirmColor: '#B5473C',
        success: (res) => resolve(res.confirm)
      });
    });
    if (!confirmed) return;
    const result = await request(`/manager/appointments/${item.id}/cancel`, {
      method: 'POST',
      data: { reason: `${this.data.managerName} 手机端取消` }
    });
    if (!result) return;
    wx.showToast({ title: '已取消', icon: 'success' });
    await this.loadSlots();
    await this.loadAppointments();
  }
});
