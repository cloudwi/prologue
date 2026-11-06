import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuestionChoices } from '@/components/question-choices';
import { SubScreen } from '@/components/sub-screen';
import { Radius, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { findDemoProfile } from '@/lib/demo-profiles';

const OPTIONS = [
  { id: 'outdoors', label: '밖에서 새로운 곳을 찾아요' },
  { id: 'home', label: '집에서 좋아하는 일을 해요' },
];

/** 가입 전 체험은 예시 데이터만 사용한다. 선택을 저장하거나 실제 소개를 요청하지 않는다. */
export default function PreviewScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string[]>([]);
  const firstOptionRef = useRef<View>(null);
  const profile = findDemoProfile(selected[0] === 'home' ? 'thursday-kitchen' : 'afternoon-walk')!;

  return (
    <SubScreen title="문답 체험" c={c}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.steps} accessibilityLabel={selected.length ? '내 생각 선택 완료. 예시 답을 읽어보세요.' : '내 생각을 고르면 예시 답이 열려요.'}>
          <Text style={[Type.label, { color: c.text }]}>내 생각 고르기</Text>
          <Text style={{ color: c.textSecondary }} accessibilityElementsHidden importantForAccessibility="no">›</Text>
          <Text style={[Type.label, { color: selected.length ? c.text : c.textSecondary }]}>예시 답 읽기</Text>
        </View>
        <View style={[styles.question, { backgroundColor: c.backgroundElement }]}>
          <Text style={[Type.caption, { color: c.textSecondary }]}>하루 한 문답, 이렇게 시작해요</Text>
          <Text style={[styles.questionTitle, { color: c.text }]}>쉬는 날에는 주로{'\n'}무엇을 하나요?</Text>
          <QuestionChoices inputType="SINGLE_CHOICE" options={OPTIONS} selected={selected} onChange={setSelected} disabled={false} c={c} firstOptionRef={firstOptionRef} />
        </View>
        <Text style={[styles.note, { color: c.textSecondary }]}>체험 선택은 저장되거나 다른 사람에게 공개되지 않아요.</Text>
        <View accessibilityLiveRegion="polite" style={[styles.reply, { backgroundColor: c.backgroundElement }]}>
          {selected.length > 0 ? <>
            <View style={styles.replyHeading}>
              <Text style={[Type.label, { color: c.text }]}>같은 질문에 남긴 답 · 예시</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="체험 선택 초기화" onPress={() => { setSelected([]); firstOptionRef.current?.focus(); }} style={styles.reset}>
                <Text style={[Type.caption, { color: c.textSecondary }]}>다시 고르기</Text>
              </Pressable>
            </View>
            <Text style={[styles.answer, { color: c.text }]}>{profile.letters[0].content}</Text>
            <View style={styles.profile}>
              <Image source={profile.photos[0]} style={styles.photo} contentFit="cover" accessibilityLabel="AI 생성 예시 프로필 사진" />
              <View style={styles.profileInfo}>
                <Text style={[Type.label, { color: c.text }]}>{profile.nickname}</Text>
                <Text style={[Type.caption, { color: c.textSecondary }]}>예시 프로필 · AI 생성 이미지</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/demo-profile', params: { id: profile.id } })} style={styles.profileLink}>
                <Text style={[Type.label, { color: c.text }]}>프로필 보기</Text>
              </Pressable>
            </View>
            <Text style={[styles.note, { color: c.textSecondary }]}>마음이 닿으면 앱에서 연락처를 담은 편지를 보낼 수 있어요.</Text>
          </> : <View style={styles.placeholder}>
            <Text style={[Type.title, { color: c.text }]}>같은 질문, 다른 생각</Text>
            <Text style={[styles.placeholderText, { color: c.textSecondary }]}>답을 하나 골라보세요.{'\n'}다른 사람의 생각이 이곳에 열려요.</Text>
          </View>}
        </View>
        <Text style={[styles.notice, { color: c.textSecondary }]}>실제 소개는 가입 후 시작돼요. 소개 가능한 상대가 없으면 새로운 상대를 기다릴 수 있어요.</Text>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.background }]}>
        <View style={styles.footerContent}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/consent')} style={({ pressed }) => [styles.start, { backgroundColor: c.primaryStrong, opacity: pressed ? 0.85 : 1 }]}>
            <Text style={[Type.button, { color: c.primaryText }]}>가입하고 문답 시작하기</Text>
          </Pressable>
          <Text style={[styles.footerNote, { color: c.textSecondary }]}>가입·매일의 문답·오늘의 상대 보기는 무료예요.</Text>
        </View>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  question: { padding: 20, gap: 16, borderRadius: Radius.lg },
  questionTitle: { ...Type.display },
  note: { ...Type.caption, lineHeight: 20 },
  reply: { padding: 20, gap: 16, borderRadius: Radius.lg, minHeight: 260 },
  replyHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  reset: { minHeight: 44, justifyContent: 'center' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingVertical: 32 },
  placeholderText: { ...Type.body, textAlign: 'center' },
  answer: { ...Type.read },
  profile: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  photo: { width: 48, height: 48, borderRadius: Radius.sm },
  profileInfo: { flex: 1, minWidth: 120, gap: 4 },
  profileLink: { minHeight: 44, justifyContent: 'center' },
  notice: { ...Type.caption, lineHeight: 20 },
  footer: { paddingTop: 12, paddingHorizontal: 20, gap: 8 },
  footerContent: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 8 },
  start: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
  footerNote: { ...Type.caption, textAlign: 'center' },
});
