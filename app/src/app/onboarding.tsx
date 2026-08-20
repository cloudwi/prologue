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
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BirthDatePicker } from '@/components/birth-date-picker';
import { HeightPicker } from '@/components/height-picker';
import { KeywordChips } from '@/components/keyword-chips';
import { PhotoCropModal } from '@/components/photo-crop';
import { PhotoGrid, pickPhotos, MIN_PHOTOS, MAX_PHOTOS } from '@/components/photo-grid';
import { PlaceholderInput } from '@/components/placeholder-input';
import { track } from '@/lib/analytics';
import { koreanManAge, parseBirthDigits } from '@/lib/birth-date';
import { formatPhoneDigits, isValidPhoneDigits, sanitizePhoneDigits } from '@/lib/phone';
import { toProfilePayload, type ProfileExtra } from '@/components/profile-extra-fields';
import { RegionPicker } from '@/components/region-picker';
import { HOBBIES, INTERESTS, KEYWORD_MAX, STRENGTHS } from '@/constants/profile';
import { Fonts, type ThemeColors } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { clearConsent, getConsent } from '@/lib/consent';
import { getLetterQuestions, writeLetter, LETTER_MIN_LENGTH, LETTER_MAX_LENGTH, type LetterQuestion } from '@/lib/letters';
import { completeOnboarding, type Gender } from '@/lib/member';
import { uploadPhoto } from '@/lib/photo';
import { useTheme } from '@/hooks/use-theme';

const EMPTY_EXTRA: ProfileExtra = { bio: '', avatarId: null, height: '', hobbies: [], interests: [], strengths: [] };
const BIO_MAX = 300;
// 쓰기로 했다면 인사 한 문단은 되도록 — 서버와 같은 값. 비워두고 넘어가는 것은 자유다.
const BIO_MIN = 30;

/** 가입 가능한 최소 만 나이 — 한국 성년. 서버(Member.validate)와 같은 기준. */
const ADULT_AGE = 19;

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
  /** 다음 버튼 바로 위에 고정되는 보조 UI — 키보드가 열려도 잘리지 않아야 하는 것(추천 칩 등). */
  footerAccessory?: ReactNode;
};

export default function OnboardingScreen() {
  const c = useTheme();
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
  const [phoneDigits, setPhoneDigits] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  // 자르기를 기다리는 사진 줄 — 고른 순서대로 한 장씩 4:5 창을 거쳐 photos로 들어간다.
  const [cropQueue, setCropQueue] = useState<{ uris: string[]; total: number } | null>(null);
  const [extra, setExtra] = useState<ProfileExtra>(EMPTY_EXTRA);
  // 필수 문답 — 질문 하나를 골라 답하면 프로필 문답으로 올라간다. 프로필이 빈 채 시작하지 않게.
  const [letterQuestions, setLetterQuestions] = useState<LetterQuestion[]>([]);
  const [letterIndex, setLetterIndex] = useState(0);
  const [letterDraft, setLetterDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  // 화면 진입 시 한 번 랜덤으로 고정되는 추천 닉네임 3개 (탭하면 입력됨)
  const [nameSuggestions] = useState(() =>
    [...NICKNAME_EXAMPLES].sort(() => Math.random() - 0.5).slice(0, 3),
  );
  const patchExtra = (patch: Partial<ProfileExtra>) => setExtra((prev) => ({ ...prev, ...patch }));

  // 스텝 전환 시 질문 블록이 아래에서 살짝 떠오르며 나타난다 — 장면이 넘어가는 호흡.
  const [enterAnim] = useState(() => new Animated.Value(1));

  // 필수 문답용 질문 풀 — 섞어서 한 장씩 보여준다. 실패하면 카드에서 다시 시도할 수 있다.
  function loadLetterQuestions() {
    getLetterQuestions()
      .then((qs) => setLetterQuestions([...qs].sort(() => Math.random() - 0.5)))
      .catch(() => {});
  }
  useEffect(() => {
    loadLetterQuestions();
  }, []);
  const currentLetterQuestion =
    letterQuestions.length > 0 ? letterQuestions[letterIndex % letterQuestions.length] : null;
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
        <PlaceholderInput
          value={nickname}
          onChangeText={setNickname}
          placeholder="닉네임을 입력해 주세요"
          placeholderTextColor={c.textSecondary}
          maxLength={30}
          autoFocus
          style={inputStyle}
        />
      ),
      // 추천 칩은 키보드 위에 고정 — 본문에 두면 키보드가 열릴 때 접힌 선에 잘린다.
      footerAccessory: (
        <View>
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
      valid: birthDate != null && age != null && age >= ADULT_AGE,
      content: (
        <>
          <BirthDatePicker value={birthDigits} onChange={setBirthDigits} c={c} />
          {age != null &&
            (age >= ADULT_AGE ? (
              <Text style={[styles.hint, { color: c.textSecondary }]}>만 {age}세</Text>
            ) : (
              <Text style={[styles.hint, { color: c.primaryStrong }]}>
                만 {ADULT_AGE}세 이상만 가입할 수 있어요
              </Text>
            ))}
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
    {
      key: 'phone',
      title: '전화번호를 알려주세요',
      subtitle: '프로필에 공개되지 않아요.\n마음이 닿아 편지를 보낼 때, 내가 담기로 한 경우에만 상대에게 전해져요.',
      valid: isValidPhoneDigits(phoneDigits),
      content: (
        <PlaceholderInput
          value={formatPhoneDigits(phoneDigits)}
          onChangeText={(t) => setPhoneDigits(sanitizePhoneDigits(t))}
          placeholder="010-0000-0000"
          placeholderTextColor={c.textSecondary}
          keyboardType="phone-pad"
          maxLength={13}
          style={inputStyle}
        />
      ),
    },
    {
      key: 'photos',
      title: '프로필 사진을 올려주세요',
      subtitle: `최소 ${MIN_PHOTOS}장, 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요. 첫 번째 사진이 대표 사진이에요.\n얼굴이 잘 보이는 사진만 등록돼요.`,
      valid: photos.length >= MIN_PHOTOS,
      content: (
        <PhotoGrid
          photos={photos}
          onAdd={async () => {
            // 고른 사진은 바로 넣지 않는다 — 한 장씩 4:5 창에서 자른 뒤에 들어간다.
            const picked = await pickPhotos(MAX_PHOTOS - photos.length);
            if (picked.length > 0) setCropQueue({ uris: picked, total: picked.length });
          }}
          onRemove={(photo) => setPhotos((prev) => prev.filter((p) => p !== photo))}
          busy={submitting}
          c={c}
        />
      ),
    },
    {
      // 필수 문답 — 프로필이 빈 채로 시작하지 않게, 가입의 마지막에 글 하나를 받는다.
      // 이 답은 프로필 문답(profile_letters)이 되어 상대가 프로필을 열면 바로 읽힌다.
      key: 'letter',
      title: '질문 하나에 답을 남겨주세요',
      subtitle: '이 답이 내 프로필의 첫 문답이 돼요.\n상대는 사진보다 이 글을 먼저 읽어요.',
      valid: !!currentLetterQuestion && letterDraft.trim().length >= LETTER_MIN_LENGTH,
      content: (
        <View>
          <View style={[styles.letterCard, { backgroundColor: c.backgroundElement }]}>
            {currentLetterQuestion ? (
              <Text style={[styles.letterQuestion, { color: c.text, fontFamily: Fonts.serif }]}>
                {currentLetterQuestion.content}
              </Text>
            ) : (
              <Pressable onPress={loadLetterQuestions} hitSlop={8}>
                <Text style={[styles.letterQuestion, { color: c.textSecondary }]}>
                  질문을 불러오지 못했어요. 탭해서 다시 시도
                </Text>
              </Pressable>
            )}
            <Pressable onPress={() => setLetterIndex((i) => i + 1)} hitSlop={8} style={styles.letterShuffleBtn}>
              <Text style={[styles.letterShuffle, { color: c.primaryStrong }]}>다른 질문 보기</Text>
            </Pressable>
          </View>
          <PlaceholderInput
            value={letterDraft}
            onChangeText={setLetterDraft}
            placeholder="한두 문장이면 충분해요. 나중에 MY에서 고칠 수 있어요."
            placeholderTextColor={c.textSecondary}
            multiline
            maxLength={LETTER_MAX_LENGTH}
            style={[styles.bioInput, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
          />
          <Text style={[styles.bioCounter, { color: c.textSecondary }]}>
            {letterDraft.trim().length > 0 && letterDraft.trim().length < LETTER_MIN_LENGTH
              ? `${LETTER_MIN_LENGTH}자 이상 · `
              : ''}
            {letterDraft.length}/{LETTER_MAX_LENGTH}
          </Text>
        </View>
      ),
    },
  ];

  // 선택 스텝 — 가입 후 이성에게 더 잘 보이기 위해 채우는 항목. MY에서도 언제든 수정 가능.
  const optionalSteps: StepDef[] = [
    {
      // 자기소개 — 프로필 편지의 첫 문단. 문답이 나를 대신 말해주지만, 먼저 건네는 인사 한 문단은 있어야 한다.
      key: 'bio',
      title: '나를 한 문단으로 소개해 주세요',
      subtitle: '상대가 내 프로필을 열면 가장 먼저 읽는 글이에요.\n인사처럼 가볍게, 나답게.',
      optional: true,
      filled: extra.bio.trim().length > 0,
      // 쓰다 말면(1~29자) 저장이 서버에서 막힌다 — 비우거나 한 문단을 채워야 넘어간다.
      valid: extra.bio.trim().length === 0 || extra.bio.trim().length >= BIO_MIN,
      content: (
        <View>
          <PlaceholderInput
            value={extra.bio}
            onChangeText={(bio) => patchExtra({ bio })}
            placeholder="예: 주말엔 한강에서 달리고, 평일 밤엔 책 한 권을 끼고 살아요."
            placeholderTextColor={c.textSecondary}
            multiline
            maxLength={BIO_MAX}
            style={[styles.bioInput, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
          />
          <Text style={[styles.bioCounter, { color: c.textSecondary }]}>
            {extra.bio.trim().length > 0 && extra.bio.trim().length < BIO_MIN ? `${BIO_MIN}자 이상 · ` : ''}
            {extra.bio.length}/{BIO_MAX}
          </Text>
        </View>
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
  const canAdvance = step.optional ? (step.valid ?? true) : !!step.valid;

  // PUT /members/me는 생성/수정 겸용 — 필수만으로 가입하고, 선택 입력 후 한 번 더 저장한다.
  async function saveProfile(): Promise<boolean> {
    try {
      // 동의 화면에서 적어둔 값 — 회원을 만드는 첫 저장에만 실려 간다.
      // (두 번째 저장 때는 이미 지워졌고, 서버도 기존 회원에게는 기록을 남기지 않는다)
      const consent = await getConsent();
      track('onboarding_completed');
      await completeOnboarding({
        nickname: nickname.trim(),
        gender: gender!,
        birthDate: birthDate!,
        preferredGender: preferredGender!,
        region: region.trim(),
        phone: phoneDigits,
        ...toProfilePayload(extra),
        ...(consent ? { consent } : {}),
      });
      if (consent) await clearConsent();
      return true;
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
      return false;
    }
  }

  /**
   * 선택된 로컬 사진들을 순차 업로드. 하나라도 실패하면 false.
   * 실패 시 이미 올라간 사진은 목록에서 빼둔다 — 다시 시도할 때 같은 사진이 두 번 올라가지 않게.
   * 얼굴이 없어 반려된(422 PHOTO_REJECTED) 사진은 그 자리에서 빼서 다른 사진으로 고르게 한다.
   */
  async function uploadPhotos(): Promise<boolean> {
    const pending = [...photos];
    for (let i = 0; i < pending.length; i++) {
      setUploadProgress(`사진 업로드 중... (${i + 1}/${pending.length})`);
      try {
        await uploadPhoto(pending[i]);
      } catch (e) {
        const rejected = e instanceof ApiError && e.code === 'PHOTO_REJECTED';
        setPhotos(pending.slice(rejected ? i + 1 : i));
        setUploadProgress('');
        Alert.alert(
          rejected ? `${i + 1}번째 사진은 쓸 수 없어요` : '사진 업로드 실패',
          e instanceof Error ? e.message : '잠시 후 다시 시도해주세요',
        );
        return false;
      }
    }
    setUploadProgress('');
    return true;
  }

  async function submitRequired() {
    if (submitting) return;
    setSubmitting(true);
    const profileOk = await saveProfile();
    if (!profileOk) { setSubmitting(false); return; }
    const photosOk = await uploadPhotos();
    if (!photosOk) { setSubmitting(false); return; }
    // 필수 문답 — 골라둔 질문에 남긴 답을 프로필 문답으로 올린다(계정은 이미 만들어진 뒤라서 여기서).
    try {
      if (currentLetterQuestion) await writeLetter(currentLetterQuestion.questionId, letterDraft.trim());
    } catch (e) {
      setSubmitting(false);
      Alert.alert('문답 저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
      return;
    }
    setSubmitting(false);
    setPhase('choice');
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
    ? (uploadProgress || '저장 중...')
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
              키·취미·관심사를 채우면 상대에게 더 잘 보여요.{'\n'}지금 하지 않아도 MY 탭에서 언제든 채울 수 있어요.
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
            {step.footerAccessory ? <View style={styles.footerAccessory}>{step.footerAccessory}</View> : null}
            <Pressable
              onPress={next}
              disabled={!canAdvance || submitting}
              style={[
                styles.submit,
                canAdvance
                  ? { backgroundColor: c.primary, opacity: submitting ? 0.7 : 1 }
                  : { backgroundColor: c.backgroundSelected },
              ]}
            >
              <Text style={[styles.submitText, { color: canAdvance ? c.primaryText : c.textSecondary }]}>
                {buttonLabel}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* 고른 사진을 한 장씩 4:5 창에서 자른다 — 프로필에 보이는 그대로 등록되도록. */}
      {cropQueue && cropQueue.uris.length > 0 && (
        <PhotoCropModal
          key={cropQueue.uris[0]}
          uri={cropQueue.uris[0]}
          progress={{ index: cropQueue.total - cropQueue.uris.length, total: cropQueue.total }}
          c={c}
          onDone={(cropped) => {
            setPhotos((prev) => [...prev, cropped].slice(0, MAX_PHOTOS));
            setCropQueue((q) => (q && q.uris.length > 1 ? { ...q, uris: q.uris.slice(1) } : null));
          }}
          onCancel={() => setCropQueue((q) => (q && q.uris.length > 1 ? { ...q, uris: q.uris.slice(1) } : null))}
        />
      )}
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
  bioInput: { minHeight: 160, borderRadius: 18, borderWidth: 1, padding: 16, fontSize: 16, lineHeight: 24, textAlignVertical: 'top' },
  bioCounter: { fontSize: 12, textAlign: 'right', marginTop: 6 },
  // 필수 문답 — 질문은 카드로, 답은 그 아래에.
  letterCard: { borderRadius: 18, padding: 18, marginBottom: 12 },
  letterQuestion: { fontSize: 17, lineHeight: 26, fontWeight: '700' },
  letterShuffleBtn: { alignSelf: 'flex-end', marginTop: 10 },
  letterShuffle: { fontSize: 13, fontWeight: '700' },
  content: { padding: 25, paddingTop: 48, paddingBottom: 24 },
  stepEyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 3 },
  title: { fontSize: 29, fontWeight: '700', marginTop: 12, lineHeight: 40 },
  subtitle: { fontSize: 15, marginTop: 10, lineHeight: 23 },
  stepBody: { marginTop: 40 },
  hint: { fontSize: 13, marginTop: 6 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  suggestHint: { fontSize: 13, marginBottom: 8 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footerAccessory: { marginBottom: 14 },
  suggestChip: { paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
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
