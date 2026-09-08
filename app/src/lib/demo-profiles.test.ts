import { DEMO_PROFILES, findDemoProfile } from './demo-profiles';

describe('demo profiles', () => {
  it('keeps every sample complete enough for the full profile preview', () => {
    expect(DEMO_PROFILES).toHaveLength(3);
    for (const profile of DEMO_PROFILES) {
      expect(profile.photos).toHaveLength(3);
      expect(profile.letters.length).toBeGreaterThanOrEqual(3);
      expect(Object.values(profile.facts).every(Boolean)).toBe(true);
      expect(profile.bio.length).toBeGreaterThan(40);
    }
  });

  it('finds only known demo profile ids', () => {
    expect(findDemoProfile('hangang-lap')?.nickname).toBe('한강한바퀴');
    expect(findDemoProfile('unknown')).toBeNull();
  });
});
