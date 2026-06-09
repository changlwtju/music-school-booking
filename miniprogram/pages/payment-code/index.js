import { request } from '../../utils/request';

Page({
  data: {
    payment: {
      title: '菠菜现代音乐',
      payee: '',
      note: '',
      image: '/assets/brand/avatar.jpg',
      enabled: false
    }
  },
  async onLoad() {
    const payment = await request('/payment-code');
    if (payment) this.setData({ payment });
  }
});
