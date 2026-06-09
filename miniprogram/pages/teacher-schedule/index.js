import { request, today } from '../../utils/request';

Page({
  data: { teachers: [], activeTeacher: {}, schedule: { appointments: [], date: today(1), notice: '' } },
  async onLoad() {
    const teachers = await request('/teachers') || [];
    const app = getApp();
    const activeTeacher = teachers.find((item) => item.id === app.globalData.teacherId) || teachers[0] || {};
    this.setData({ teachers, activeTeacher });
    this.loadSchedule();
  },
  selectTeacher(event) {
    this.setData({ activeTeacher: this.data.teachers[event.currentTarget.dataset.index] });
    this.loadSchedule();
  },
  async loadSchedule() {
    if (!this.data.activeTeacher.id) return;
    const schedule = await request(`/teachers/${this.data.activeTeacher.id}/schedule?date=${today(1)}`) || { appointments: [] };
    schedule.appointments = (schedule.appointments || []).map((item) => ({
      ...item,
      modeText: item.mode === 'fixed20' ? '20课时制' : '按册学习',
      statusText: item.status === 'booked' ? '待上课' : item.status
    }));
    this.setData({ schedule });
  },
  editRecord(event) {
    wx.navigateTo({ url: `/pages/record-edit/index?appointmentId=${event.currentTarget.dataset.id}` });
  }
});
