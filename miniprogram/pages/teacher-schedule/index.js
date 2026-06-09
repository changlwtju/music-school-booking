import { request, today } from '../../utils/request';

Page({
  data: {
    teachers: [],
    activeTeacher: {},
    activeDate: today(0),
    dates: [
      { label: '今天', date: today(0) },
      { label: '明天', date: today(1) },
      { label: '后天', date: today(2) }
    ],
    schedule: { appointments: [], date: today(0), notice: '' },
    scheduleStats: { total: 0, booked: 0, completed: 0 },
    lastSyncedAppointmentId: ''
  },
  async onLoad() {
    const app = getApp();
    const teachers = await request(`/teachers?campusId=${app.globalData.campusId}`) || [];
    const activeTeacher = teachers.find((item) => item.id === app.globalData.teacherId) || teachers[0] || {};
    this.setData({
      teachers,
      activeTeacher,
      activeDate: app.globalData.lastSyncedDate || this.data.activeDate,
      lastSyncedAppointmentId: app.globalData.lastSyncedAppointmentId || ''
    });
    this.loadSchedule();
  },
  onShow() {
    if (this.data.activeTeacher.id) this.loadSchedule();
  },
  selectTeacher(event) {
    this.setData({ activeTeacher: this.data.teachers[event.currentTarget.dataset.index] });
    this.loadSchedule();
  },
  selectDate(event) {
    this.setData({ activeDate: event.currentTarget.dataset.date });
    this.loadSchedule();
  },
  async loadSchedule() {
    const { activeTeacher, activeDate } = this.data;
    if (!activeTeacher.id) return;
    const schedule = await request(`/teachers/${activeTeacher.id}/schedule?date=${activeDate}`) || { appointments: [] };
    schedule.appointments = (schedule.appointments || []).map((item) => ({
      ...item,
      isSynced: item.id === this.data.lastSyncedAppointmentId,
      modeText: item.mode === 'fixed20' ? '20课时制' : '按册学习',
      progressText: item.mode === 'fixed20'
        ? `已上 ${item.completed_lessons || 0} / ${item.total_lessons || 0}`
        : item.book_level || '按册学习',
      statusText: item.status === 'booked' ? '待上课' : item.status
    }));
    this.setData({
      schedule,
      scheduleStats: {
        total: schedule.appointments.length,
        booked: schedule.appointments.filter((item) => item.status === 'booked').length,
        completed: schedule.appointments.filter((item) => item.status === 'completed').length
      }
    });
  },
  editRecord(event) {
    wx.navigateTo({ url: `/pages/record-edit/index?appointmentId=${event.currentTarget.dataset.id}` });
  }
});
