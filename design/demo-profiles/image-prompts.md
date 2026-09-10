# 데모 프로필 사진 프롬프트

새 인물 여섯 명 × 세 장 = 열여덟 장. 뒤이어 남성 셋(잔디냄새·나무결·완행열차)이 아홉 장 더 있고,
기존 세 명의 교체분은 맨 아래에 따로 있다. 규칙과 슬롯의 뜻은 [README](README.md)를 먼저 본다.

2026-09-09에 전수 조사하고 다시 썼다. 무엇이 왜 틀렸는지는 아래 "자연스러움을 깨는 일곱 가지"에
남겼다 — 새 인물을 추가할 때 같은 함정을 다시 파지 않기 위해서다.

## 만드는 순서

1. **1번 사진부터** 뽑는다. 이 장이 그 사람의 얼굴을 정한다.
2. 마음에 드는 1번이 나오면, **그 이미지를 참조로 넣고** 2·3번을 뽑는다.
   같은 프롬프트를 세 번 돌리면 세 사람이 나온다 — 카드에서 상세로 넘어가는 순간 들통난다.
   참조를 넣을 때는 프롬프트 앞에 이 문장을 붙인다:
   `Use case: identity-preserve. Same fictional person as the supplied reference photo — keep her/his face, hair and build recognizable. New scene, new clothes and new pose as described below.`
3. **옷은 세 장 다 다르게 쓴다.** 참조 이미지를 넣으면 얼굴만 따라오는 게 아니라 옷도 따라온다.
   밤의라디오가 그렇게 세 장 모두 검정 상의로 나왔다 — 하룻밤에 몰아 찍은 앨범처럼 보인다.
   프로필 사진 석 장은 서로 다른 날의 사진이어야 한다. 그래서 사람마다 **옷·때**를 미리
   정해 두고, 2·3번 프롬프트 안에 그 옷을 이름으로 박아 넣었다.
4. 결과는 4:5로 뽑고, 파일명은 `demo-<id>-<번호>.jpg`로 저장한다.

## 자연스러움을 깨는 일곱 가지

첫 판 열여덟 장을 다시 읽으면서 찾은 것들이다. 전부 "그럴듯한 문장"이었지만 이미지 모델에게는
실패 지점이었다.

**1. 손이 화면 안에서 뭔가를 하고 있으면 팔이 부러진다.**
첫 판은 열여덟 장 중 열두 장이 그랬다. 밤의라디오 1번에서 실제로 터졌다 — 소매가 어깨에서
손까지 팔꿈치 없이 한 줄로 이어졌고, 손목에 커프스가 하나 더 겹쳤다.
**팔이 하나만 보이는 건 잘못이 아니다.** 셀카는 원래 그렇고, 기존 데모의 `hangang-2`가 그
사진이다. 문제는 개수가 아니라 그 하나에 팔꿈치가 없다는 것이다. 그래서 다시 쓴 판은
기본값을 **손을 화면 밖으로**에 두고, 손이 꼭 필요하면 어깨에서 손까지 경로가 짧은 자세
(가슴 앞, 무릎 위, 컵 하나)만 쓴다. **손가락 작업은 전부 뺐다** — 덩굴 묶기, 기타 코드 짚기,
채소 다발 집기는 손가락이 엉킨다.

**2. 얼굴에 물건을 붙이면 얼굴이 망가진다.**
첫 판의 `mouth closed around the spoon`(숟가락 물기)과 `steam fogging one lens slightly`
(안경 한쪽만 김서림)는 둘 다 얼굴 한복판을 건드린다. 모델은 이걸 그리려다 입과 안경을
뭉갠다. 얼굴 근처의 소품은 뺐다.

**3. 움직이는 순간은 정지된 순간보다 훨씬 잘 틀린다.**
`mid-stride`(걷는 중)가 세 장, `mouth open mid-shout`(외치는 중)가 한 장 있었다. 걷는 중은
다리가 겹치거나 뜨고, 외치는 중은 치아와 입가가 깨진다. 전부 **막 멈춘 순간**으로 바꿨다 —
멈춰 서서 돌아본다, 발을 딛고 선다. 동작감은 옷 주름과 머리카락이 대신 만든다.

**4. 사진에 안 보이는 걸 지시하면 프롬프트만 길어진다.**
`lips moving as he counts`(세면서 입을 움직인다), `a strand of hair she cannot push back with
floured hands`(반죽 묻은 손이라 못 넘기는 머리카락) 같은 문장은 소설이지 지시가 아니다.
길이만 늘려 다른 지시의 비중을 떨어뜨린다. 뺐다.

**5. 여섯 명의 1번이 전부 같은 문장이면 여섯 장이 같은 사진이 된다.**
첫 판은 여섯 명이 모두 `chest-up framing / looks straight into the lens`였다. 카드가 증명사진
여섯 장이 된다. 지금은 **거리·시선·찍은 사람을 여섯 명 다 다르게** 배분했다(아래 표).
눈맞춤이 카드에 유리한 건 맞지만, 여섯 장이 전부 같은 눈맞춤이면 그 이점이 사라진다.

**6. 배경에 사람이 또렷하게 있으면 그 사람이 부서진다.**
`demo-afternoonwalk-1-v4`의 배경 보행자가 그렇다 — 배낭을 멘 등이 보이는데 머리는 정면이고,
왼발은 걸어오는 방향과 반대로 꺾여 있다. 주인공만 보면 멀쩡한 사진인데 왼쪽 위에 사람 하나가
망가져 있다. 같은 세트의 `demo-hangang-3-v4`는 배경 러너들이 충분히 흐려서 아무 문제가 없다 —
차이는 **심도**다. 배경에는 사람을 두지 않거나, 두더라도 얼굴과 걸음이 안 읽힐 만큼 흐리게 둔다.

**7. 참조 이미지를 넣으면 옷이 따라와서 세 장이 같은 날이 된다.**
밤의라디오 세 장이 전부 검정 상의로 나왔다. 얼굴을 유지하려고 넣은 참조가 옷까지 유지해
버린 것이다. 프로필 사진 석 장은 서로 다른 날의 사진이어야 한다 — 사람마다 **옷·때**를
정해 두고 2·3번 프롬프트에 그 옷을 이름으로 적었다. 장소가 세 장 다 같던 두 사람
(파도소리·오래된등산화)은 한 장씩 다른 곳으로 옮겼다.

> 덧: 첫 판을 일괄 수정하면서 `head close to level — a small natural angle is fine, just not the
> tilted chin-up pose` 같은 **메타 설명이 지시문 한가운데 끼어든 문장**을 만들었다. 사람에게
> 하는 말이지 모델에게 하는 말이 아니라 문장만 끊어졌다. 다시 쓰면서 전부 짧은 지시형으로
> 되돌렸다. 프롬프트 안에는 "이래도 되고 저래도 된다"를 쓰지 않는다.

## 1번(카드) 배분

| 인물 | 거리 | 시선 | 찍은 사람 |
| --- | --- | --- | --- |
| 밤의라디오 | 가슴 위 | 렌즈 | 본인(셀카) |
| 주말텃밭 | 허리 위 | 렌즈 | 친구 |
| 파도소리 | 가슴 위 | 렌즈 | 친구 |
| 목요일의부엌 | 어깨 위, 몸은 비스듬 | 렌즈 | 친구 |
| 오래된등산화 | 허리 위 | 렌즈에서 살짝 빗겨 옆 | 일행 |
| 금요일의영화 | 얼굴 중심, 아래에서 위로 | 렌즈 | 친구 |

## 공통 꼬리말

**모든 프롬프트 끝에 이 블록을 붙인다.**

```text
Format: vertical 4:5 photograph, natural proportions, realistic 50mm perspective.
Realism: a believable everyday photo taken by a friend or by phone. Natural skin texture with visible pores and mild facial asymmetry, a few loose hair strands, ordinary clothing with real fabric wrinkles, slight fine film grain. Attractive but ordinary-looking, not a model or an idol.
Subject is an entirely fictional person, not based on any real person or celebrity.
Arms and hands: every visible arm must be readable — an unbroken shoulder to elbow to wrist path of plausible length, exactly five fingers on any visible hand. One visible arm is fine; in a selfie a single arm reaches toward the lens and that is correct. What is wrong is a sleeve running from shoulder to hand with no elbow in it, a hand further from its own shoulder than an arm can reach, a doubled cuff at one wrist, or an arm that disappears behind the torso while the other crosses the frame.
Stillness: a held moment, not an action freeze. Both feet planted, mouth not stretched open.
Background people: keep the background clear of people. If the location needs them, put them far away and clearly out of focus — never sharp enough to read a face or a stride. A legible background pedestrian comes out broken: head facing the camera on a torso that is turned away, feet pointing the wrong way.
Constraints: no chin-up coy pose, no repeated head tilt, no glossy beauty-filter skin, no waxy airbrushed face, no doll-like enlarged eyes, no exaggerated smile, no glamour or sexualized posing, no school uniform, no other identifiable people in focus, no text, no letters, no logo, no watermark, no collage, no interface or screenshot. Do not place the subject small in the middle of a wide empty background.
```

---

## 밤의라디오 — `demo-nightradio-{1,2,3}.jpg`

**인상**: Korean woman, age 26, small build, straight black shoulder-length hair with a blunt fringe, calm narrow eyes, light everyday makeup, plain oversized knitwear.

### 1번 — 셀카 / 렌즈를 본다

첫 판(2026-09-09)에서 **얼굴은 그대로 쓴다.** 방, 조명, 표정까지 원하던 그대로 나왔다.
팔만 틀렸으니 처음부터 다시 뽑지 않고, **첫 판을 참조로 넣어** 아래 둘 중 하나로 고쳐 뽑는다.
팔이 하나만 보이는 건 그대로 둔다 — 둘 다 그 하나에 팔꿈치를 돌려주는 방법이다.

*A — 셀카로 바꾼다. 팔 하나만 보이는 게 당연해진다.*
```text
Use case: identity-preserve.
Same fictional Korean woman as the supplied reference photo — keep her face, hair, fringe, black sweatshirt and the same night room with the LP shelf and the warm lamp.
Make it a phone selfie she took herself: her near arm reaches toward the lens, its shoulder and bent elbow both inside the frame, the forearm foreshortened by perspective. Her other arm rests down outside the frame. One sleeve cuff, five fingers.
Gaze: she looks into the lens at the slightly off-centre angle a selfie gives, a small closed-mouth smile.
Camera: the phone, just above her eye level and close, the room falling away behind her.
```

*B — 가장 안전하다. 손을 아예 화면 밖으로 보낸다.*
```text
Use case: identity-preserve.
Same fictional Korean woman as the supplied reference photo — keep her face, hair, fringe, black sweatshirt and the same night room with the LP shelf and the warm lamp exactly as they are.
Reframe closer: chest-up only, her head filling the upper third, both hands and the record sleeve now outside the bottom of the frame. Shoulders square and even, no arm crossing the frame.
Gaze: she looks straight into the lens, chin level, the same small closed-mouth smile.
Camera: at her eye level.
```

### 2번 — 얼굴 중심 / 시선은 화면 밖
```text
Use case: photorealistic-natural.
The same Korean woman standing at a turntable on a low shelf at night, the record already spinning. Warm lamplight from one side, cool blue city night through the window behind her.
Pose and gaze: head and shoulders, hands below the bottom edge of the frame. She looks down toward the record, eyes lowered, calm and unsmiling, listening.
Camera: from her side, slightly below her eye level, so the lamp rims her jaw.
```

### 3번 — 무릎 위 / 밤 산책
```text
Use case: photorealistic-natural.
The same Korean woman stopped on a quiet Seoul residential street late at night, in front of a lit vending machine, a long cardigan over her sweatshirt, both hands in the cardigan pockets. Wet asphalt, closed shutters, streetlight pooling.
Pose and gaze: framed from the knees up so she fills most of the frame. Standing still with both feet planted, her face turned three-quarters away toward the street, a private half-smile. She does not look at the camera.
Camera: low, near waist height, close to her.
```

---

## 주말텃밭 — `demo-weekendgarden-{1,2,3}.jpg`

**인상**: Korean woman, age 30, tall and sturdy build, dark brown hair tied back loosely with strands escaping, warm round face, sun-touched skin, bare face.

**옷·때**: ①흐린 아침의 밭 — 낡은 데님 셔츠 위 캔버스 앞치마 ②늦은 오후의 부엌 — 소매를
걷어올린 크림색 리넨 셔츠, 앞치마 없음 ③늦여름 오후의 밭 — 색 바랜 올리브색 티셔츠와
헐렁한 면바지, 밀짚모자는 등 뒤로 넘김.

### 1번 — 허리 위 / 친구가 찍어준 정면
```text
Use case: photorealistic-natural.
A candid portrait of a Korean woman, age 30 — dark brown hair tied back with loose strands escaping, a warm round face, faintly sun-touched skin. She stands at the edge of a small suburban vegetable plot on an overcast morning, a canvas apron over a faded denim shirt, a harvest basket set on the ground beside her feet.
Pose and gaze: framed from the waist up. Standing still, weight on one leg, both arms hanging relaxed at her sides with the hands near the bottom edge. She looks directly into the lens with an open unguarded grin, as if answering something a friend just said.
Camera: at her eye level, flat overcast daylight, no harsh shadows.
```

### 2번 — 얼굴 중심 / 시선은 화면 밖
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a cream linen shirt with the sleeves pushed up above the elbow, no apron. The same Korean woman in a home kitchen on another day, both hands sunk into bread dough on a floured wooden counter so the fingers are hidden in the dough. Late afternoon light from a side window, flour dust in the air.
Pose and gaze: head and shoulders, tightly framed, both elbows inside the frame and bent. She looks down at the dough, brows drawn in concentration, mouth closed.
Camera: at her eye level from slightly behind her shoulder.
```

### 3번 — 무릎 위 / 밭
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a faded olive t-shirt and loose cotton trousers, a straw hat pushed back off her head and hanging on its cord. The same Korean woman crouching between rows in the vegetable plot on a late summer afternoon, forearms resting across her knees, hands loose and empty. Tomato vines on bamboo stakes crowd the lower frame; a neighbour's low fence behind.
Pose and gaze: framed from the knees up so she fills most of the frame. Still, resting for a moment. Her face is in profile, turned along the row, calm and unsmiling.
Camera: crouched down at her level, close.
```

---

## 파도소리 — `demo-wavesound-{1,2,3}.jpg`

**인상**: Korean woman, age 28, athletic build, short dark hair often damp, strong eyebrows, tanned skin with freckles across the nose, bare face.

**옷·때**: ①일출 직후의 해변 — 래시가드 위에 수건 ②물에서 나온 뒤의 동네 카페 — 회색 후드
집업 ③흐린 아침의 물가 — 목까지 잠근 검정 웻수트. 세 장이 다 바다면 프로필이 단조로워지니
2번은 아예 실내로 옮겼다.

### 1번 — 가슴 위 / 렌즈를 본다
```text
Use case: photorealistic-natural.
A candid portrait of a Korean woman, age 28 — short dark hair still damp and pushed back, strong eyebrows, tanned skin with light freckles across her nose. She stands on a Busan beach just after sunrise, a towel around her shoulders over a plain rash guard, the sea flat and pale behind her.
Pose and gaze: chest-up framing. She holds both ends of the towel at her collarbone, elbows bent and close to her body, both hands near her own shoulders. She looks straight into the lens, laughing with her mouth only half open, still getting her breath back.
Camera: at her eye level, low warm morning sun from the side.
```

### 2번 — 얼굴 중심 / 시선은 화면 밖
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a grey zip hoodie over a plain t-shirt. The same Korean woman sitting at the window counter of a small Busan neighbourhood cafe on another morning, hair still damp and drying stiff with salt, a mug on the counter. The sea visible far below through the window, softly out of focus.
Pose and gaze: head and shoulders, hands below the bottom edge of the frame. She looks out through the window, away from the camera, eyes narrowed against the light, no smile.
Camera: from her side at her eye level.
```

### 3번 — 무릎 위 / 바다
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a black wetsuit zipped to the neck. The same Korean woman standing in ankle-deep shallows on an overcast Busan morning, her surfboard planted upright in the wet sand beside her, one hand resting on its upper rail at shoulder height. The headland faint behind.
Pose and gaze: framed from the knees up so she fills most of the frame. Standing still, both feet planted, head turned three-quarters away up the beach, mouth closed in a small smile.
Camera: low, near the water's surface, close to her.
```

---

## 목요일의부엌 — `demo-thursdaykitchen-{1,2,3}.jpg`

**인상**: Korean man, age 32, average build with broad shoulders, short black hair grown slightly long on top, light stubble, thin-rimmed glasses.

**옷·때**: ①저녁의 부엌 — 소매를 걷어올린 옥스퍼드 셔츠 ②낮의 부엌 — 짙은 회색 티셔츠 위
민무늬 리넨 앞치마 ③아침의 시장 — 얇은 니트 위에 열어 놓은 워크 재킷.

### 1번 — 어깨 위 / 몸은 비스듬, 얼굴만 렌즈로
```text
Use case: photorealistic-natural.
A candid portrait of a Korean man, age 32 — short black hair a little long on top, light stubble, thin-rimmed glasses, an oxford shirt with the sleeves rolled. He stands at a home kitchen counter in the evening, a dish towel over one shoulder, softly blurred jars and a chopping board behind him.
Pose and gaze: shoulders-up framing, his body turned about thirty degrees away from the camera, hands below the bottom edge of the frame. Only his head turns back toward the lens and he looks into it over his nearer shoulder, an easy closed-mouth smile as if someone just walked in.
Camera: at his eye level, warm light from a window on his left, glasses clear with no reflection.
```

### 2번 — 얼굴 중심 / 시선은 화면 밖
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a charcoal t-shirt under a plain linen apron. The same Korean man on another day, leaning over a pot on the stove, steam rising between him and the camera but well below his face. Daylight from the kitchen window.
Pose and gaze: head and shoulders, hands below the bottom edge of the frame. Eyes down toward the pot, brows raised as he judges the seasoning, mouth closed. Nothing near or touching his face; glasses clear and unfogged.
Camera: from his side, slightly below his eye level.
```

### 3번 — 무릎 위 / 시장
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a thin knit jumper under an unzipped work jacket. The same Korean man standing at a Korean neighbourhood market stall in the morning, a canvas tote hanging from his shoulder, crates of greens and peppers in front of him.
Pose and gaze: framed from the knees up so he fills most of the frame. Standing still, both feet planted, both arms hanging relaxed at his sides. Turned three-quarters away, looking down at the crates, ordinary neutral expression.
Camera: at his eye level, close, stalls compressed behind him and softly out of focus.
```

---

## 오래된등산화 — `demo-oldboots-{1,2,3}.jpg`

**인상**: Korean man, age 29, tall and lean, close-cropped black hair, tanned weathered face, quiet unsmiling default expression.

**옷·때**: ①아침의 능선 — 낡은 소프트쉘 재킷과 배낭끈 ②산에서 내려온 뒤의 동네 카페 —
회색 맨투맨 ③오후의 숲길 — 티셔츠 위 색 바랜 플리스. 산 사진만 셋이면 사는 사람이 안
보이니 2번은 일상으로 옮겼다.

### 1번 — 허리 위 / 시선이 렌즈에서 살짝 빗겨 있다
```text
Use case: photorealistic-natural.
A candid portrait of a Korean man, age 29 — close-cropped black hair, a tanned weathered face, tall and lean. He stands on a ridge on a Korean mountain in the morning, a worn soft-shell jacket half unzipped, pack straps on his shoulders, layered blue ridgelines far behind.
Pose and gaze: framed from the waist up. Standing still, thumbs hooked under his pack straps so both elbows are bent and close to his body. He is looking just past the camera at whoever is holding it, not quite into the lens, a small reluctant smile of someone who does not usually pose. Slightly out of breath.
Camera: at his eye level, clear cool morning light.
```

### 2번 — 얼굴 중심 / 시선은 화면 밖
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a plain grey sweatshirt. The same Korean man sitting at a small neighbourhood cafe on a weekday, an old film camera and a coffee on the table in front of him, city daylight through the window.
Pose and gaze: head and shoulders, hands below the bottom edge of the frame. He looks off to the side out of the window, calm and unsmiling, jaw relaxed. Nothing near his face.
Camera: from his side at his eye level, the room softly out of focus.
```

### 3번 — 무릎 위 / 산길
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a faded fleece over a t-shirt. The same Korean man standing still on a rooted forest trail in the afternoon, one hand resting flat on a tree trunk beside him at shoulder height, elbow bent. Well-used boots, dusty trousers, autumn leaves on the ground.
Pose and gaze: framed from the knees up so he fills most of the frame. Both feet planted, in profile, eyes on the trail ahead, jaw set.
Camera: from below on the trail, looking slightly up at him, close.
```

---

## 금요일의영화 — `demo-fridayfilm-{1,2,3}.jpg`

**인상**: Korean man, age 27, slim, soft wavy black hair falling over the forehead, clean-shaven, gentle features.

**옷·때**: ①밤의 방 — 흰 티셔츠 ②다른 밤의 방 — 티셔츠 위 낡은 오트밀색 카디건
③밤의 극장 앞 — 체크 셔츠 위 짙은 재킷.

### 1번 — 얼굴 중심 / 아래에서 위로, 렌즈를 본다
```text
Use case: photorealistic-natural.
A candid portrait of a Korean man, age 27 — slim, soft wavy black hair falling over his forehead, clean-shaven, gentle features, a plain white t-shirt. He sits on the floor of a small dark room leaning back against the side of a bed, a projector throwing a pale rectangle on the wall behind him. Only the projector glow and one small lamp.
Pose and gaze: head and upper chest, hands below the bottom edge of the frame. He looks up into the lens from where he sits, caught in the moment just after laughing at something said off camera, mouth closed but eyes still creased.
Camera: at standing height looking down at him, close.
```

### 2번 — 얼굴 중심 / 시선은 화면 밖
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: an old oatmeal cardigan over a t-shirt. The same Korean man sitting on the edge of his bed on another night, the neck of an old acoustic guitar leaning up across his chest and out of the top of the frame, a page of scribbled notes on the blanket.
Pose and gaze: head and shoulders, both hands below the bottom edge of the frame. He looks down at the notes, brow slightly furrowed, mouth closed.
Camera: from his side, slightly above his eye level, warm lamplight from behind him.
```

### 3번 — 무릎 위 / 밤거리
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a checked shirt under a dark jacket. The same Korean man standing just outside a small independent cinema at night, posters and a lit box office behind him on a Seoul side street, hands in his jacket pockets.
Pose and gaze: framed from the knees up so he fills most of the frame. Standing still, both feet planted, head turned three-quarters back over his shoulder toward the doors, still thinking about the film.
Camera: low, near waist height, close, street lights soft behind.
```

---

## 남성 셋 더 — 잔디냄새 · 나무결 · 완행열차

2026-09-10에 남성 데모를 여섯으로 채우려고 세 사람을 더 썼다(글은 [profiles.md](profiles.md)의
"남성 셋"). 위의 **만드는 순서·공통 꼬리말·일곱 가지를 그대로 따른다** — 새로 파는 함정이
아니라 이미 판 함정을 피하는 게 목적이다.

### 1번(카드) 배분 — 새 셋

| 인물 | 거리 | 시선 | 찍은 사람 | 카메라 높이 |
| --- | --- | --- | --- | --- |
| 잔디냄새 | 가슴 위, 서서 | 렌즈 | 팀 동료 | 눈높이 |
| 나무결 | 허리 위, 작업대 앞 | 렌즈 | 공방 동료 | 눈높이보다 살짝 위 |
| 완행열차 | 얼굴~가슴, 앉아서 | 렌즈 | 맞은편에 앉은 친구 | 눈높이보다 낮게 |

세 사람 다 한 장은 눈높이보다 낮은 카메라를 쓰는데(3번 함정), 그게 몇 번째 장인지는 사람마다
다르다 — 잔디냄새는 2번, 나무결은 3번, 완행열차는 1번이다. 손은 기본이 화면 밖이고, 프레임
안에 남긴 손은 셋뿐이다(공 하나, 컵 하나, 가방끈 하나) — 전부 어깨에서 손까지 경로가 짧다.

---

## 잔디냄새 — `demo-grassscent-{1,2,3}.jpg`

**인상**: Korean man, age 28, compact athletic build, short black hair damp at the hairline, thick straight eyebrows, tanned skin, clean-shaven.

**옷·때**: ①수요일 밤 풋살장 — 남색 무지 유니폼 티셔츠 ②토요일 낮 동네 식당 — 흰 티셔츠 위에
열어 놓은 데님 셔츠 ③평일 저녁 구장 앞 — 회색 트레이닝 후드 집업.

### 1번 — 가슴 위 / 렌즈를 본다, 팀 동료가 찍음
```text
Use case: photorealistic-natural.
A candid portrait of a Korean man, age 28 — compact athletic build, short black hair damp at the hairline, thick straight eyebrows, tanned skin, clean-shaven, a plain navy football shirt with no lettering. He stands on an empty artificial-turf futsal pitch at night, floodlights high behind him, the goal and the green fencing far back and out of focus. The pitch is empty; nobody else is on it.
Pose and gaze: chest-up framing. Standing still, shoulders square and level, both arms hanging at his sides with the hands below the bottom edge. He looks straight into the lens, breathing out, a wide closed-mouth grin, face still flushed from playing.
Camera: at his eye level, held by a teammate a couple of steps away. The floodlights rim his shoulders and one side of his face; the pitch behind him falls away dark.
```

### 2번 — 얼굴 중심 / 시선은 화면 밖
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a white t-shirt under an open denim shirt. The same Korean man on a Saturday afternoon, sitting at a window table in a small old neighbourhood restaurant on another day, the table and everything on it below the bottom edge of the frame. Daylight through the window; the street outside is soft and has no people in it.
Pose and gaze: head and shoulders, both hands below the bottom edge of the frame. He looks off to the side out of the window, mouth closed, eyebrows relaxed, in the middle of a thought.
Camera: from across the table, below his eye level looking slightly up, so the ceiling and the top of the window show behind him.
```

### 3번 — 무릎 위 / 구장 앞
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a grey zip-up training hoodie over shorts. The same Korean man stopped at the open gate of a fenced neighbourhood pitch on a weekday evening, a scuffed ball tucked under one arm against his ribs, that elbow bent and close to his body, the other arm hanging free. Green fencing and an empty pitch behind him, the floodlights just switched on against a sky that is still blue.
Pose and gaze: framed from the knees up so he fills most of the frame. Both feet planted, weight on the back foot, upper body turned three-quarters away, his face in profile looking down the empty pitch, mouth closed.
Camera: a little above his eye level, close, the fencing compressed and softly out of focus behind him.
```

---

## 나무결 — `demo-woodgrain-{1,2,3}.jpg`

**인상**: Korean man, age 33, tall and solidly built, black hair pushed back off the forehead, a broad jaw, clean-shaven, no glasses, faint lines at the eyes, tanned forearms.

**옷·때**: ①토요일 낮 공방 — 소매를 팔꿈치까지 걷어올린 회색 워크 셔츠 ②일요일 아침 집 —
남색 니트 ③늦은 오후 공방 문 앞 — 검정 티셔츠와 청바지.

### 1번 — 허리 위 / 렌즈를 본다, 공방 동료가 찍음
```text
Use case: photorealistic-natural.
A candid portrait of a Korean man, age 33 — tall and solidly built, black hair pushed back off his forehead, a broad jaw, clean-shaven, no glasses, tanned forearms. He stands at a workbench in a small woodworking shop on a Saturday, a grey work shirt with the sleeves rolled to the elbow, fine sawdust caught on his shoulders. Hand tools hang on a board behind him, softly out of focus. Nobody else in the shop.
Pose and gaze: framed from the waist up. Standing still, squared to the camera, both arms hanging at his sides with the hands below the bottom edge. He looks straight into the lens, chin level, a small closed-mouth smile of someone just interrupted at work.
Camera: slightly above his eye level, daylight from a high side window, dust visible in the beam.
```

### 2번 — 얼굴 중심 / 시선은 화면 밖
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a navy knit jumper. The same Korean man at home on a Sunday morning, standing by a window holding a plain mug at chest height in one hand, that elbow bent and close to his body, exactly five fingers around the mug, one cuff at that wrist. His other arm hangs down outside the frame. A quiet living room behind him, out of focus.
Pose and gaze: head and shoulders, the mug at the very bottom edge of the frame and well below his chin, nothing near his face. He looks out of the window away from the camera, eyes half-lowered, mouth closed, a slack unposed expression.
Camera: from his side at his eye level, flat morning light across his face.
```

### 3번 — 무릎 위 / 공방 문 앞
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a black t-shirt and jeans. The same Korean man standing in the open doorway of the workshop in the late afternoon, a finished small side table on the ground beside him, one hand laid flat on its top at hip height with that elbow bent. Low sun across the yard, a sawhorse and offcuts behind him, nobody else around.
Pose and gaze: framed from the knees up so he fills most of the frame. Both feet planted, body turned three-quarters away, head down looking at the table, mouth closed.
Camera: low, near hip height, looking slightly up at him, close.
```

---

## 완행열차 — `demo-slowtrain-{1,2,3}.jpg`

**인상**: Korean man, age 26, lean, straight black hair cut short and parted at the side with nothing falling over the forehead, slightly hollow cheeks, a small mole under one eye, clean-shaven, no glasses.

**옷·때**: ①토요일 아침 기차 안 — 베이지색 코듀로이 셔츠 ②평일 밤 동네 카페 — 짙은 남색 니트
③낯선 소도시의 낮 — 검정 바람막이와 작은 백팩.

### 1번 — 얼굴~가슴 / 앉은 채 렌즈를 본다, 맞은편 친구가 찍음
```text
Use case: photorealistic-natural.
A candid portrait of a Korean man, age 26 — lean, straight black hair cut short and parted at the side with nothing falling over his forehead, slightly hollow cheeks, a small mole under one eye, clean-shaven, a beige corduroy shirt. He sits by the window of a Korean intercity train on a Saturday morning, the carriage seats empty behind him, fields passing the window as a soft blur.
Pose and gaze: head and upper chest, both hands below the bottom edge of the frame. He has turned from the window back to the person sitting opposite and looks into the lens, eyebrows slightly raised, a small closed-mouth smile.
Camera: from the facing seat, a little below his eye level. Morning light from the window on one side of his face, the aisle dark behind him.
```

### 2번 — 얼굴 중심 / 시선은 화면 밖
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a dark navy knit jumper. The same Korean man on a weekday night at the corner table of a small cafe, an open notebook and a pen on the table below the bottom edge of the frame. Warm light from a single ceiling lamp; the rest of the room dim and empty.
Pose and gaze: head and shoulders, both hands below the bottom edge of the frame. He looks down at the notebook, eyes lowered, brow slightly drawn, mouth closed.
Camera: from his side, slightly above his eye level, the room falling into soft darkness behind him.
```

### 3번 — 무릎 위 / 낯선 역
```text
Use case: photorealistic-natural.
Different clothes from the reference photo: a black windbreaker over a t-shirt, a small backpack on one shoulder. The same Korean man standing still on the platform of a small country station in the early afternoon, one hand hooked over the backpack strap at his chest, that elbow bent and close to his body. A painted platform edge, a low canopy on iron posts, green hills beyond; the platform is empty.
Pose and gaze: framed from the knees up so he fills most of the frame. Both feet planted, head turned three-quarters away, looking down the empty track, mouth closed.
Camera: at his eye level, close, the platform compressed behind him.
```

---

## 기존 세 명 교체분

전부 다시 뽑을 필요는 없다. 9장 중 **세 장의 각도가 서로 같아 구분이 안 되는 사람**과,
**전신이라 인물이 작아진 장**만 갈아끼우면 된다.

교체할 때는 **기존 사진을 참조로 넣어** 같은 사람을 유지한다. 새 파일은 `-v5`로 올린다
(`demo-bookmark-1-v5.jpg`). 옛 파일은 지우고 `demo-profiles.ts`의 경로도 함께 바꾼다 —
이름을 그대로 두면 캐시가 옛 사진을 붙들고 있는다.

### 책갈피 1번 — 시선을 카메라로
```text
Use case: identity-preserve.
Same fictional Korean woman as the supplied reference photo — keep her face, hair and build recognizable. Same neighbourhood bookshop aisle, same grey knit sweater.
Change her head and gaze: she now turns to the camera and looks straight into the lens, chin level, a small closed-mouth smile. Chest-up framing, her head filling the upper third, both hands and the book below the bottom edge of the frame.
Keep the shelves, the light and the clothing as they are.
```

### 책갈피 3번 — 무릎 위로 다시 잡기 (2026-09-10 크롭으로 처리함)
```text
Use case: identity-preserve.
Same fictional Korean woman as the supplied reference photo — keep her face, hair, beige jacket, grey top and jeans. Same Jeju coastal path with the basalt wall and the sea.
Reframe much closer: from the knees up, so she fills most of the frame and the background is compressed behind her. Standing still with both feet planted, hair blowing across her face, looking away toward the sea.
Do not place her small in a wide landscape, and do not show her walking.
```

### 오후의산책 1번 — 배경 보행자 지우기 (2026-09-09 크롭으로 처리함)

배경 왼쪽의 보행자가 머리와 몸이 반대로 붙어 있었다. 그 사람이 왼쪽 가장자리(x 77~130)에만
있어서 **왼쪽 145px을 버리고 4:5를 다시 잡는 것으로 끝났다** — 다시 뽑지 않았다.
`demo-afternoonwalk-1-v5.jpg`가 그 결과이고, 인물이 프레임을 더 채워 카드 대표 사진으로는
오히려 나아졌다. 재생성이 답이 아닐 때가 있다: **망가진 게 가장자리에 있으면 자르는 게 싸고
확실하다.**

아래 프롬프트는 더 넓은 구도를 되찾고 싶을 때만 쓴다.

```text
Use case: identity-preserve.
Same fictional Korean woman as the supplied reference photo — keep her face, hair, cream cardigan, jeans, bag and pose exactly as they are, and keep the same street, shopfront and warm afternoon light.
Change only the background: remove the pedestrian with the backpack on the left side of the road entirely, and continue the empty road and crosswalk behind her in its place. Leave no person legible anywhere in the background.
Throw the whole background further out of focus so the street, the parked cars and any distant figures read as soft shapes only. She stays sharp.
```

### 오후의산책 3번 — 무릎 위로 다시 잡기 (2026-09-10 크롭으로 처리함)
```text
Use case: identity-preserve.
Same fictional Korean woman as the supplied reference photo — keep her face, hair, dark jacket and wide trousers. Same bright gallery interior with the colourful hanging work behind.
Reframe much closer: from the knees up, so she fills most of the frame. Stopped in front of one piece, both feet planted, hands in her pockets, head turned three-quarters away looking up at it, no smile.
Do not place her small in a wide empty room.
```

### 한강한바퀴 1번 — 자세 바로 세우기

지금 사진은 상체를 앞으로 숙이고 카메라를 올려다보는 자세라 각도가 부자연스럽다.

```text
Use case: identity-preserve.
Same fictional Korean woman as the supplied reference photo — keep her face, hair, white windbreaker and running clothes. Same Han river path with the bridge and skyline behind.
Change her posture: she now stands upright, shoulders level, both hands resting on her hips with the elbows out, breathing out after a run. She looks straight into the lens, chin level, a small tired smile. Chest-up framing.
Camera at her eye level, not above her.
```
