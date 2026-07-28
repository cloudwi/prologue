import { ComingSoon, SubScreen } from '@/components/sub-screen';
import { useTheme } from '@/hooks/use-theme';

export default function BlockedScreen() {
  const c = useTheme();
  return (
    <SubScreen title="지인 차단" c={c}>
      <ComingSoon
        c={c}
        description={'연락처를 대조해 아는 사람에게 소개되지 않게 하는 기능이에요.\n연락처를 서버에 그대로 올리지 않는 방식으로 준비하고 있어요.'}
      />
    </SubScreen>
  );
}
