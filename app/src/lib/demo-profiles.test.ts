import { DEMO_PROFILES, findDemoProfile, pickDemoProfiles } from './demo-profiles';

describe('demo profiles', () => {
  it('keeps every sample complete enough for the full profile preview', () => {
    expect(DEMO_PROFILES.length).toBeGreaterThanOrEqual(3);
    for (const profile of DEMO_PROFILES) {
      expect(profile.photos).toHaveLength(3);
      expect(profile.letters.length).toBeGreaterThanOrEqual(3);
      expect(Object.values(profile.facts).every(Boolean)).toBe(true);
      expect(profile.bio.length).toBeGreaterThan(40);
      expect(['MALE', 'FEMALE']).toContain(profile.gender);
    }
  });

  it('finds only known demo profile ids', () => {
    expect(findDemoProfile('hangang-lap')?.nickname).toBe('한강한바퀴');
    expect(findDemoProfile('unknown')).toBeNull();
  });
});

describe('오늘 보여줄 데모 고르기', () => {
  const day = (iso: string) => new Date(`${iso}T09:00:00`);

  it('선호 성별을 모르면 아무도 보여주지 않는다', () => {
    expect(pickDemoProfiles(null)).toEqual([]);
    expect(pickDemoProfiles(undefined)).toEqual([]);
  });

  it('선호 성별에 맞는 사람만, 최대 세 명까지 고른다', () => {
    for (const gender of ['FEMALE', 'MALE'] as const) {
      const picked = pickDemoProfiles(gender, day('2026-09-09'));
      expect(picked.length).toBeLessThanOrEqual(3);
      expect(picked.every((profile) => profile.gender === gender)).toBe(true);
    }
  });

  // 새로고침할 때마다 얼굴이 바뀌면 미리보기가 아니라 뽑기가 된다.
  it('같은 날에는 늘 같은 사람이 나온다', () => {
    const first = pickDemoProfiles('FEMALE', day('2026-09-09')).map((p) => p.id);
    const again = pickDemoProfiles('FEMALE', day('2026-09-09')).map((p) => p.id);
    expect(again).toEqual(first);
  });

  // 준비해 둔 사람이 셋을 넘으면, 아무도 영영 묻혀 있어서는 안 된다.
  it('날이 바뀌면 조합도 바뀌어 모든 데모가 언젠가 나온다', () => {
    for (const gender of ['FEMALE', 'MALE'] as const) {
      const pool = DEMO_PROFILES.filter((profile) => profile.gender === gender);
      if (pool.length === 0) continue;
      const seen = new Set<string>();
      for (let d = 1; d <= 28; d++) {
        const date = day(`2026-09-${String(d).padStart(2, '0')}`);
        for (const profile of pickDemoProfiles(gender, date)) seen.add(profile.id);
      }
      expect(seen.size).toBe(pool.length);
    }
  });
});
