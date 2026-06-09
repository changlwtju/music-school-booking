import dayjs from 'dayjs';

export const DEFAULT_SLOTS = [
  ['12:00', '12:45'],
  ['12:45', '13:30'],
  ['13:30', '14:15'],
  ['14:15', '15:00'],
  ['15:00', '15:45'],
  ['15:45', '16:30'],
  ['16:30', '17:15'],
  ['17:45', '18:30'],
  ['18:30', '19:15'],
  ['19:15', '20:00']
];

export function isMonday(date) {
  return dayjs(date).day() === 1;
}

export function isReleased(date, now = dayjs()) {
  const target = dayjs(date);
  if (!target.isValid()) return false;
  if (target.isBefore(now, 'day') || target.isSame(now, 'day')) return true;
  if (target.diff(now, 'day') > 1) return false;
  return now.format('HH:mm') >= '20:00';
}

export function canSelfChange(date, startTime, now = dayjs()) {
  const start = dayjs(`${date} ${startTime}`);
  return start.diff(now, 'minute') >= 90;
}

export function buildSlots({ date, appointments = [], contract, now = dayjs() }) {
  const occupied = new Map(appointments.map((item) => [item.start_time, item]));
  const released = isReleased(date, now);
  const closed = isMonday(date);
  const noBalance = contract?.mode === 'fixed20' && remainingLessons(contract) <= 0;

  return DEFAULT_SLOTS.map(([startTime, endTime]) => {
    const appointment = occupied.get(startTime);
    let status = 'available';
    let reason = '';
    if (closed) {
      status = 'closed';
      reason = '周一全店休息';
    } else if (!released) {
      status = 'unreleased';
      reason = '课表尚未释放';
    } else if (noBalance) {
      status = 'disabled';
      reason = '剩余课时不足';
    } else if (appointment && appointment.status === 'booked') {
      status = 'occupied';
      reason = '该时间已被预约';
    }
    return { startTime, endTime, status, reason, appointment };
  });
}

export function remainingLessons(contract) {
  if (!contract || contract.mode !== 'fixed20') return null;
  return Math.max(0, Number(contract.total_lessons || 0) - Number(contract.completed_lessons || 0));
}
