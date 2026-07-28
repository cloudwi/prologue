import { ComingSoon, SubScreen } from '@/components/sub-screen';
import { useTheme } from '@/hooks/use-theme';

export default function WithdrawScreen() {
  const c = useTheme();
  return (
    <SubScreen title="회원 탈퇴" c={c}>
      <ComingSoon
        c={c}
        description={'계정과 대화 기록을 삭제하는 기능을 준비하고 있어요.\n앱스토어 심사(5.1.1) 요건이라 출시 전에 반드시 들어갑니다.'}
      />
    </SubScreen>
  );
}
