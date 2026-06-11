import { request } from '../../utils/request';

async function bindDemoProfile(role) {
  const app = getApp();
  const result = await request('/auth/demo-login', { method: 'POST', data: { role } });
  if (!result?.profile) return;
  if (role === 'teacher') {
    app.globalData.teacherId = result.profile.id;
    app.globalData.campusId = result.profile.campus_id;
  } else {
    app.globalData.studentId = result.profile.id;
    app.globalData.campusId = result.profile.campus_id;
  }
}

Page({
  async enterStudent() {
    const app = getApp();
    app.globalData.role = 'student';
    await bindDemoProfile('student');
    wx.navigateTo({ url: '/pages/student-home/index' });
  },
  async enterTeacher() {
    const app = getApp();
    app.globalData.role = 'teacher';
    await bindDemoProfile('teacher');
    wx.navigateTo({ url: '/pages/teacher-home/index' });
  }
});
