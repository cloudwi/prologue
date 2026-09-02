import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlaceholderInput } from '@/components/placeholder-input';
import { HOBBIES, INTERESTS, KEYWORD_MAX, STRENGTHS } from '@/constants/profile';
import { Radius, Type, type ThemeColors } from '@/constants/theme';

/**
 * 취미·관심사·장점을 한자리에서 고르는 창.
 *
 * 예전에는 세 벌의 칩을 전부 펼쳐 놓았다 — 106개가 세 덩이로 깔려서 "벌려놓고 장사하는" 꼴이었고
 * (유저 지적 2026-09-02), 그 앞에서 사람은 고르는 대신 스크롤만 한다.
 *
 * 세 가지를 바꿨다.
 * ① **고른 것이 맨 위에 모인다.** 지금 내 프로필이 무엇인지가 목록보다 먼저 보여야 한다.
 * ② **검색이 있다.** 원하는 말이 이미 있는 사람은 목록을 볼 이유가 없다 — 세 벌을 한 번에 훑는다.
 * ③ **처음엔 [PREVIEW]개만 펼친다.** 나머지는 "더 보기"로 접어 둔다. 목록의 길이가 아니라
 *    고르는 일이 화면의 주인이 되게.
 *
 * 저장은 여전히 셋으로 나뉜다(취미·관심사·장점). 화면에서 한 덩이로 보이는 것과
 * 데이터가 나뉘는 것은 다른 문제다 — 태그가 어느 서랍에서 나왔는지는 [ORIGIN]이 안다.
 */
export type TagSelection = {
  hobbies: string[];
  interests: string[];
  strengths: string[];
};

type GroupKey = keyof TagSelection;

const GROUPS: { key: GroupKey; title: string; options: readonly string[] }[] = [
  { key: 'hobbies', title: '취미', options: HOBBIES },
  { key: 'interests', title: '관심사', options: INTERESTS },
  { key: 'strengths', title: '나의 장점', options: STRENGTHS },
];

/** 태그 → 그 태그가 사는 서랍. 검색 결과에서 고른 태그를 제자리에 넣기 위해 필요하다. */
const ORIGIN: Record<string, GroupKey> = Object.fromEntries(
  GROUPS.flatMap((g) => g.options.map((option) => [option, g.key])),
);

/** 접힌 상태에서 보여주는 개수. */
const PREVIEW = 10;

export function TagPicker({
  value,
  onChange,
  c,
}: {
  value: TagSelection;
  onChange: (patch: Partial<TagSelection>) => void;
  c: ThemeColors;
}) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<GroupKey | null>(null);

  const selected = useMemo(
    () => [...value.hobbies, ...value.interests, ...value.strengths],
    [value.hobbies, value.interests, value.strengths],
  );

  const matches = useMemo(() => {
    const q = query.trim();
    if (q.length === 0) return [];
    return GROUPS.flatMap((g) => g.options).filter((option) => option.includes(q));
  }, [query]);

  function toggle(tag: string) {
    const group = ORIGIN[tag];
    if (!group) return;
    const current = value[group];
    if (current.includes(tag)) {
      onChange({ [group]: current.filter((t) => t !== tag) } as Partial<TagSelection>);
      return;
    }
    // 서랍마다 상한이 따로다 — 취미를 열다섯 개 골랐다고 관심사까지 막히면 안 된다.
    if (current.length >= KEYWORD_MAX) return;
    onChange({ [group]: [...current, tag] } as Partial<TagSelection>);
  }

  return (
    <View>
      {selected.length > 0 ? (
        <View style={styles.selectedBox}>
          {selected.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => toggle(tag)}
              accessibilityRole="button"
              accessibilityLabel={`${tag} 빼기`}
              style={[styles.selectedChip, { backgroundColor: c.primary }]}
            >
              <Text style={[styles.selectedText, { color: c.primaryText }]}>{tag}</Text>
              <Ionicons name="close" size={13} color={c.primaryText} />
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={[styles.empty, { color: c.textSecondary }]}>
          고른 태그가 여기 모여요. 아래에서 찾거나 골라보세요.
        </Text>
      )}

      <PlaceholderInput
        value={query}
        onChangeText={setQuery}
        placeholder="찾아보기 (예: 등산, 사진, 유머)"
        placeholderTextColor={c.textSecondary}
        style={[styles.search, { backgroundColor: c.backgroundElement, borderColor: c.border, color: c.text }]}
      />

      {query.trim().length > 0 ? (
        matches.length > 0 ? (
          <Chips tags={matches} selected={selected} onToggle={toggle} c={c} />
        ) : (
          <Text style={[styles.empty, { color: c.textSecondary }]}>찾는 말이 없어요. 비슷한 말로 골라볼까요?</Text>
        )
      ) : (
        GROUPS.map((group) => {
          const open = expanded === group.key;
          const shown = open ? group.options : group.options.slice(0, PREVIEW);
          const rest = group.options.length - shown.length;
          return (
            <View key={group.key} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={[styles.groupTitle, { color: c.text }]}>{group.title}</Text>
                {value[group.key].length > 0 && (
                  <Text style={[styles.groupCount, { color: c.textSecondary }]}>
                    {value[group.key].length}/{KEYWORD_MAX}
                  </Text>
                )}
              </View>
              <Chips tags={[...shown]} selected={selected} onToggle={toggle} c={c} />
              {rest > 0 && (
                <Pressable onPress={() => setExpanded(group.key)} hitSlop={8} style={styles.more}>
                  <Text style={[styles.moreText, { color: c.primaryStrong }]}>{rest}개 더 보기</Text>
                </Pressable>
              )}
              {open && (
                <Pressable onPress={() => setExpanded(null)} hitSlop={8} style={styles.more}>
                  <Text style={[styles.moreText, { color: c.textSecondary }]}>접기</Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

function Chips({
  tags,
  selected,
  onToggle,
  c,
}: {
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  c: ThemeColors;
}) {
  return (
    <View style={styles.wrap}>
      {tags.map((tag) => {
        const on = selected.includes(tag);
        return (
          <Pressable
            key={tag}
            onPress={() => onToggle(tag)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              styles.chip,
              { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primary : c.backgroundElement },
            ]}
          >
            <Text style={{ color: on ? c.primaryText : c.text, fontSize: 15, fontWeight: on ? '700' : '500' }}>
              {tag}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  selectedBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 12, paddingRight: 9, height: 34, borderRadius: Radius.pill },
  selectedText: { fontSize: 14, fontWeight: '600' },
  empty: { ...Type.caption, marginBottom: 14 },

  search: { height: 46, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 14, ...Type.body },

  group: { marginTop: 20 },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  groupTitle: { ...Type.label },
  groupCount: { ...Type.caption, fontVariant: ['tabular-nums'] },
  more: { paddingVertical: 10 },
  moreText: { ...Type.caption, fontWeight: '600' },

  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
