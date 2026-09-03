# Maint Tool — Claude Code 인수인계 메모

최종 정리일: 2026-08-16 (Asia/Seoul)

> 이 문서는 Codex에서 장기간 진행한 Maint Tool 프로젝트를 Claude Code가 중단 없이 이어가기 위한 기준 문서다. 코드보다 이 문서가 우선하는 요구사항은 명시적으로 표시했다. 실제 수정 전에는 현재 코드와 기기 상태를 다시 확인한다.

## 1. 프로젝트 한 줄 설명

항공정비 업무용 오프라인 우선(offline-first) 도구다. 시간·길이 계산기, MEL/NEF·MOI 계열 날짜 계산, UTC/현지시간 비교, Flight Log 초안 작성·저장·복사·내보내기 기능을 하나의 모바일 앱에 제공한다.

## 2. 위치와 식별 정보

- 프로젝트 절대 경로: `/Users/parksunghyun/Documents/Maint Timer App`
- 앱 이름: `Maint Tool`
- iOS/Android 앱 ID: `com.parksunghyun.mainttool`
- 현재 공개 버전: `1.0.0`
- 주 대상 기기: iPhone 15 Pro, 세로 화면
- Git 브랜치: `main`
- 문서 작성 시 HEAD: `c96cb23`
- Supabase 프로젝트 ref: `gnqwidcabovqjulscpco`
- OAuth 앱 복귀 URL: `com.parksunghyun.mainttool://login-callback`

## 3. 가장 중요한 Git 주의사항

현재 작업 트리는 매우 dirty하며, 실제 앱의 핵심 파일 상당수가 아직 Git 기준으로 untracked다. 특히 `app.jsx`, `src/`, `ios/`, `android/`, `package.json` 등이 기존 Git 히스토리에 온전히 반영되지 않았다.

- 절대 `git reset --hard`, `git clean -fd`, 광범위한 checkout/restore를 하지 않는다.
- 먼저 `git status --short`와 diff를 확인한다.
- 현재 파일을 “낡은 임시 파일”로 간주해 삭제하면 안 된다.
- `app.js`는 빌드 산출물이지만 네이티브/웹 번들에 사용된다.
- `config.js`는 Git에서 제외되며 Supabase 공개 클라이언트 설정을 담는다. 서비스 역할 키나 OAuth client secret은 절대 앱/저장소에 넣지 않는다.

## 4. 기술 스택

- React 18
- esbuild 기반 커스텀 빌드 + Vite 개발 서버
- Capacitor 8 (iOS/Android)
- Supabase Auth/Database
- Capacitor Preferences, Keyboard, App, Browser, Filesystem, Share
- Phosphor Icons + 일부 react-icons 공식 브랜드 아이콘
- jsPDF
- RevenueCat 의존성과 관련 함수가 남아 있으나 현재 제품 요구사항에서는 사용하지 않는다.

주요 명령:

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run sync
pnpm run open:ios
pnpm run open:android
```

- `pnpm run build`: `app.jsx`를 `app.js`로 번들하고 `dist/` 생성
- `pnpm run sync`: 빌드 후 Capacitor iOS/Android 프로젝트에 최신 웹 번들 복사
- 로컬 미리보기: `http://localhost:4173/`

## 5. 핵심 파일 지도

- `app.jsx`: 대부분의 UI와 화면 상태, 계산기, 날짜 계산, LOG, 사이드 메뉴
- `index.html`: 전역 CSS, 반응형/모바일 레이아웃, 앱 진입 HTML
- `src/flight-log.js`: Flight Log 데이터 모델, 대문자 변환, 결과 문구 조합, 패스워드/회사 도메인 보조 함수
- `src/app-services.js`: 로컬 저장, Supabase 인증, OAuth 딥링크, 내보내기, 클라우드 업로드, 사용하지 않는 RevenueCat 코드
- `supabase/schema.sql`: `flight_log_drafts` 테이블과 RLS 정책
- `supabase/functions/delete-account/index.ts`: 계정 삭제 Edge Function 소스
- `capacitor.config.json`: 앱 ID, 앱 이름, 키보드 resize 설정
- `ios/`, `android/`: Capacitor 네이티브 프로젝트
- `BACKEND_SETUP.md`: Supabase/Google OAuth 설정 메모
- `APP_RELEASE_GUIDE.md`: 빌드·배포 메모. 일부 내용은 현재 제품과 불일치하므로 아래 기술 부채 참고
- `privacy.html`: 개인정보처리방침. 광고/무료체험 내용이 현재 결정과 불일치
- `qa-artifacts/layout-history-refresh/`: 최신 화면 캡처와 비교 이미지
- `design-qa.md`: 가장 최근 UI 검수 메모

## 6. 제품 탭 구조

상단 고정 탭은 네 개다.

1. `Calc.`
2. `MEL`
3. 기본 `NEF·MOI` — 사용자가 이름을 변경하면 상단 탭 이름도 즉시 함께 변경
4. `LOG`

예전 `ETC` 탭은 LOG로 대체되었다. `EtcTab` 함수가 코드에 남아 있을 수 있지만 현재 탭 목록에서는 사용하지 않는다.

## 7. 디자인 언어와 사용자 취향

### 전체 방향

- Apple 스타일, 밝은 회백색 배경, 흰 카드, 검정 타이포 중심
- 지나치게 평평하지 않되 그림자는 약하고 절제된 입체감
- 큰 구조는 둥근 사각형. 선택 날짜도 원보다 둥근 사각형을 선호
- 시스템 폰트: `-apple-system`, SF Pro 계열, Helvetica Neue
- 제목/라벨은 검정 볼드, 내용은 약간 회색
- 모바일 한 화면 안에 주요 기능이 가능한 한 모두 보이도록 구성
- iPhone 15 Pro에서 하단 잘림이 없어야 함
- 밝고 채도 높은 파랑보다 낮은 채도의 파랑을 선호

### 주요 색상

- Muted blue: `#2D4E8A`
- Muted red: `#8A3545`
- 앱 배경: `#F2F4F7`
- 주 텍스트: 검정 또는 `#111`
- 보조 내용: `#66748F`, `#7D8796` 계열
- UTC는 muted red, 선택한 현지 시간대는 muted blue

### 표현 규칙

- 상단 앱 헤더와 탭의 기본 크기/구조는 함부로 바꾸지 않는다.
- 계산기 키 숫자/연산자는 볼드. 계산 미리보기는 과도하게 볼드하지 않는다.
- History 목록의 계산 기록은 일반체가 기준이다.
- LOG 입력 라벨은 검정 볼드, 예시 placeholder는 아주 연한 회색·작은 글씨.
- 아이콘은 Phosphor 또는 공식 브랜드 아이콘을 사용한다. 이모지/수제 SVG/CSS 그림으로 제품 아이콘을 흉내 내지 않는다.
- 큰 개편은 먼저 서로 다른 이미지 샘플 3개를 보여주고 사용자가 선택한 뒤 구현한다. 작은 명시적 수정은 바로 구현해도 된다.

## 8. Calc. 탭

### 기능

- 일반 사칙연산, %, AC, backspace
- `hour`, `min` 시간 단위 계산
- `inch`, `ft` 길이 단위 계산과 변환
- 변환/순환 버튼
- 계산/변환 History 저장과 삭제
- `111hour`처럼 단위만 입력하고 `=`을 누르면 다른 시간 단위로 환산 표시

### 디자인/레이아웃

- 키패드: 4열 × 6행
- 상단 기능/단위 키는 옅은 파랑, AC/backspace는 옅은 빨강
- 숫자와 소수점은 흰색, 연산자는 옅은 파랑
- 연산 기호는 볼드
- 카드/키 그림자는 매우 약하게 유지
- iPhone 15 Pro에서 여섯 행 전체가 화면 안에 보여야 한다.
- 현재 `index.html`의 `max-height: 900px` 기준값은 대략:
  - `--calc-key-height: 64px`
  - `--calc-key-gap: 9px`
  - `--calc-display-height: 140px`
- 최신 393×852 QA에서는 마지막 키가 viewport 안에 들어왔다.

### 저장

- 계산 History localStorage key: `maintToolCalcHistory`

## 9. MEL 탭

- A: Specified Period — 사용자 일수 입력
- B: 3 Calendar Days
- C: 10 Calendar Days
- D: 120 Calendar Days
- Start Date를 Today 또는 Custom으로 선택
- UTC/KST(또는 선택 국가 시간대) 기준 결과를 함께 표시
- Apple 스타일 달력, 월/년 통합 휠, 불필요한 다음 달만 있는 마지막 주는 제거
- 월/년 선택 헤더는 중립 회색 유지
- 요일은 대문자·볼드
- 선택 날짜는 muted blue의 둥근 사각형
- UTC/KST 전환은 SET을 누르기 전에도 결과 미리보기에 즉시 반영

## 10. NEF·MOI 탭

- 기본 이름: `NEF·MOI`
- 기본 일수: 240 Calendar Days
- 이름과 기본 일수를 사용자가 수정 가능
- 저장 시 Preferences/localStorage에 유지되며 재실행 후 복원
- 이름을 CDL 등으로 바꾸면 카드 제목과 상단 탭 이름이 함께 변경되어야 함
- 편집 패널은 카드의 Caret Up/Down으로 열고 닫음
- Live Preview는 제거된 방향
- 관련 저장 기본값: `{ nefMoiName: "NEF·MOI", nefMoiDays: 240 }`

## 11. UTC와 기본 국가

- 앱 헤더의 UTC는 항상 기준으로 유지
- 사용자가 Settings에서 기본 국가/시간대를 고르면 앱 재실행 때 해당 시간대를 복원
- 저장 key: `maintTimerSelectedTz`
- Settings의 DEFAULT COUNTRY 요약에는 현재 `KOREA - KST`처럼 국가와 시간대만 표시
- 요약 카드에는 공항 코드를 표시하지 않는다.
- 국가 선택 목록에는 검색 편의를 위해 공항 코드를 표시한다. 예: Korea row의 두 번째 줄 `ICN,GMP,PUS,CJU`
- 국기는 시스템 컬러 이모지이며 별도 흰색 박스/그림자 없이 표시
- Settings에는 `UTC — FIXED` 카드를 두지 않는다.
- Settings/국가 목록은 세로 스크롤만 가능하며 좌우 흔들림이 없어야 한다.

## 12. LOG 탭

### 입력 필드

- `ECAM MSG`
- `FAULT CODE`
- `ACTION`
- `Ref. MANUAL`
- 모든 사용자 입력과 RESULT는 대문자로 변환
- 입력 전 예시 placeholder는 작은 연한 회색
- 필드가 예시값 자체를 실제 값으로 보유한 이전 데이터라면 포커스 시 자동 삭제
- Ref. MANUAL 예시는 두 줄:

```text
TSM XX-XX-XX-XXX-XXX-X
AMM XX-XX-XX-XXX-XXX-X
```

### RESULT 생성 규칙

`src/flight-log.js`의 `composeFullLog()`가 결정론적으로 조합한다.

예시 입력:

```text
FAULT CODE: 231233
ACTION: RESET RELATE C/B THEN VHF & ATIMS BITE TEST NML
TSM XX-XX-XX-XXX-XXX-X
AMM XX-XX-XX-XXX-XXX-X
```

기본 결과 형식:

```text
<F/C:231233> IAW TSM XX-XX-XX-XXX-XXX-X, PERFORMED RESET RELATE C/B THEN VHF & ATIMS BITE TEST NML. PER AMM XX-XX-XX-XXX-XXX-X.
```

- RESULT textarea는 처음부터 직접 수정 가능
- 사용자가 RESULT를 직접 수정하면 `fullLogOverride`로 저장
- Copy 버튼은 작은 테두리 박스 안에 복사 아이콘과 가깝게 배치
- `DELETE ALL`은 현재 입력폼만 초기화
- `SAVE`는 기기에 저장하고 가능하면 Supabase로 업로드
- Sign/Date/Crew Initials는 필요 없으며 삭제 상태를 유지
- LOG 상단 제목은 `LOG`이지 `FLIGHT LOG`가 아님
- History 텍스트는 빼고 아이콘만 사용
- History 아이콘은 문서/클립보드 우측 하단에 작은 시계가 겹친 형태
- 저장 History 제목은 ECAM MSG
- 최대 250개 로컬 저장, 화면에는 최근 8개 표시
- 키보드는 바깥 빈 공간 터치 또는 `DONE` 버튼으로 내릴 수 있어야 함

### 로컬 저장 key

- drafts: `maintToolFlightLogDraftsV1`
- current draft: `maintToolFlightLogCurrentV1`
- account: `maintToolAccountV1`
- auth metadata: `maintToolAuthMetaV1`

## 13. 사이드 메뉴

- 상단: 로그인 전 `Log in`, 로그인 후 이메일 계정명
- Settings
- Export / Backup
- Offline ready 상태
- 사이드 drawer는 좌우로 흔들리거나 가로 스크롤되면 안 됨
- 현재 Settings 메뉴 설명에 `Country, UTC reference, feedback`이 남아 있는데, Settings에서 UTC 카드를 삭제했으므로 `Country, timezone, feedback`처럼 수정하는 것이 맞다.

## 14. 로그인/인증

### UI 요구사항

- Google / Apple / Naver / Kakao OAuth 버튼
- 이메일/비밀번호 로그인과 회원가입
- Forgot password
- 비밀번호 보기 눈 아이콘은 유지하되 별도 사각 박스는 없음
- 비밀번호 정책: 8자 이상 + 영문 대문자 + 영문 소문자 + 숫자 + 특수문자
- 마지막 사용 공급자에는 검정 `LAST USED` 배지
- 공급자 버튼 일반 텍스트는 과도하게 볼드하지 않음. 마지막 사용 버튼만 시각적으로 조금 더 강조
- 로그인 완료 상태에서는 공급자 선택지가 아니라 계정 이메일과 로그아웃 표시

### 실제 연결 상태

- Supabase project URL과 공개 anon/publishable key는 로컬 `config.js`에 구성됨
- Google OAuth: 실제 로그인과 앱 딥링크 복귀까지 설정/검증 완료
- Web callback: `http://localhost:4173`
- Native callback: `com.parksunghyun.mainttool://login-callback`
- iOS URL scheme와 Android intent filter가 등록됨
- Apple: 개발자 콘솔/키/서비스 ID 설정이 없어 실제 로그인 미완료
- Naver: Supabase 기본 provider가 아니므로 custom provider/중계 구현과 Naver 개발자 등록이 필요. 현재 `custom:naver` 문자열만 있음
- Kakao: 개발자 콘솔 등록과 Supabase provider 설정이 없어 실제 로그인 미완료
- UI 버튼이 보인다고 실제 공급자 로그인이 완료된 것은 아님
- OAuth secret, Supabase service-role key는 절대 클라이언트에 넣지 않는다.

## 15. 오프라인과 클라우드 동기화

### 현재 되는 것

- 로그인 없이 계산, 날짜 계산, LOG 작성·저장·내보내기 가능
- Capacitor Preferences 우선, 실패하면 localStorage fallback
- 네트워크가 있으면 SAVE 시 Supabase `flight_log_drafts`에 upsert
- 오프라인 후 `online` 이벤트가 오면 현재 로컬 drafts를 업로드 시도
- RLS로 사용자는 자신의 행만 접근 가능

### 아직 미완료인 것

- 다른 기기의 클라우드 drafts를 다운로드해 로컬과 병합하는 pull 로직 없음
- 충돌 해결, updated_at 비교, conflict copy 없음
- 로컬 삭제를 cloud의 `deleted_at` 또는 delete로 반영하는 로직 없음
- 로그인 직후 cloud restore 없음
- 따라서 현재 문구의 “Sync across devices”는 완전한 기능이 아니다. 실제 다기기 연동 전에 pull/merge/delete sync를 구현해야 한다.
- `delete-account` Edge Function 소스는 있으나 실제 Supabase 배포 여부를 다시 확인해야 한다.

## 16. Export / Backup

- PDF, TXT, JSON 지원
- 네이티브에서는 Cache에 파일 작성 후 시스템 Share Sheet 사용
- TXT는 iOS Notes/Android 메모 앱 등 사용자가 선택한 앱으로 공유 가능
- JSON은 복원용 데이터지만 현재 앱 내부 import/restore UI는 없음

## 17. Feedback

- 기기 기본 이메일 앱을 `mailto:`로 연다.
- 로그인 이메일을 본문에 포함한다.
- 현재 `config.js`의 `feedbackEmail`이 비어 있을 수 있으므로 실제 관리자 수신 주소를 결정해 넣어야 한다.

## 18. 광고·무료체험·구독 — 현재 제품 결정

사용자는 광고, 무료체험, 유료구독을 당분간 모두 없애기로 최종 결정했다. 현재 앱은 모두 광고 없이 사용해야 한다.

하지만 코드/문서에 과거 실험이 남아 있다.

- `@revenuecat/purchases-capacitor` 의존성
- `src/app-services.js`의 purchase 관련 함수
- `src/flight-log.js`의 14일 trial 함수
- `app.jsx`의 사용되지 않는 `AdBanner`
- `privacy.html`의 광고/14일 무료체험/구독 문구

공개 배포 전 위 코드를 제거하거나 완전히 비활성으로 명시하고, 개인정보처리방침도 “광고 없음/구독 없음”으로 갱신해야 한다. 사용자의 최신 결정을 우선한다.

## 19. 앱 아이콘

현재 실제 PNG 아이콘(`icon-192.png`, `icon-512.png`)은 짙은 네이비 배경에 다음 세 줄 흰 글씨다.

```text
AIRCRAFT
MAINTENANCE
TOOL
```

중요: `icon.svg`는 아직 오래된 `A/C TIMER` 디자인이다. `manifest.json`이 SVG를 첫 번째 아이콘으로 참조하고 있으므로 PWA에서는 낡은 아이콘이 보일 수 있다. Claude가 정리할 때 SVG를 PNG와 같은 디자인으로 교체하거나 manifest에서 제거한다.

## 20. 네이티브 빌드/배포 상태

- iOS 프로젝트 생성 및 Personal Team 개발 서명 성공 이력 있음
- 실제 iPhone 15 Pro에 설치·실행 성공
- 최신 UI 수정 후에도 signed Debug build, install, relaunch까지 성공했다고 `design-qa.md`에 기록됨
- iOS는 세로 방향 고정
- Android 프로젝트/에뮬레이터 빌드 이력 있음

중요한 불일치:

- Android manifest에 `android.permission.INTERNET`이 현재 없다. 기존 오프라인 앱 때의 설정이다.
- Supabase OAuth/동기화를 Android에서 실제 사용하려면 INTERNET 권한을 추가하고 다시 테스트해야 한다.
- `APP_RELEASE_GUIDE.md`의 “인터넷 권한 없음”, “ETC 탭” 등의 내용은 현재 제품과 불일치한다.

## 21. 빌드/캐시 주의사항

- UI 수정 후 최소 `pnpm run build`와 `pnpm run sync`를 실행한다.
- `index.html`의 `app.js?v=...` cache-busting 문자열을 새 빌드 식별자로 갱신하면 기기에서 이전 화면이 남는 문제를 줄일 수 있다.
- 서비스워커 cache name은 아직 `maint-v1`; 공개 웹 업데이트 전 버전 전략을 정리한다.
- 사용자가 “휴대폰에서 업데이트가 안 됐다”고 하면:
  1. `pnpm run sync`
  2. Xcode signed build
  3. 기존 앱 프로세스 종료
  4. 새 앱 설치
  5. bundle `com.parksunghyun.mainttool` 재실행
  6. 설치된 App bundle 내부 `app.js`에 새 cache key가 있는지 확인

## 22. 최신 검수 기준

- 기본 viewport: iPhone 15 Pro에 해당하는 393 × 852 CSS px
- 최신 QA 캡처:
  - `qa-artifacts/layout-history-refresh/calculator.png`
  - `qa-artifacts/layout-history-refresh/settings.png`
  - `qa-artifacts/layout-history-refresh/log-final.png`
  - `qa-artifacts/layout-history-refresh/comparison.png`
- 브라우저 console warning/error가 없어야 함
- 계산기 마지막 행이 viewport 안에 있어야 함
- Settings 요약: `KOREA - KST`만 표시, UTC 카드 없음
- 국가 drawer: `scrollWidth === clientWidth`, 가로 overflow 없음
- LOG 카드 제목: `LOG`
- History: document + small clock icon

## 23. 알려진 기술 부채/정리 우선순위

우선순위 높은 순:

1. dirty/untracked 작업 전체를 안전하게 검토하고 의미 있는 첫 커밋 생성
2. 광고/RevenueCat/trial 잔여 코드와 stale privacy 문구 제거
3. cloud pull/merge/delete 동기화 구현
4. Apple/Naver/Kakao OAuth 실제 공급자 등록·연동
5. Android INTERNET 권한 추가 후 OAuth/동기화 실기기 검증
6. 오래된 `icon.svg` 교체 및 manifest 정리
7. `APP_RELEASE_GUIDE.md` 최신화
8. `feedbackEmail` 실제 주소 설정
9. JSON backup import/restore 기능 추가 여부 결정
10. 자동 테스트 부재 보완 — 특히 계산식, 날짜 경계, DST, composeFullLog, 저장/복원

## 24. Claude Code 작업 원칙

1. 먼저 `git status`, 현재 화면, 관련 파일을 읽고 시작한다.
2. 사용자 변경을 보존하고 관련 없는 파일을 정리하거나 되돌리지 않는다.
3. 디자인 변경은 기존 시스템 폰트·색상·검정 카드 스타일을 유지한다.
4. 밝은 파랑, 과도한 그림자, 큰 아이콘, 불필요한 설명 텍스트를 새로 만들지 않는다.
5. iPhone 15 Pro에서 키보드·safe area·하단 잘림을 반드시 확인한다.
6. 오프라인 우선을 깨지 않는다. 네트워크 실패가 로컬 저장을 막으면 안 된다.
7. LOG/정비 데이터와 비밀번호를 analytics나 로그로 전송하지 않는다.
8. 생성된 RESULT는 참고용 초안이며 항상 사용자 편집 가능해야 한다.
9. OAuth provider가 실제 등록되지 않았으면 “완료”라고 표현하지 않는다.
10. 수정 후 `pnpm run build`, 필요 시 `pnpm run sync`, 브라우저 QA, 네이티브 QA 순으로 검증한다.

## 25. 다음 Claude 세션에 바로 붙여 넣을 시작 프롬프트

```text
이 프로젝트는 /Users/parksunghyun/Documents/Maint Timer App 에 있는 Maint Tool이다.
먼저 CLAUDE_HANDOFF.md를 끝까지 읽고, git status와 현재 코드를 확인해라.
작업 트리는 매우 dirty/untracked 상태이므로 어떤 기존 변경도 reset/clean/restore하지 마라.
Maint Tool은 항공정비용 offline-first 계산기/MEL 날짜계산/LOG 작성 앱이며 iPhone 15 Pro가 1차 기준이다.
사용자가 새로 요청한 범위만 수정하고, 기존 디자인 언어(검정 카드, 회백색 배경, muted red #8A3545, muted blue #2D4E8A, Apple 시스템 폰트)를 유지해라.
OAuth와 cloud sync는 문서의 완료/미완료 구분을 그대로 존중하고, 보안 키를 출력하거나 커밋하지 마라.
수정 후 pnpm run build 및 필요한 Capacitor sync/QA를 수행하고 결과와 남은 제한사항을 명확히 보고해라.
```

