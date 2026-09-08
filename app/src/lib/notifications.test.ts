import { notificationRoute } from './notifications';

describe('notificationRoute', () => {
  it('알림 종류를 해당 화면으로 연결한다', () => {
    expect(notificationRoute({ screen: 'mails' })).toBe('/mails');
    expect(notificationRoute({ screen: 'feed' })).toBe('/feed');
    expect(notificationRoute({ screen: 'my-meetups' })).toBe('/my/events');
    expect(notificationRoute({ screen: 'ink' })).toBe('/my/ink');
  });

  it('알 수 없는 경로는 열지 않는다', () => {
    expect(notificationRoute({ screen: '/arbitrary' })).toBeNull();
    expect(notificationRoute({})).toBeNull();
  });
});
