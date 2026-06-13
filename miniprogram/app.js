App({
  onLaunch() {
    this.globalData.authToken = wx.getStorageSync('roleAuthToken') || wx.getStorageSync('managerAuthToken') || '';
    this.globalData.manager = wx.getStorageSync('managerProfile') || null;
    this.globalData.currentUser = wx.getStorageSync('roleUser') || null;
    const profile = wx.getStorageSync('roleProfile') || null;
    if (profile?.id && this.globalData.currentUser?.role === 'student') {
      this.globalData.studentId = profile.id;
      this.globalData.campusId = profile.campus_id || this.globalData.campusId;
    }
    if (profile?.id && this.globalData.currentUser?.role === 'teacher') {
      this.globalData.teacherId = profile.id;
      this.globalData.campusId = profile.campus_id || this.globalData.campusId;
    }
  },
  globalData: {
    apiBase: 'http://49.233.131.93',
    studentId: 'student-a4e31feaf1',
    teacherId: 'teacher-695b7e061b',
    campusId: 'campus-2d2207a805',
    lastSyncedAppointmentId: '',
    lastSyncedDate: '',
    enableDemoLogin: false,
    role: '',
    authToken: '',
    manager: null,
    currentUser: null
  }
});
