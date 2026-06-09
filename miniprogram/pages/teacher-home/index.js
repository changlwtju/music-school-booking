Page({
  goSchedule() { wx.navigateTo({ url: '/pages/teacher-schedule/index' }); },
  goMembers() { wx.navigateTo({ url: '/pages/members/index' }); },
  goCampuses() { wx.navigateTo({ url: '/pages/campuses/index' }); },
  goPayment() { wx.navigateTo({ url: '/pages/payment-code/index' }); }
});
