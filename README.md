# Money Log

축의금 기록을 빠르게 남기고, 그룹별로 정리해서 확인할 수 있는 모바일 우선 가계부형 장부 앱입니다. 포트폴리오 관점에서는 반복 입력 속도, 반응형 인터랙션, 로컬 저장 기반의 끊김 없는 사용 경험에 집중한 프로젝트입니다.

## What it does

- 행사명과 날짜를 설정하고, 축의금 기록을 반복해서 빠르게 추가할 수 있습니다.
- 이름, 그룹, 금액, 메모를 빠르게 입력하고 목록에서 최신순 또는 금액순으로 확인할 수 있습니다.
- 그룹별 필터와 요약 카드로 전체 금액, 평균 금액, 그룹 수를 바로 파악할 수 있습니다.
- 삭제는 즉시 확정되지 않고 undo toast를 통해 되돌릴 수 있습니다.

## Portfolio highlights

- **Fast repeated entry flow**: Enter 키 이동, `저장하고 다음 기록`, 빠른 금액 칩으로 반복 입력 속도를 높였습니다.
- **Flexible amount parsing**: `150000`, `150,000원`, `십오만` 같은 입력을 같은 금액으로 해석합니다.
- **Voice-assisted input**: 브라우저가 지원하면 음성 입력으로 이름, 그룹, 금액 입력 흐름을 이어서 진행할 수 있습니다.
- **Responsive UX**: 데스크톱에서는 고정 입력 패널을, 모바일에서는 FAB + 바텀시트를 사용합니다.
- **Local-first persistence**: Zustand와 브라우저 저장소를 사용해 새로고침 이후에도 기록, 필터, 행사 정보를 유지합니다.
- **Edge-state coverage**: 로딩, 빈 상태, 필터 결과 없음, 저장소 오류, 삭제 되돌리기 흐름을 분리해 처리했습니다.

## Tech stack

- Next.js 15
- React 19
- TypeScript
- Zustand
- Tailwind CSS 4
- Framer Motion
- Vitest

## Project structure

```text
app/                          Next.js app router entry
components/gift-ledger/       Ledger UI and interaction flows
store/                        Zustand state and persistence orchestration
lib/                          Selectors, parsing, formatting, storage helpers
hooks/                        Voice input hook
```

## Run locally

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run type-check
npm test
```

## Why this project matters

이 프로젝트는 단순 CRUD를 넘어서, 실제 사용 상황에서 반복 입력이 많은 폼을 얼마나 빠르고 안정적으로 설계할 수 있는지 보여주기 위해 만들었습니다. 특히 모바일과 데스크톱의 입력 맥락을 다르게 풀고, 금액 파싱과 삭제 undo 같은 작은 UX 디테일을 제품 경험으로 연결한 점이 핵심입니다.
