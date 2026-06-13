import { request, today } from '../../utils/request';

const releaseHour = 20;

const isAfterReleaseTime = () => new Date().getHours() >= releaseHour;

const studentBookingDate = () => today(isAfterReleaseTime() ? 1 : 0);

const studentBookingDateLabel = () => (isAfterReleaseTime() ? '明天' : '今天');

const statusText = {
  available: '可预约',
  occupied: '已被预约',
  unreleased: '未释放',
  closed: '休息',
  disabled: '不可预约'
};

Page({
  data: {
    courses: [],
    activeCourse: {},
    activeDate: studentBookingDate(),
    activeDateLabel: studentBookingDateLabel(),
    rules: { openHours: '授课时间 12:00-20:00', release: '次日课表前一天 20:00 后释放', selfChange: '已预约课程须在开课前至少 1.5 小时取消，逾时无法自助取消' },
    slots: [],
    bookingNotice: '',
    syncedAppointment: null
  },
  async onLoad() {
    const app = getApp();
    const courses = await request(`/students/${app.globalData.studentId}/bookable-courses`) || [];
    this.setData({ courses, activeCourse: courses[0] || {} });
    this.loadSlots();
  },
  onShow() {
    this.refreshBookingDate();
    this.startReleaseWatcher();
  },
  onHide() {
    this.stopReleaseWatcher();
  },
  onUnload() {
    this.stopReleaseWatcher();
  },
  startReleaseWatcher() {
    this.stopReleaseWatcher();
    this.releaseTimer = setInterval(() => this.refreshBookingDate(), 30000);
  },
  stopReleaseWatcher() {
    if (!this.releaseTimer) return;
    clearInterval(this.releaseTimer);
    this.releaseTimer = null;
  },
  refreshBookingDate() {
    const activeDate = studentBookingDate();
    if (activeDate === this.data.activeDate) return;
    this.setData({
      activeDate,
      activeDateLabel: studentBookingDateLabel(),
      syncedAppointment: null
    });
    this.loadSlots();
  },
  selectCourse(event) {
    this.setData({ activeCourse: this.data.courses[event.currentTarget.dataset.index] });
    this.loadSlots();
  },
  async loadSlots() {
    const { activeCourse, activeDate } = this.data;
    if (!activeCourse.teacher_id) return;
    const data = await request(`/schedule/slots?teacherId=${activeCourse.teacher_id}&contractId=${activeCourse.contract_id}&date=${activeDate}`);
    const slots = (data?.slots || []).map((item) => ({ ...item, statusText: statusText[item.status] || item.reason || item.status }));
    this.setData({
      slots,
      bookingNotice: isAfterReleaseTime()
        ? '当前已释放明日约课权限，可预约明天课程。'
        : '20:00 前仅开放当天约课；20:00 课程结束后将自动切换到明天。',
      rules: data?.rules || this.data.rules
    });
  },
  async tapSlot(event) {
    const slot = event.currentTarget.dataset.slot;
    if (slot.status !== 'available') {
      wx.showToast({ title: slot.reason || '该时间不可预约', icon: 'none' });
      return;
    }
    const app = getApp();
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '确认预约',
        content: `${this.data.activeCourse.course} ${this.data.activeDate} ${slot.startTime}`,
        success: (res) => resolve(res.confirm)
      });
    });
    if (!confirmed) return;
    const result = await request('/appointments', {
      method: 'POST',
      data: {
        studentId: app.globalData.studentId,
        bindingId: this.data.activeCourse.id,
        date: this.data.activeDate,
        startTime: slot.startTime
      }
    });
    if (result) {
      app.globalData.teacherId = result.teacher_id;
      app.globalData.lastSyncedAppointmentId = result.id;
      app.globalData.lastSyncedDate = result.date;
      wx.showToast({ title: '预约成功', icon: 'success' });
      this.setData({ syncedAppointment: result });
      this.loadSlots();
    }
  },
  previewTeacherSchedule() {
    wx.navigateTo({ url: '/pages/teacher-schedule/index' });
  }
});
