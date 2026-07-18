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
  View,
  useColorScheme,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BirthDatePicker } from '@/components/birth-date-picker';
import { HeightPicker } from '@/components/height-picker';
import { KeywordChips } from '@/components/keyword-chips';
import { PlaceholderInput } from '@/components/placeholder-input';
import { koreanManAge, parseBirthDigits } from '@/lib/birth-date';
import { AvatarPicker, toProfilePayload, type ProfileExtra } from '@/components/profile-extra-fields';
import { RegionPicker } from '@/components/region-picker';
import { HOBBIES, INTERESTS, KEYWORD_MAX, STRENGTHS } from '@/constants/profile';
import { Colors, Fonts, type ThemeColors } from '@/constants/theme';
import { completeOnboarding, type Gender } from '@/lib/member';

const EMPTY_EXTRA: ProfileExtra = { avatarId: null, bio: '', height: '', hobbies: [], interests: [], strengths: [] };

/** 닉네임 placeholder 예시 풀 (화면 진입 시 랜덤). */
const NICKNAME_EXAMPLES = [
  '봄날의곰', '책읽는여우', '느긋한고양이', '바다보는사람', '새벽의산책',
  '조용한위로', '별보는밤', '따뜻한문장', '오후의햇살', '깊은밤라디오',
];

/** 자기소개 예시 풀 (영감용 — 탭해도 채워지지 않는다). */
const BIO_EXAMPLES = [
  '평일엔 열심히 일하고, 주말 아침엔 한강을 달려요. 달리고 나서 마시는 커피 한 잔이 일주일의 낙이에요.',
  '지도를 켜고 안 가본 동네 카페를 찾아다니는 게 취미예요. 조용한 공간에서 나누는 긴 대화를 좋아해요.',
  '요리하는 걸 좋아해서 주말마다 새 레시피에 도전해요. 언젠가 제가 만든 파스타를 대접하고 싶네요.',
  '퇴근길엔 이어폰 끼고 한 정거장 먼저 내려서 걸어요. 그 30분이 하루 중 제일 소중한 시간이에요.',
  '집에선 영화와 책, 밖에선 등산과 캠핑 — 조용함과 활발함 사이 어딘가에 있는 사람이에요.',
  '동네 맛집 지도를 채워가는 재미로 살아요. 좋은 사람과 맛있는 걸 먹을 때 제일 행복해요.',
  '식물 키우는 재미에 푹 빠져 있어요. 아침에 창가 화분들 돌보는 걸로 하루를 시작해요.',
  '전시 보러 다니는 걸 좋아해요. 좋았던 작품 이야기를 밤새 나눌 수 있는 사람이면 더 좋아요.',
  '운동으로 하루를 마무리해요. 몸을 움직이고 나면 마음도 단정해지는 기분이라서요.',
  '주말마다 필름 카메라 들고 골목을 걸어요. 같은 풍경도 천천히 보면 다르게 보이더라고요.',
  '새로운 걸 배우는 중이에요. 요즘은 클라이밍 — 시작한 지 얼마 안 됐지만 제일 기다려지는 시간이에요.',
  '반려견 산책이 하루의 시작과 끝이에요. 강아지 좋아하시면 이미 절반은 통한 거예요.',
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
  const [birthDigits, setBirthDigits] = useState('');
  const [preferredGender, setPreferredGender] = useState<Gender | null>(null);
  // 사용자가 선호 성별을 직접 고른 적이 있는지 — 있으면 자동 선택으로 덮어쓰지 않는다
  const [preferredTouched, setPreferredTouched] = useState(false);

  // 본인 성별을 고르면 선호 성별을 반대 성별로 미리 선택해준다
  function selectGender(g: Gender) {
    setGender(g);
    if (!preferredTouched) setPreferredGender(g === 'MALE' ? 'FEMALE' : 'MALE');
  }
  const [region, setRegion] = useState('');
  const [extra, setExtra] = useState<ProfileExtra>(EMPTY_EXTRA);
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // 화면 진입 시 한 번 랜덤으로 고정되는 추천 닉네임 3개 (탭하면 입력됨)
  const [nameSuggestions] = useState(() =>
    [...NICKNAME_EXAMPLES].sort(() => Math.random() - 0.5).slice(0, 3),
  );
  // 자기소개 예시 3개 (영감용)
  const [bioExamples] = useState(() =>
    [...BIO_EXAMPLES].sort(() => Math.random() - 0.5).slice(0, 3),
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

  const birthDate = parseBirthDigits(birthDigits);
  const age = birthDate != null ? koreanManAge(birthDate) : null;

  const inputStyle: StyleProp<TextStyle> = [styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }];

  // 필수 스텝 — 모두 채워야 가입이 완료된다.
  const requiredSteps: StepDef[] = [
    {
      key: 'nickname',
      title: '어떤 이름으로 소개할까요?',
      subtitle: '상대에게는 실명 대신 이 닉네임으로 보여요.',
      valid: nickname.trim().length > 0,
      content: (
        <View>
          <PlaceholderInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="닉네임을 입력해 주세요"
            placeholderTextColor={c.textSecondary}
            maxLength={30}
            autoFocus
            style={inputStyle}
          />
          <Text style={[styles.suggestHint, { color: c.textSecondary }]}>이런 닉네임은 어때요?</Text>
          <View style={styles.suggestRow}>
            {nameSuggestions.map((name) => (
              <Pressable
                key={name}
                onPress={() => setNickname(name)}
                style={({ pressed }) => [
                  styles.suggestChip,
                  {
                    borderColor: c.border,
                    backgroundColor: nickname === name ? c.backgroundSelected : c.backgroundElement,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={{ color: c.text, fontSize: 14 }}>{name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ),
    },
    {
      key: 'gender',
      title: '성별을 알려주세요',
      valid: gender != null,
      content: <GenderToggle value={gender} onChange={selectGender} c={c} />,
    },
    {
      key: 'birthDate',
      title: '생년월일을 알려주세요',
      subtitle: '프로필에는 만 나이만 표시돼요.',
      valid: birthDate != null,
      content: (
        <>
          <BirthDatePicker value={birthDigits} onChange={setBirthDigits} c={c} />
          {age != null && <Text style={[styles.hint, { color: c.textSecondary }]}>만 {age}세</Text>}
        </>
      ),
    },
    {
      key: 'preferredGender',
      title: '어떤 분을 만나고 싶으세요?',
      valid: preferredGender != null,
      content: (
        <GenderToggle
          value={preferredGender}
          onChange={(g) => {
            setPreferredTouched(true);
            setPreferredGender(g);
          }}
          c={c}
        />
      ),
    },
    {
      key: 'region',
      title: '어디에 살고 계세요?',
      valid: region.trim().length > 0,
      content: <RegionPicker value={region || null} onChange={setRegion} c={c} />,
    },
  ];

  // 선택 스텝 — 가입 후 이성에게 더 잘 보이기 위해 채우는 항목. MY에서도 언제든 수정 가능.
  const optionalSteps: StepDef[] = [
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
      title: '한 문장으로 나를 소개해주세요',
      optional: true,
      filled: extra.bio.trim().length > 0,
      content: (
        <>
          <PlaceholderInput
            value={extra.bio}
            onChangeText={(t) => patchExtra({ bio: t })}
            placeholder="나를 한 문장으로 소개해보세요"
            placeholderTextColor={c.textSecondary}
            multiline
            maxLength={100}
            autoFocus
            style={[styles.bio, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
          />
          <Text style={[styles.counter, { color: c.textSecondary }]}>{extra.bio.length}/100</Text>
          <Text style={[styles.suggestHint, { color: c.textSecondary }]}>이런 식으로 써보세요</Text>
          {bioExamples.map((ex) => (
            <View
              key={ex}
              style={[styles.bioExample, { borderColor: c.border, backgroundColor: c.backgroundElement }]}
            >
              <Text lineBreakStrategyIOS="hangul-word" style={{ color: c.textSecondary, fontSize: 14, lineHeight: 21 }}>
                “{ex}”
              </Text>
            </View>
          ))}
        </>
      ),
    },
    {
      key: 'height',
      title: '키를 알려주세요',
      optional: true,
      filled: /^\d{2,3}$/.test(extra.height),
      content: <HeightPicker value={extra.height} onChange={(height) => patchExtra({ height })} c={c} />,
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

  // required(필수 입력) → choice(가입 완료, 선택 입력 여부 결정) → optional(선택 입력)
  const [phase, setPhase] = useState<'required' | 'choice' | 'optional'>('required');
  const steps = phase === 'optional' ? optionalSteps : requiredSteps;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const canAdvance = step.optional ? true : !!step.valid;

  // PUT /members/me는 생성/수정 겸용 — 필수만으로 가입하고, 선택 입력 후 한 번 더 저장한다.
  async function saveProfile(): Promise<boolean> {
    try {
      await completeOnboarding({
        nickname: nickname.trim(),
        gender: gender!,
        birthDate: birthDate!,
        preferredGender: preferredGender!,
        region: region.trim(),
        ...toProfilePayload(extra),
      });
      return true;
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
      return false;
    }
  }

  async function submitRequired() {
    if (submitting) return;
    setSubmitting(true);
    const ok = await saveProfile();
    setSubmitting(false);
    if (ok) setPhase('choice');
  }

  async function submitOptional() {
    if (submitting) return;
    setSubmitting(true);
    const ok = await saveProfile();
    setSubmitting(false);
    if (ok) router.replace('/discover');
  }

  function startOptional() {
    setStepIndex(0);
    setPhase('optional');
  }

  function next() {
    if (!canAdvance || submitting) return;
    if (isLast) {
      void (phase === 'required' ? submitRequired() : submitOptional());
    } else {
      setStepIndex(stepIndex + 1);
    }
  }

  const buttonLabel = submitting
    ? '저장 중...'
    : isLast
      ? phase === 'required'
        ? '가입 완료'
        : '시작하기'
      : step.optional && !step.filled
        ? '건너뛰기'
        : '다음';

  // 가입 완료 화면 — 선택 입력은 지금 하거나, MY에서 나중에.
  if (phase === 'choice') {
    return (
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.choiceBody}>
            <Text style={[styles.stepEyebrow, { color: c.primary }]}>WELCOME</Text>
            <Text lineBreakStrategyIOS="hangul-word" style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>
              가입이 완료됐어요!
            </Text>
            <Text lineBreakStrategyIOS="hangul-word" style={[styles.subtitle, { color: c.textSecondary }]}>
              아바타·자기소개·취미를 채우면 상대에게 더 잘 보여요.{'\n'}지금 하지 않아도 MY 탭에서 언제든 채울 수 있어요.
            </Text>
          </View>
          <View style={styles.choiceButtons}>
            <Pressable
              onPress={startOptional}
              style={({ pressed }) => [styles.submit, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.submitText, { color: c.primaryText }]}>프로필 마저 채우기</Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/discover')} hitSlop={8} style={styles.choiceLater}>
              <Text style={{ color: c.textSecondary, fontSize: 15 }}>나중에 할게요</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

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
              <Text lineBreakStrategyIOS="hangul-word" style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>{step.title}</Text>
              {step.subtitle ? (
                <Text lineBreakStrategyIOS="hangul-word" style={[styles.subtitle, { color: c.textSecondary }]}>{step.subtitle}</Text>
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
  suggestHint: { fontSize: 13, marginTop: 16, marginBottom: 8 },
  bioExample: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestChip: { paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bio: { minHeight: 72, borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 16, lineHeight: 23, textAlignVertical: 'top' },
  counter: { fontSize: 12, textAlign: 'right', marginTop: 6 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggle: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 25, paddingBottom: 12 },
  submit: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 16, fontWeight: '700' },
  choiceBody: { flex: 1, justifyContent: 'center', paddingHorizontal: 25 },
  choiceButtons: { paddingHorizontal: 25, paddingBottom: 12 },
  choiceLater: { alignItems: 'center', paddingVertical: 16 },
});
