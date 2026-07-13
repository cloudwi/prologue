import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeywordChips } from '@/components/keyword-chips';
import { AvatarPicker, BodyTypeToggle, toProfilePayload, type ProfileExtra } from '@/components/profile-extra-fields';
import { RegionPicker } from '@/components/region-picker';
import { HOBBIES, INTERESTS, KEYWORD_MAX, STRENGTHS } from '@/constants/profile';
import { Colors, Fonts, type ThemeColors } from '@/constants/theme';
import { completeOnboarding, type Gender } from '@/lib/member';

const EMPTY_EXTRA: ProfileExtra = { avatarId: null, bio: '', height: '', bodyType: null, hobbies: [], interests: [], strengths: [] };

/** 닉네임 placeholder 예시 풀 (화면 진입 시 랜덤). */
const NICKNAME_EXAMPLES = [
  '봄날의곰', '책읽는여우', '느긋한고양이', '바다보는사람', '새벽의산책',
  '조용한위로', '별보는밤', '따뜻한문장', '오후의햇살', '깊은밤라디오',
];

/** 한 화면에 한 질문씩 보여주는 스텝 정의. */
type StepDef = {
  key: string;
  title: string;
  subtitle?: string;
  /** 건너뛸 수 있는 스텝 여부. */
  optional?: boolean;
  /** required 스텝: 다음으로 넘어갈 수 있는지. optional 스텝에선 무시된다. */
  valid?: boolean;
  /** optional 스텝: 뭔가 입력했는지 (버튼 라벨 '건너뛰기' ↔ '다음' 전환용). */
  filled?: boolean;
  content: ReactNode;
};

export default function OnboardingScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthYear, setBirthYear] = useState('');
  const [preferredGender, setPreferredGender] = useState<Gender | null>(null);
  const [region, setRegion] = useState('');
  const [extra, setExtra] = useState<ProfileExtra>(EMPTY_EXTRA);
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // 화면 진입 시 한 번 랜덤으로 고정되는 예시 닉네임
  const [namePlaceholder] = useState(
    () => NICKNAME_EXAMPLES[Math.floor(Math.random() * NICKNAME_EXAMPLES.length)],
  );

  const patchExtra = (patch: Partial<ProfileExtra>) => setExtra((prev) => ({ ...prev, ...patch }));

  // 스텝 전환 시 질문 블록이 아래에서 살짝 떠오르며 나타난다 — 장면이 넘어가는 호흡.
  const [enterAnim] = useState(() => new Animated.Value(1));
  useEffect(() => {
    enterAnim.setValue(0);
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [stepIndex, enterAnim]);

  const age = /^\d{4}$/.test(birthYear) ? new Date().getFullYear() - Number(birthYear) : null;

  const inputStyle: StyleProp<TextStyle> = [styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }];

  const steps: StepDef[] = [
    {
      key: 'nickname',
      title: '어떻게 불러드릴까요?',
      subtitle: '실명 대신 닉네임으로 나를 소개해요.',
      valid: nickname.trim().length > 0,
      content: (
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder={`예: ${namePlaceholder}`}
          placeholderTextColor={c.textSecondary}
          maxLength={30}
          autoFocus
          style={inputStyle}
        />
      ),
    },
    {
      key: 'gender',
      title: '성별을 알려주세요',
      valid: gender != null,
      content: <GenderToggle value={gender} onChange={setGender} c={c} />,
    },
    {
      key: 'birthYear',
      title: '몇 년생이신가요?',
      valid: /^\d{4}$/.test(birthYear),
      content: (
        <>
          <TextInput
            value={birthYear}
            onChangeText={(t) => setBirthYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder="예: 1999"
            placeholderTextColor={c.textSecondary}
            keyboardType="number-pad"
            autoFocus
            style={inputStyle}
          />
          {age != null && <Text style={[styles.hint, { color: c.textSecondary }]}>만 {age}세</Text>}
        </>
      ),
    },
    {
      key: 'preferredGender',
      title: '어떤 분을 만나고 싶으세요?',
      valid: preferredGender != null,
      content: <GenderToggle value={preferredGender} onChange={setPreferredGender} c={c} />,
    },
    {
      key: 'region',
      title: '어디에 살고 계세요?',
      valid: region.trim().length > 0,
      content: <RegionPicker value={region || null} onChange={setRegion} c={c} />,
    },
    {
      key: 'avatar',
      title: '나를 닮은 아바타를 골라주세요',
      subtitle: '사진은 없어요. 아바타로 첫인상을 대신해요.',
      optional: true,
      filled: extra.avatarId != null,
      content: <AvatarPicker value={extra.avatarId} onChange={(avatarId) => patchExtra({ avatarId })} c={c} />,
    },
    {
      key: 'bio',
      title: '한두 문장으로 나를 소개해주세요',
      optional: true,
      filled: extra.bio.trim().length > 0,
      content: (
        <>
          <TextInput
            value={extra.bio}
            onChangeText={(t) => patchExtra({ bio: t })}
            placeholder="나를 한두 문장으로 소개해보세요"
            placeholderTextColor={c.textSecondary}
            multiline
            maxLength={100}
            autoFocus
            style={[styles.bio, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
          />
          <Text style={[styles.counter, { color: c.textSecondary }]}>{extra.bio.length}/100</Text>
        </>
      ),
    },
    {
      key: 'height',
      title: '키를 알려주세요',
      optional: true,
      filled: /^\d{2,3}$/.test(extra.height),
      content: (
        <TextInput
          value={extra.height}
          onChangeText={(t) => patchExtra({ height: t.replace(/[^0-9]/g, '').slice(0, 3) })}
          placeholder="예: 175"
          placeholderTextColor={c.textSecondary}
          keyboardType="number-pad"
          autoFocus
          style={inputStyle}
        />
      ),
    },
    {
      key: 'bodyType',
      title: '체형을 알려주세요',
      optional: true,
      filled: extra.bodyType != null,
      content: <BodyTypeToggle value={extra.bodyType} onChange={(bodyType) => patchExtra({ bodyType })} c={c} />,
    },
    {
      key: 'hobbies',
      title: '취미를 골라주세요',
      subtitle: `최대 ${KEYWORD_MAX}개까지 고를 수 있어요.`,
      optional: true,
      filled: extra.hobbies.length > 0,
      content: <KeywordChips options={HOBBIES} selected={extra.hobbies} onChange={(v) => patchExtra({ hobbies: v })} c={c} max={KEYWORD_MAX} />,
    },
    {
      key: 'interests',
      title: '요즘 관심사는 무엇인가요?',
      subtitle: `최대 ${KEYWORD_MAX}개까지 고를 수 있어요.`,
      optional: true,
      filled: extra.interests.length > 0,
      content: <KeywordChips options={INTERESTS} selected={extra.interests} onChange={(v) => patchExtra({ interests: v })} c={c} max={KEYWORD_MAX} />,
    },
    {
      key: 'strengths',
      title: '나의 장점을 골라주세요',
      subtitle: '마지막이에요! 자세히 채울수록 매칭 확률이 올라가요.',
      optional: true,
      filled: extra.strengths.length > 0,
      content: <KeywordChips options={STRENGTHS} selected={extra.strengths} onChange={(v) => patchExtra({ strengths: v })} c={c} max={KEYWORD_MAX} />,
    },
  ];

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const canAdvance = step.optional ? true : !!step.valid;

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await completeOnboarding({
        nickname: nickname.trim(),
        gender: gender!,
        birthYear: Number(birthYear),
        preferredGender: preferredGender!,
        region: region.trim(),
        ...toProfilePayload(extra),
      });
      router.replace('/discover');
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (!canAdvance || submitting) return;
    if (isLast) {
      void submit();
    } else {
      setStepIndex(stepIndex + 1);
    }
  }

  const buttonLabel = submitting
    ? '저장 중...'
    : isLast
      ? '시작하기'
      : step.optional && !step.filled
        ? '건너뛰기'
        : '다음';

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex}>
          {/* 헤더: 뒤로가기 + 진행률 */}
          <View style={styles.header}>
            <Pressable
              onPress={() => setStepIndex(Math.max(0, stepIndex - 1))}
              hitSlop={12}
              disabled={stepIndex === 0}
              style={{ opacity: stepIndex === 0 ? 0 : 1 }}
            >
              <Text style={[styles.back, { color: c.text }]}>‹</Text>
            </Pressable>
            <View style={[styles.progressTrack, { backgroundColor: c.backgroundElement }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: c.primary, width: `${((stepIndex + 1) / steps.length) * 100}%` },
                ]}
              />
            </View>
            <Text style={[styles.stepCount, { color: c.textSecondary }]}>
              {stepIndex + 1}/{steps.length}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Animated.View
              style={{
                opacity: enterAnim,
                transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
              }}
            >
              <Text style={[styles.stepEyebrow, { color: c.primary }]}>Q{stepIndex + 1}</Text>
              <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>{step.title}</Text>
              {step.subtitle ? (
                <Text style={[styles.subtitle, { color: c.textSecondary }]}>{step.subtitle}</Text>
              ) : null}
              <View style={styles.stepBody}>{step.content}</View>
            </Animated.View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={next}
              disabled={!canAdvance || submitting}
              style={[styles.submit, { backgroundColor: c.primary, opacity: !canAdvance || submitting ? 0.5 : 1 }]}
            >
              <Text style={[styles.submitText, { color: c.primaryText }]}>{buttonLabel}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function GenderToggle({
  value,
  onChange,
  c,
}: {
  value: Gender | null;
  onChange: (g: Gender) => void;
  c: ThemeColors;
}) {
  const options: { key: Gender; label: string }[] = [
    { key: 'MALE', label: '남성' },
    { key: 'FEMALE', label: '여성' },
  ];
  return (
    <View style={styles.toggleRow}>
      {options.map((o) => {
        const selected = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.toggle,
              {
                backgroundColor: selected ? c.primary : c.backgroundElement,
                borderColor: selected ? c.primary : c.border,
              },
            ]}
          >
            <Text style={{ color: selected ? c.primaryText : c.text, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8 },
  back: { fontSize: 34, fontWeight: '300', lineHeight: 36, marginTop: -4 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  stepCount: { fontSize: 12, fontVariant: ['tabular-nums'] },
  content: { padding: 25, paddingTop: 48, paddingBottom: 24 },
  stepEyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 3 },
  title: { fontSize: 29, fontWeight: '700', marginTop: 12, lineHeight: 40 },
  subtitle: { fontSize: 15, marginTop: 10, lineHeight: 23 },
  stepBody: { marginTop: 40 },
  hint: { fontSize: 13, marginTop: 6 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  bio: { minHeight: 72, borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 16, lineHeight: 23, textAlignVertical: 'top' },
  counter: { fontSize: 12, textAlign: 'right', marginTop: 6 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggle: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 25, paddingBottom: 12 },
  submit: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 16, fontWeight: '700' },
});
