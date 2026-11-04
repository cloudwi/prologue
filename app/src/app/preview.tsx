import { useRouter } from 'expo-router';
import { useState } from 'react';
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
  const profile = findDemoProfile(selected[0] === 'home' ? 'thursday-kitchen' : 'afternoon-walk')!;

  return (
    <SubScreen title="문답 미리보기" c={c}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[Type.caption, { color: c.textSecondary }]}>가입 없이 체험하기</Text>
        <Text style={[styles.title, { color: c.text }]}>좋아하는 것부터{'\n'}이야기해요</Text>
        <Text style={[styles.intro, { color: c.textSecondary }]}>질문에 답하고, 다른 사람의 생각을 읽는 방식을 먼저 경험해보세요.</Text>
        <View style={[styles.question, { backgroundColor: c.backgroundElement }]}>
          <Text style={[styles.questionTitle, { color: c.text }]}>쉬는 날에는 주로 무엇을 하나요?</Text>
          <QuestionChoices inputType="SINGLE_CHOICE" options={OPTIONS} selected={selected} onChange={setSelected} disabled={false} c={c} />
        </View>
        <Text style={[styles.note, { color: c.textSecondary }]}>체험 선택은 저장되거나 다른 사람에게 공개되지 않아요.</Text>
        {selected.length > 0 && (
          <View accessibilityLiveRegion="polite" style={[styles.reply, { backgroundColor: c.backgroundElement }]}>
            <Text style={[Type.caption, { color: c.textSecondary }]}>이런 답으로 서로를 알아가요 · 예시</Text>
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
          </View>
        )}
        <Text style={[styles.notice, { color: c.textSecondary }]}>실제 소개는 가입 후 시작돼요. 소개 가능한 상대가 없으면 새로운 상대를 기다릴 수 있어요.</Text>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.background }]}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/consent')} style={({ pressed }) => [styles.start, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}>
          <Text style={[Type.button, { color: c.primaryText }]}>가입하고 문답 시작하기</Text>
        </Pressable>
        <Text style={[styles.footerNote, { color: c.textSecondary }]}>가입·매일의 문답·오늘의 상대 보기는 무료예요.</Text>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  title: { ...Type.display },
  intro: { ...Type.body },
  question: { padding: 20, gap: 20, borderRadius: Radius.lg },
  questionTitle: { ...Type.title },
  note: { ...Type.caption, lineHeight: 20 },
  reply: { padding: 20, gap: 20, borderRadius: Radius.lg },
  answer: { ...Type.read },
  profile: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  photo: { width: 48, height: 48, borderRadius: Radius.sm },
  profileInfo: { flex: 1, minWidth: 120, gap: 4 },
  profileLink: { minHeight: 44, justifyContent: 'center' },
  notice: { ...Type.caption, lineHeight: 20 },
  footer: { paddingTop: 12, paddingHorizontal: 20, gap: 8 },
  start: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
  footerNote: { ...Type.caption, textAlign: 'center' },
});
