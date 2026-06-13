App({
  onLaunch() {
    this.globalData.manager = wx.getStorageSync('roleProfile:manager') || null;
  },
  globalData: {
    apiBase: 'http://49.233.131.93',
    studentId: 'student-a4e31feaf1',
    teacherId: 'teacher-695b7e061b',
    campusId: 'campus-2d2207a805',
    lastSyncedAppointmentId: '',
    lastSyncedDate: '',
    developmentMode: true,
    developmentInspectorPhone: '18222288952',
    role: '',
    authToken: '',
    manager: null,
    currentUser: null
  }
});
