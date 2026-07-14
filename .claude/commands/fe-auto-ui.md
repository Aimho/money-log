---
name: fe-auto-ui
description: UI/디자인/레이아웃 작업을 시각 전담 경로로 우선 위임하고 필요 시 멀티 에이전트로 확장
parameters:
  - name: request
    description: 처리할 UI 작업 지시문
    required: false
  - name: aggressive
    description: 큰 UI 작업일 때 탐색/설계/브라우저 검증을 병렬 강화
    required: false
    type: boolean
  - name: fast
    description: 검증은 유지하되 가장 짧은 구현 경로 우선
    required: false
    type: boolean
---

# FE Auto UI

이 명령은 프론트엔드 작업 중에서도 **UI, 스타일, 레이아웃, 인터랙션, 디자인 시스템** 중심 작업만 다룹니다.

## 기본 라우팅

- 기본 Route: `ui`
- Primary owner: `visual-engineering`
- 기본 위임:
  - `task(category="visual-engineering", load_skills=["design","frontend-ui-ux"], run_in_background=false, ...)`

## 처리 규칙

1. 사용자의 요청이 단순 스타일 수정인지, 새 화면/새 플로우인지 먼저 구분하세요.
2. 단일 파일의 사소한 spacing/class 수정이면 굳이 과잉 분산하지 말고 짧게 처리하세요.
3. 새 페이지, 대형 레이아웃 변경, 디자인 시스템 정렬이면 구현 전 방향을 한 문장으로 고정하세요.
4. 사용자 가시 변경은 반드시 브라우저 검증까지 수행하세요.
5. normal state는 색을 남발하지 말고, 강조는 필요한 지점에만 두세요.

## aggressive=true 일 때

아래를 추가하세요.

- `explore` 1명: 기존 컴포넌트/스타일 패턴 조사
- `oracle` 1명: 구조/상태/리스크 검토
- 최종 `playwright`: 데스크톱 + 모바일 폭 확인

단, 주 담당자는 여전히 `visual-engineering` 1명입니다.

## 출력 형식

실행 전 짧게 선언하세요.

```text
Route: ui
Primary owner: visual-engineering
Why: [한 문장]
Verifier: playwright
Mode: [default / aggressive]
```

## 예시

- `/fe-auto-ui 설정 페이지 전체를 더 차분한 방향으로 리디자인해줘`
- `/fe-auto-ui aggressive=true 대시보드 카드 구조와 반응형 레이아웃을 전면 정리해줘`

## 최종 지침

이 명령은 UI 결과물을 더 좋게 만드는 데 집중합니다. 따라서 구현만 끝내지 말고, **보이는 결과가 실제로 좋아졌는지** 브라우저에서 확인해야 완료입니다.
