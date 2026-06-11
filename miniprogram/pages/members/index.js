import { request } from '../../utils/request';
import { today } from '../../utils/request';

const normalizeDate = (value) => String(value || '').slice(0, 10);

const isExpiredMember = (member) => {
  const expiresAt = normalizeDate(member.expires_at);
  return member.status === 'expired'
    || member.contract_status === 'expired'
    || Boolean(expiresAt && expiresAt < today(0));
};

const isActiveMember = (member) => member.status === 'active'
  && member.contract_status === 'active'
  && !isExpiredMember(member);

const isInstallmentMember = (member) => member.payment_status === 'installment'
  && !isExpiredMember(member);

const matchesKeyword = (member, keyword) => {
  const normalized = keyword.trim();
  if (!normalized) return true;
  return [member.name, member.phone, member.course, member.campus_name]
    .some((value) => String(value || '').includes(normalized));
};

const filterMember = (member, filter) => {
  if (filter === 'expired') return isExpiredMember(member);
  if (filter === 'installment') return isInstallmentMember(member);
  return isActiveMember(member);
};

const decorateMember = (member) => {
  const hasRemainingLessons = member.remaining_lessons !== null
    && member.remaining_lessons !== undefined
    && member.remaining_lessons !== '';
  return {
    ...member,
    statusText: isExpiredMember(member) ? '已到期' : (member.payment_status === 'installment' ? '分期' : '在读'),
    progressText: member.progress || '暂无记录',
    lessonText: hasRemainingLessons
      ? `已上 ${member.completed_lessons || 0} 节 · 剩余 ${member.remaining_lessons} 节`
      : `按册学习 · 已上 ${member.completed_lessons || 0} 节`,
    expiresText: normalizeDate(member.expires_at) || '未填写到期日'
  };
};

Page({
  data: {
    keyword: '',
    activeFilter: 'active',
    filters: [
      { label: '在读会员', value: 'active' },
      { label: '已到期会员', value: 'expired' },
      { label: '分期会员', value: 'installment' }
    ],
    allMembers: [],
    members: []
  },
  onLoad() { this.load(); },
  onShow() { this.load(); },
  onInput(event) {
    this.setData({ keyword: event.detail.value });
    this.applyFilter();
  },
  selectFilter(event) {
    this.setData({ activeFilter: event.currentTarget.dataset.value });
    this.applyFilter();
  },
  async load() {
    const app = getApp();
    const allMembers = await request(`/teachers/${app.globalData.teacherId}/students?filter=all`) || [];
    this.setData({ allMembers });
    this.applyFilter();
  },
  applyFilter() {
    const { allMembers, activeFilter, keyword } = this.data;
    const members = allMembers
      .filter((item) => filterMember(item, activeFilter))
      .filter((item) => matchesKeyword(item, keyword))
      .map(decorateMember);
    const counts = {
      active: allMembers.filter((item) => filterMember(item, 'active')).length,
      expired: allMembers.filter((item) => filterMember(item, 'expired')).length,
      installment: allMembers.filter((item) => filterMember(item, 'installment')).length
    };
    this.setData({
      members,
      filters: this.data.filters.map((item) => ({
        ...item,
        displayLabel: `${item.label} ${counts[item.value] || 0}`
      }))
    });
  }
});
