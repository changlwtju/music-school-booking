import { request, today } from '../../utils/request';

const minScheduleDate = '2020-01-01';

const buildScheduleDates = () => [
  { label: '昨天', date: today(-1) },
  { label: '今天', date: today(0) },
  { label: '明天', date: today(1) }
];

const scheduleDateLabel = (date) => {
  if (date === today(-1)) return '昨天';
  if (date === today(0)) return '今天';
  if (date === today(1)) return '明天';
  return date;
};

Page({
  data: {
    teachers: [],
    activeTeacher: {},
    activeDate: today(0),
    dates: buildScheduleDates(),
    minDate: minScheduleDate,
    maxDate: '2099-12-31',
    selectedDateLabel: '今天',
    schedule: { appointments: [], date: today(0), notice: '' },
    scheduleStats: { total: 0, booked: 0, completed: 0 },
    lastSyncedAppointmentId: ''
  },
  async onLoad() {
    const app = getApp();
    const teachers = await request(`/teachers?campusId=${app.globalData.campusId}`) || [];
    const activeTeacher = teachers.find((item) => item.id === app.globalData.teacherId) || teachers[0] || {};
    const activeDate = app.globalData.lastSyncedDate || this.data.activeDate;
    this.setData({
      teachers,
      activeTeacher,
      activeDate,
      selectedDateLabel: scheduleDateLabel(activeDate),
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
    const activeDate = event.currentTarget.dataset.date;
    this.setData({ activeDate, selectedDateLabel: scheduleDateLabel(activeDate) });
    this.loadSchedule();
  },
  changeDate(event) {
    const activeDate = event.detail.value;
    this.setData({ activeDate, selectedDateLabel: scheduleDateLabel(activeDate) });
    this.loadSchedule();
  },
  async loadSchedule() {
    const { activeTeacher, activeDate } = this.data;
    if (!activeTeacher.id) return;
    const schedule = await request(`/teachers/${activeTeacher.id}/schedule?date=${activeDate}`) || { appointments: [] };
    schedule.appointments = (schedule.appointments || []).map((item) => {
      const modeText = item.lesson_type === 'trial' ? '体验课' : (item.mode === 'fixed20' ? '20课时制' : '按册学习');
      const progressText = item.lesson_type === 'trial'
        ? '后台预约'
        : item.mode === 'fixed20'
        ? `已上 ${item.completed_lessons || 0} / ${item.total_lessons || 0}`
        : item.progress || item.book_level || '按册学习';
      return {
        ...item,
        isSynced: item.id === this.data.lastSyncedAppointmentId,
        modeText,
        progressText,
        lessonNote: item.lesson_note || '',
        statusText: item.status === 'booked' ? '待上课' : item.status === 'completed' ? '已完成' : item.status
      };
    });
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
