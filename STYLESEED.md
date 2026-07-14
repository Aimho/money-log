# StyleSeed Lock — Ceremony notebook

## Direction
Ceremony notebook is a calm ledger surface for short, repeated gift-entry work: warm paper neutrals, ink-first typography, and a single green accent reserved only for action and selection.

## Visual thesis
Restrained notebook utility with soft paper depth, quiet grey hierarchy, and one memorable ruled-summary card that feels like a ceremony record book instead of a generic dashboard.

## Content plan
Orient with sticky event metadata, show live event totals immediately, filter and scan entries quickly, then add a new record through a focused utility panel or bottom sheet.

## Interaction thesis
Snap motion appears only when it helps work: segmented sort toggles, filter chip presses, bottom-sheet open/close, and the undo toast. Money values stay static. Reduced motion removes travel and keeps only instant state changes.

## Theme
- Product mood: calm, ceremonial, practical
- Surface model: paper background, card surfaces, slightly denser desktop workspace
- Radius personality: one soft 12px radius across cards, chips, panels, and form fields
- Focus behavior: always visible, accent outline with clean offset

## Palette
- Background: warm paper neutral
- Surfaces: layered warm greys only
- Ink: deep charcoal plus softer secondary grey text
- Accent: `#10B981` only for selected chips, submit CTA, focus emphasis, and active voice state
- Group dots: stable muted ledger palette, intentionally subdued and never semantic rainbow status colors

## Typography
- Typeface: Pretendard Variable only
- Heading tone: compact and steady, not editorial or oversized
- Data tone: amount figures use the same family with heavier weight rather than a second display face

## Components
- Sticky top bar with EventMetaBanner
- Hero card with subtle ruled-paper lines and the overall event total
- Two compact KPI cards with quiet labels and dense value hierarchy
- Filter chips with muted dots and accent selection state
- Entry list rows built for scan speed: name first, amount right-aligned, metadata tucked underneath
- Entry form is compact, keyboard-forward, and voice-assisted without looking experimental

## Layout
- Mobile: single column, list-first, bottom-sheet add flow
- Desktop: two-column app shell with sticky entry panel on the right
- App shell backgrounds stay restrained; differentiation comes from surface steps and shadows rather than decoration

## Motion
- Utility-only snap transitions
- `active:scale-95` behavior on tappable controls
- Sheet and toast use short vertical travel only
- No animated counters, no ornamental floating motion

## Do / Don’t
- Do keep normal states grey and calm
- Do use accent only when the interface needs a clear next action
- Do keep touch targets at or above 44px
- Don’t introduce red, blue, purple, or extra semantic accents for ordinary UI states
- Don’t turn the app shell into a marketing page
- Don’t hide focus or rely on motion to explain state

## Placeholder content replacement
Replace the seeded event metadata in `lib/constants.ts` and the empty-state copy in the gift-ledger components with real ceremony names, dates, and group labels when production content is ready.
