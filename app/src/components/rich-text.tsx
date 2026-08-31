import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, type ThemeColors } from '@/constants/theme';
import { thumbUrl } from '@/lib/image';
import { parseRich, type RichBlock } from '@/lib/rich-text';

/**
 * 모임 글 — 글자와 사진이 섞여 있는 그대로.
 *
 * 지금까지 앱은 사진을 못 그렸다. 서버가 `[사진1]` 표시를 걷어내고 글만 내려보냈기 때문인데,
 * 그건 표시를 모르는 옛 판을 지키려던 것이지 이게 낫다고 정한 적은 없다. 초대장 웹에서는
 * 사진이 글 사이에 놓여 있었고, 같은 모임을 앱에서 열면 그 자리가 비어 있었다.
 *
 * 조판 규칙은 초대장(MeetupInvitationPage)에서 가져왔다. 한쪽만 고치면 같은 글이 두 얼굴이 된다.
 *
 * 사진 크기가 표시에 실려 있으면 그 비율로 자리를 먼저 잡는다. 없으면 4:3으로 둔다 —
 * 아무 자리도 잡지 않으면 사진이 뜨는 순간 아래 글이 통째로 밀린다.
 */
type Props = {
  text: string | null | undefined;
  images?: string[];
  c: ThemeColors;
  /** 글자 크기·줄 간격 — 초대장 본문(16/29)과 지난 모임 요약(14.5/24)이 다르다. */
  size?: 'body' | 'small';
  /** 사진을 누르면 크게 본다. 넘기지 않으면 누를 수 없다. */
  onPressImage?: (url: string, index: number) => void;
  /**
   * 접어서 보여줄 줄 수. 주면 **첫 글덩이까지만** 그리고 그 글을 이 줄 수로 자른다.
   * 호스트가 쓰는 글은 길이를 정해줄 수 없어서, 펼치기 전에는 자리를 정해놓고 받는다.
   */
  maxLines?: number;
};

export function RichText({ text, images = [], c, size = 'body', onPressImage, maxLines }: Props) {
  const all = parseRich(text, images);
  if (!all.length) return null;

  /*
   * 접힌 상태에서는 첫 글덩이까지만 그린다.
   * 높이로 자르면 사진이 반쯤 잘려 보기 흉하다 — 글줄 경계에서 끊는 편이 깔끔하다.
   */
  const limitAt = maxLines == null ? -1 : Math.max(0, all.findIndex((b) => b.kind === 'text'));
  const blocks = maxLines == null ? all : all.slice(0, limitAt + 1);

  const type = size === 'small' ? styles.small : styles.body;
  /*
   * 사진이 몇 번째인지는 미리 세어 둔다.
   *
   * 그리면서 세면(shot += 1) 다시 그릴 때마다 값이 어긋난다 — 크게 보기가 엉뚱한 사진을
   * 연다. 블록 순서는 이미 정해져 있으니 셈도 먼저 끝내면 된다.
   */
  const photos: RichBlock[] = blocks.filter((b) => b.kind === 'photo');

  return (
    <View style={styles.wrap}>
      {blocks.map((b, i) => {
        if (b.kind === 'text') {
          return (
            <Text
              key={i}
              numberOfLines={maxLines != null && i === limitAt ? maxLines : undefined}
              style={[type, { color: c.text, textAlign: b.align }]}
            >
              {b.text}
            </Text>
          );
        }
        const at = photos.indexOf(b);
        const photo = (
          <Image
            // 폭을 알면 그만큼만 받는다 — 원본은 몇 MB짜리도 있다.
            source={{ uri: thumbUrl(b.url, b.width >= 100 ? 900 : 600) }}
            style={[styles.photo, { aspectRatio: b.ratio ?? 4 / 3, backgroundColor: c.backgroundElement }]}
            contentFit="cover"
            transition={160}
          />
        );
        return (
          <View key={i} style={[styles.photoRow, { width: `${b.width}%` }]}>
            {onPressImage ? (
              <Pressable onPress={() => onPressImage(b.url, at)}>{photo}</Pressable>
            ) : (
              photo
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  /*
   * 폭을 못 박는다.
   *
   * 이 덩이가 놓이는 절(Section)이 alignItems:'center'라, 폭을 주지 않으면 여기가 **글자
   * 길이만큼 쪼그라든다.** 그러면 75%로 놓은 사진이 화면의 75%가 아니라 '가장 긴 문장의
   * 75%'가 되고(440 폭에서 294px여야 할 사진이 172px로 나왔다), 왼쪽·오른쪽 정렬도
   * 아무 일을 하지 않는다 — 정렬할 빈자리가 없기 때문이다.
   */
  wrap: { width: '100%', alignItems: 'center', gap: 14 },
  /*
   * 글 한 덩이는 폭을 다 쓴다.
   *
   * alignItems: 'center'인 부모 안에서 폭을 주지 않으면 덩이가 제 글자 길이만큼 줄어들고,
   * 그러면 textAlign이 아무 일도 하지 않는다 — 왼쪽 정렬한 글이 가운데 선 것처럼 보인다.
   */
  body: { width: '100%', fontSize: 16, lineHeight: 29 },
  small: { width: '100%', fontSize: 14.5, lineHeight: 24 },
  photoRow: { alignSelf: 'center' },
  photo: { width: '100%', borderRadius: Radius.md },
});
