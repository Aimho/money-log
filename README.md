# Money Log

행사별 축하금을 빠르게 기록하고 여러 사용자가 함께 관리할 수 있는 모바일 우선 장부입니다.

- 운영 주소: [https://moeny-log.netlify.app](https://moeny-log.netlify.app)
- 로그인: Supabase 이메일 매직링크
- 저장소: Supabase Postgres + 브라우저 로컬 캐시

## 주요 기능

- 행사 이름과 날짜 관리
- 이름·그룹·금액·메모 기록
- 한 문장 음성 입력에서 이름·그룹·금액 자동 분류
- 그룹별 필터와 합계·평균·인원·그룹 수 집계
- 최신순·금액순 정렬
- 삭제 실행 취소
- 사용자별 클라우드 장부
- 장부 소유자와 편집자 권한 분리
- 7일 동안 유효한 일회용 공유 링크
- 소유자의 클라우드 장부 영구 삭제
- 네트워크 장애 시 로컬 저장 후 재동기화
- 모바일 바텀시트와 데스크톱 고정 입력 패널

## 기술 구성

- Next.js 15 / React 19 / TypeScript
- Tailwind CSS 4 / Framer Motion
- Zustand
- Supabase Auth / Postgres / Row Level Security
- Vitest / ESLint
- Netlify

## 로컬 실행

Node.js 22 이상과 npm을 사용합니다.

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`에 Supabase 프로젝트 값을 입력합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Publishable key만 클라이언트에 사용합니다. `service_role` 또는 secret key를 환경변수에 넣거나 저장소에 커밋하면 안 됩니다.

## Supabase 설정

### 1. 데이터베이스 구성

Supabase Dashboard의 **SQL Editor**에서 다음 마이그레이션을 실행합니다.

```text
supabase/migrations/20260718000000_initial_ledger.sql
```

마이그레이션에는 다음 항목이 포함됩니다.

- 장부, 멤버, 기록, 초대 테이블
- 소유자와 편집자 권한
- 사용자별 접근을 제한하는 RLS 정책
- 장부 생성·삭제 및 공유 링크 RPC
- 초대 토큰 해시 저장과 일회성 사용 처리

이미 일부 SQL이 실행된 프로젝트에서도 다시 실행할 수 있도록 중복 객체를 처리합니다.

### 2. 이메일 로그인 활성화

Supabase Dashboard에서 **Authentication → Providers → Email**을 활성화합니다. 앱은 비밀번호 대신 이메일 매직링크를 사용합니다.

### 3. URL Configuration

Supabase Dashboard의 **Authentication → URL Configuration**을 다음처럼 설정합니다.

```text
Site URL
https://moeny-log.netlify.app

Redirect URLs
https://moeny-log.netlify.app/**
https://**--moeny-log.netlify.app/**
http://localhost:3000/**
```

- 첫 번째 Redirect URL은 운영 배포용입니다.
- 두 번째는 Netlify Deploy Preview용이며 Preview를 사용하지 않으면 생략할 수 있습니다.
- 세 번째는 로컬 개발용입니다.

## Netlify 배포

Netlify 프로젝트를 GitHub 저장소의 `main` 브랜치에 연결합니다.

Netlify의 **Site configuration → Environment variables**에 다음 값을 등록합니다.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

권장 빌드 설정:

```text
Build command: npm run build
Publish directory: .next
Node.js: 22
```

환경변수를 변경한 뒤에는 새 배포를 실행해야 빌드에 반영됩니다. `main` 브랜치에 push하면 연결된 Netlify 사이트에서 운영 배포가 시작됩니다.

## 공유 장부 동작

1. 장부 소유자가 상단의 **공유** 버튼을 누릅니다.
2. 생성된 링크를 참여자에게 전달합니다.
3. 참여자는 본인 이메일로 로그인한 뒤 링크를 엽니다.
4. 참여자는 편집자로 등록되어 기록을 추가·수정·삭제할 수 있습니다.

편집자는 행사 정보, 멤버, 장부 삭제를 관리할 수 없습니다. 공유 링크는 7일 동안 유효하고 한 번 사용하면 만료됩니다.

## 데이터 동기화

- 브라우저 변경사항은 먼저 로컬 캐시와 동기화 대기열에 저장됩니다.
- 온라인 상태에서는 Supabase와 자동으로 동기화합니다.
- 동기화 실패 시 상단에 기기 저장 상태와 재시도 동작을 표시합니다.
- 최초 로그인에서는 기존 로컬 장부를 계정에 가져올지 확인합니다.
- 가져오기를 선택하면 원격 기록을 지우지 않고 ID 기준으로 병합합니다.

## 품질 검사

배포 전 다음 명령을 모두 실행합니다.

```bash
npm run lint
npm test
npm run build
```

## 운영 배포 점검표

- [ ] Netlify 환경변수 2개 등록
- [ ] Supabase Site URL과 Redirect URLs 등록
- [ ] Supabase Email provider 활성화
- [ ] 데이터베이스 마이그레이션 실행
- [ ] 신규 사용자 매직링크 로그인 확인
- [ ] 장부 생성과 클라우드 저장 확인
- [ ] 다른 계정에서 공유 링크 참여 확인
- [ ] 소유자와 편집자 권한 차이 확인
- [ ] 오프라인 기록 후 재동기화 확인
- [ ] 클라우드 장부 삭제 확인
- [ ] 모바일 화면과 음성 입력 권한 확인

## 프로젝트 구조

```text
app/                          Next.js App Router 진입점
components/auth/              로그인과 클라우드 장부 연결
components/gift-ledger/       장부 UI와 입력 흐름
hooks/                        음성 입력 훅
lib/supabase/                 Supabase 클라이언트와 장부 API
lib/                          파싱, 동기화, 저장소 유틸리티
store/                        Zustand 상태와 영속화
supabase/migrations/          데이터베이스 스키마와 RLS
```
