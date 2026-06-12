App({
  onLaunch() {
    this.globalData.authToken = wx.getStorageSync('managerAuthToken') || '';
    this.globalData.manager = wx.getStorageSync('managerProfile') || null;
  },
  globalData: {
    apiBase: 'http://49.233.131.93',
    studentId: 'student-a4e31feaf1',
    teacherId: 'teacher-695b7e061b',
    campusId: 'campus-2d2207a805',
    lastSyncedAppointmentId: '',
    lastSyncedDate: '',
    enableDemoLogin: true,
    role: '',
    authToken: '',
    manager: null
  }
});
