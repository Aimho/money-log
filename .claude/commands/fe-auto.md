---
name: fe-auto
description: 프론트엔드 작업을 분석해 적절한 서브 모델·전문가에게 자동 위임하고 검증까지 진행
parameters:
  - name: request
    description: 처리할 프론트엔드 작업 지시문
    required: false
  - name: route
    description: 라우팅 강제 지정 (ui, debug, architecture, refactor, test, docs, browser, quick)
    required: false
  - name: fast
    description: 검증은 유지하되 가능한 한 가장 짧은 경로로 처리
    required: false
    type: boolean
  - name: aggressive
    description: 가능한 경우 탐색/검토/검증을 더 공격적으로 멀티 에이전트 분산 수행
    required: false
    type: boolean
---

# FE Auto Router

사용자가 프론트엔드 작업을 맡기면, 이 명령은 **작업 유형을 먼저 분류하고**, 그다음 **가장 적절한 서브 모델/전문가 1명을 주 담당자로 지정**해 진행합니다. 라우팅이 애매할 때는 과한 분산보다 **강한 기본 프론트엔드 담당자 1명**에게 맡기는 쪽을 우선합니다.

## 기본 원칙

1. **항상 한 명의 주 담당자(primary owner)** 를 정합니다.
2. 병렬 분산은 탐색/리서치가 필요한 경우에만 사용합니다.
3. 애매하면 세분화된 전문가 추정보다 **기본 프론트엔드 담당자**로 보냅니다.
4. 시각/UI 작업은 반드시 **visual-engineering** 경로를 우선합니다.
5. 사용자에게 보이는 변경은 구현 후 **브라우저 검증**까지 포함합니다.
6. 큰 작업은 구현 전 **Oracle 또는 plan** 으로 방향을 잠깐 고정합니다.
7. `aggressive=true` 이면 탐색, 설계 검토, 검증을 더 적극적으로 병렬 분산합니다.

## 1단계: 작업 분류

먼저 사용자의 요청을 아래 8개 중 하나의 **주 의도(primary intent)** 로 분류하세요.

1. `ui` — 새 페이지, 컴포넌트, 스타일, 레이아웃, 인터랙션, 디자인 시스템
2. `debug` — 원인 불명의 버그, 회귀, hydration/runtime 오류, 깨진 UI
3. `architecture` — 구조 결정, App Router 경계, 상태 관리 분리, 폴더 구조, 장기 설계
4. `refactor` — 동작 유지 전제의 정리, 추출, 단순화, 파일 이동/재구성
5. `test` — 테스트 추가, 실패 테스트 수리, QA 자동화, 회귀 방지
6. `docs` — 문서, 가이드, 사용법, 릴리즈 노트, 사용자용 카피
7. `browser` — 화면 확인, 재현, 스크린샷, 폼 플로우, 반응형 점검
8. `quick` — 작은 import 수정, 단일 파일 미세 수정, 명백한 사소한 FE 작업

여러 의도가 섞이면 **사용자가 실제로 원하는 최종 산출물** 기준으로 주 의도를 하나만 고르세요.

## 2단계: 라우팅 규칙

### A. UI / 디자인 작업 (`ui`)
- 조건: 새 UI, 비주얼 개편, 스타일 규칙 적용, 컴포넌트 조형, 반응형 레이아웃
- 기본 경로:
  - `task(category="visual-engineering", load_skills=["design","frontend-ui-ux"], run_in_background=false, ...)`
- 추가 규칙:
  - 새 기능/큰 페이지면 먼저 `think` 또는 `plan`으로 구조를 잠깐 고정
  - 사용자 가시 변경이면 마지막에 브라우저 검증 필수

### B. 일반 프론트엔드 구현 (`ui` 또는 애매한 기본값)
- 조건: React/Next 컴포넌트 구현, 상태 연결, 훅 수정, 폼/리스트/CRUD 화면 작업
- 기본 경로:
  - `task(subagent_type="frontend-developer", load_skills=[], run_in_background=false, ...)`
- 애매하면 이 경로를 기본값으로 사용

### C. 디버깅 (`debug`)
- 조건: 원인 미확정 버그, hydration mismatch, state race, runtime 에러, 회귀
- 처리 순서:
  1. `hunt` 스킬 로드
  2. 복잡하거나 원인이 퍼져 있으면 `oracle`로 먼저 원인 가설 검토
  3. 구현은 `frontend-developer` 또는 필요 시 `quick`/`visual-engineering`
- 중요한 규칙:
  - 원인을 모르면 바로 고치지 말고, 먼저 재현/진단

### D. 구조/설계 (`architecture`)
- 조건: 상태 경계, Server/Client 분리, 설계 방향, 대규모 리팩터 범위
- 처리 순서:
  1. `oracle` 또는 `plan`으로 방향 검토
  2. 구현은 `frontend-developer`
- 규칙:
  - 설계가 3파일 이상에 걸치면 먼저 계획을 짧게 확정하고 시작

### E. 리팩터 (`refactor`)
- 조건: 동작 유지가 핵심인 정리 작업
- 경로:
  - 단순/국소 범위 → `task(category="quick", load_skills=[], run_in_background=false, ...)`
  - 다중 파일/공개 인터페이스 영향 → `frontend-developer`
  - 구조 변화가 크면 `architecture` 규칙 우선

### F. 테스트 (`test`)
- 조건: 테스트 작성이 산출물의 중심일 때
- 경로:
  - 기본은 `frontend-developer`
  - 실패 원인 불명 테스트는 `hunt` 후 진행
  - 브라우저 흐름 검증이 핵심이면 `/playwright`

### G. 문서/카피 (`docs`)
- 조건: README, 사용법, 릴리즈 노트, 사용자용 문구 다듬기
- 경로:
  - `task(category="writing", load_skills=["write"], run_in_background=false, ...)`
- 규칙:
  - 코드 주석 추가는 문서 작업으로 보지 말고 원래 작업 맥락에 포함

### H. 브라우저 작업 (`browser`)
- 조건: 사용자가 브라우저 재현, 클릭, 입력, 스크린샷, 반응형 확인을 원함
- 경로:
  - 반드시 `/playwright` 또는 동등한 브라우저 자동화 경로 사용
- 규칙:
  - 브라우저 검증 결과를 실제 화면 기준으로 요약

### I. 사소한 작업 (`quick`)
- 조건: import 정리, className 한두 줄 수정, 단일 파일의 명백한 미세 수정
- 경로:
  - `task(category="quick", load_skills=[], run_in_background=false, ...)`
- 규칙:
  - 하지만 UI 결과물이 바뀌는 경우라도 범위가 크면 `ui`로 승격

## 2.5단계: 공격적 멀티 에이전트 모드 (`aggressive=true`)

사용자가 `aggressive=true` 를 주거나, 요청이 **범위가 넓고 실패 비용이 큰 FE 작업**이면 아래 규칙으로 확장하세요.

### 언제 켜는가
- 5개 이상 파일이 바뀔 가능성이 높을 때
- UI + 상태 + 라우팅/구조가 동시에 얽힐 때
- 새 페이지/새 플로우/대형 리디자인일 때
- 원인 불명 버그가 재현/설계/브라우저 확인을 동시에 요구할 때

### 어떻게 다르게 동작하는가
기본 모드는 **주 담당자 1명** 중심입니다. 공격적 모드에서는 아래처럼 **주 담당자 1명 + 보조 에이전트 2~4명**으로 확장합니다.

#### UI 큰 작업
- Primary owner: `visual-engineering`
- Parallel support:
  - `explore` 1명: 기존 컴포넌트/패턴/파일 구조 맵
  - `oracle` 1명: 설계/구성/상태 경계 리스크 검토
  - `playwright` 1회: 최종 반응형/실화면 검증

#### 디버깅 큰 작업
- Primary owner: `frontend-developer` 또는 `quick`
- Parallel support:
  - `hunt` 스킬 로드
  - `explore` 1명: 관련 파일/호출 경로/상태 흐름 찾기
  - `oracle` 1명: 원인 가설과 실패 지점 검토
  - 필요 시 `playwright`: 실제 재현

#### 구조/리팩터 큰 작업
- Primary owner: `frontend-developer`
- Parallel support:
  - `plan` 또는 `oracle`: 구조 결정 고정
  - `explore` 1명: 영향 범위 조사
  - 구현 후 `check` 스킬 또는 동등 검토

### 공격적 모드의 제한
- 주 담당자는 항상 1명 유지
- 병렬 보조 에이전트는 **최대 4명**
- 작은 수정에는 절대 사용하지 않음
- 같은 탐색을 중복으로 하지 않음

## 3단계: 강제 라우트 파라미터

사용자가 `route` 파라미터를 넣었으면, 가능한 한 그 라우트를 우선합니다.

- `route=ui` → visual-engineering 또는 frontend-developer
- `route=debug` → hunt + 필요 시 oracle
- `route=architecture` → oracle/plan 선행
- `route=refactor` → quick 또는 frontend-developer
- `route=test` → frontend-developer, 브라우저 플로우면 playwright
- `route=docs` → writing + write
- `route=browser` → playwright
- `route=quick` → quick

단, 사용자의 강제 라우팅이 요청과 명백히 충돌하면 한 줄로 이유를 설명하고 더 맞는 라우트로 수정하세요.

## 4단계: 라우팅 선언 형식

실행 전 아래 형식으로 짧게 선언하세요.

```text
Route: [intent]
Primary owner: [agent/category]
Why: [한 문장]
Verifier: [none / playwright / check / oracle]
Mode: [default / aggressive]
```

예시:

```text
Route: ui
Primary owner: visual-engineering
Why: 새 화면과 스타일 시스템 정렬이 핵심 산출물이라 시각 전담 경로가 가장 적합함
Verifier: playwright
Mode: aggressive
```

## 5단계: 위임 프롬프트 규칙

delegate/task를 사용할 때는 항상 다음을 포함하세요.

1. **TASK** — 정확히 무엇을 만들거나 고칠지
2. **EXPECTED OUTCOME** — 완료 기준
3. **REQUIRED TOOLS** — 허용 도구
4. **MUST DO** — 필수 요구사항
5. **MUST NOT DO** — 금지사항
6. **CONTEXT** — 파일, 제약, 기존 패턴

## 6단계: 검증 규칙

작업 완료 전 반드시 해당 범위의 검증을 수행하세요.

- 공통: `lsp_diagnostics`
- 프론트엔드 코드 변경: `npm run lint`
- 타입 영향: `npm run type-check`
- 테스트가 있으면: `npm test`
- 사용자 가시 변경: 브라우저로 실제 확인

큰 구현이 끝난 뒤에는 가능하면 `check` 스킬 또는 동등한 리뷰 절차를 거치세요.

## 7단계: 과잉 위임 방지

아래 경우는 과잉 위임하지 마세요.

- import 한 줄 정리
- 오타 수정
- 단일 파일의 명백한 spacing/class 수정
- 이미 원인이 확정된 1~2줄 수정

이 경우는 `quick` 또는 직접 처리로 충분합니다.

## 8단계: 추천 사용 예시

- `/fe-auto 버튼 hover 상태를 더 또렷하게 바꾸고 모바일 spacing도 정리해줘`
- `/fe-auto Next.js hydration 오류 원인 찾아서 고쳐줘`
- `/fe-auto settings 페이지 전체를 새 디자인 방향으로 바꿔줘`
- `/fe-auto route=browser 이 폼 플로우 실제로 클릭해 보고 깨지는지 확인해줘`
- `/fe-auto route=docs 이 프로젝트 프론트엔드 구조 문서화해줘`
- `/fe-auto aggressive=true 대시보드 전체 UI와 상태 흐름을 같이 개편해줘`
- `/fe-auto aggressive=true route=debug 이 페이지의 hydration 오류를 재현하고 구조 원인까지 찾아 고쳐줘`

## 최종 지침

이 명령의 목표는 **모든 작업을 여러 모델에 뿌리는 것**이 아닙니다. 목표는 **프론트엔드 요청을 가장 적절한 담당자에게 안정적으로 보내고, 필요할 때만 추가 전문가를 붙이는 것**입니다.

기본값은 항상 이 문장으로 요약됩니다:

> 애매하면 강한 기본 프론트엔드 담당자 1명에게 맡기고, UI·디버깅·설계·브라우저처럼 결과가 달라지는 경우에만 전문 경로로 승격한다.
