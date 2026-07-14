---
name: fe-auto-debug
description: 프론트엔드 버그를 원인부터 추적해 적절한 디버깅 경로로 위임하고 수정·검증까지 진행
parameters:
  - name: request
    description: 조사하거나 수정할 프론트엔드 버그 설명
    required: false
  - name: aggressive
    description: 재현, 탐색, 원인 검토를 더 적극적으로 병렬 분산
    required: false
    type: boolean
  - name: browser
    description: 브라우저 재현/검증이 필요하면 우선 포함
    required: false
    type: boolean
---

# FE Auto Debug

이 명령은 프론트엔드 버그를 **바로 고치기보다 먼저 원인을 분류**한 뒤, 적절한 디버깅 경로로 보내는 데 집중합니다.

## 기본 라우팅

- 기본 Route: `debug`
- 기본 규칙:
  1. `hunt` 스킬을 먼저 로드
  2. 원인이 불명확하거나 구조적으로 퍼져 있으면 `oracle` 검토 선행
  3. 구현 담당은 `frontend-developer` 또는 범위가 작으면 `quick`

## 우선 분류할 버그 종류

1. hydration/runtime 오류
2. 상태 불일치 / race / stale state
3. 시각적 깨짐 / 반응형 레이아웃 붕괴
4. 이벤트/폼 동작 오류
5. 테스트 실패와 연결된 FE 버그

## 처리 규칙

1. 증상만 보고 바로 수정하지 마세요.
2. 가능한 한 **재현 조건 → 관련 파일 → 원인 가설** 순으로 진행하세요.
3. 원인을 모르면 `oracle` 또는 `explore`를 붙이고, 같은 추측을 반복하지 마세요.
4. 브라우저가 실제 증상을 보여주는 버그면 `browser=true` 또는 Playwright 검증을 포함하세요.

## aggressive=true 일 때

아래를 추가하세요.

- `explore` 1명: 관련 파일/호출 경로/상태 흐름 조사
- `oracle` 1명: 원인 가설과 실패 지점 검토
- `playwright` 또는 브라우저 재현: 실제 증상 확인

단, 여전히 **주 담당자는 1명**만 둡니다.

## 출력 형식

실행 전 짧게 선언하세요.

```text
Route: debug
Primary owner: [frontend-developer / quick]
Why: [한 문장]
Verifier: [oracle / playwright / none]
Mode: [default / aggressive]
```

## 예시

- `/fe-auto-debug Next.js hydration mismatch 원인 찾아서 고쳐줘`
- `/fe-auto-debug browser=true 이 모달이 모바일에서 닫히지 않는 문제 재현하고 수정해줘`
- `/fe-auto-debug aggressive=true 상태 꼬임 때문에 리스트가 가끔 중복 렌더되는 문제 조사해줘`

## 최종 지침

디버깅의 완료 기준은 "고친 것 같다"가 아닙니다. **원인을 설명할 수 있고, 수정 후 재현되지 않으며, 관련 검증이 통과한 상태**여야 합니다.
