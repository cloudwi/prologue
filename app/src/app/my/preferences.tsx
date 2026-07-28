import { ComingSoon, SubScreen } from '@/components/sub-screen';
import { useTheme } from '@/hooks/use-theme';

export default function PreferencesScreen() {
  const c = useTheme();
  return (
    <SubScreen title="선호하는 이성" c={c}>
      <ComingSoon
        c={c}
        description={'만나고 싶은 나이대와 지역을 정할 수 있게 준비하고 있어요.\n지금은 기본 정보의 "만나고 싶은 성별"로만 소개돼요.'}
      />
    </SubScreen>
  );
}
