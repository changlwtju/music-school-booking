import { request, today } from '../../utils/request';

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
    activeDate: today(1),
    dates: [
      { label: '今天', date: today(0) },
      { label: '明天', date: today(1) },
      { label: '后天', date: today(2) }
    ],
    rules: { openHours: '授课时间 12:00-20:00', release: '次日课表前一天 20:00 后释放', selfChange: '距离开课不足 1.5 小时不可自助改课' },
    slots: []
  },
  async onLoad() {
    const app = getApp();
    const courses = await request(`/students/${app.globalData.studentId}/bookable-courses`) || [];
    this.setData({ courses, activeCourse: courses[0] || {} });
    this.loadSlots();
  },
  selectCourse(event) {
    this.setData({ activeCourse: this.data.courses[event.currentTarget.dataset.index] });
    this.loadSlots();
  },
  selectDate(event) {
    this.setData({ activeDate: event.currentTarget.dataset.date });
    this.loadSlots();
  },
  async loadSlots() {
    const { activeCourse, activeDate } = this.data;
    if (!activeCourse.teacher_id) return;
    const data = await request(`/schedule/slots?teacherId=${activeCourse.teacher_id}&contractId=${activeCourse.contract_id}&date=${activeDate}`);
    const slots = (data?.slots || []).map((item) => ({ ...item, statusText: statusText[item.status] || item.reason || item.status }));
    this.setData({ slots, rules: data?.rules || this.data.rules });
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
      wx.showToast({ title: '预约成功', icon: 'success' });
      this.loadSlots();
    }
  }
});
