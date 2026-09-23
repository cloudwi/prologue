-- 초대 건마다 그때 실제로 지급한 잉크를 남긴다.
--
-- **왜**: 초대받은 사람이 여성이면 보상을 2배로 주기 시작한다(ReferralPolicy.FEMALE_INVITEE_MULTIPLIER).
-- 액수가 조건에 따라 갈리는 순간부터 "이 초대에 얼마를 줬는가"를 잉크 원장만으로는 되짚기 어렵다 —
-- 원장은 사유(REFERRAL)와 액수만 있고 어느 초대 건인지 잇지 못한다. 배수나 상한을 뒤에 바꿔도
-- 그 시점의 값을 남기려면 초대 건에 박아 두는 게 맞다.
--
-- **무엇을**: referrals에 invitee_reward·inviter_reward를 더한다. 상한에 걸려 초대한 쪽이 못 받았으면 0.
-- 기존 행은 0 — 그때의 액수는 원장에서 찾는다. 성별 같은 근거 컬럼은 두지 않는다(액수로 충분하고, 개인정보는 최소로).
alter table referrals
    add column invitee_reward int not null default 0,
    add column inviter_reward int not null default 0;
