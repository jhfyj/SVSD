# SVSD design system

SVSD is a pocket radio for a journey. Half of it is a **flat screen** like paper: starting a journey, signing in, picking a character, choosing why you're driving, setting a destination, the trip recap. The other half is **hardware you hold**: a radio with a live map, a small LCD, a rocker switch and chunky keys. It runs in **two themes**, night and day, switched by the sun. Everything below keeps those halves and themes feeling like one object, so new screens are built from rules instead of guessed.

**Source of truth, in order:** this file → tokens in [`src/app/globals.css`](src/app/globals.css) → the Figma section [“CLAUDE LOOK HERE”](https://www.figma.com/design/aDzc2bXm7lrwe8ewApmlxe/SVSD--Design-file?node-id=123-130) (node `123:130`). When Figma and this file disagree, this file wins; the overrides are listed in [§11](#11-figma-overrides). When the code and this file disagree, see [§13](#13-known-drift-in-code).

---

## 0. Rules for anyone building UI (people and agents)

1. **Read this file before writing UI.** Use the [component recipes](#8-components) before inventing anything.
2. **Never hardcode on Screens.** No hex values, no `text-[Npx]`, no `rounded-md`, no off-scale spacing. Fixed pixel sizes are allowed only inside the radio, LCD and map, which are scale models ([§4.3](#43-hardware-ramp-fixed)).
3. **Never check the theme in a component.** Every semantic token has a night and a day value; use the token and both themes work.
4. **One accent moment per screen.** One primary button, one readout, one colored signal. Everything else stays neutral.
5. **If you need a value that isn't here**, add it to this file first (with the reason), then to `globals.css`.
6. **Run the [ship checklist](#12-ship-checklist)** before calling a screen done, in both themes.

---

## 1. Principles

| # | Principle | What it means in practice |
|---|---|---|
| 1 | **Two materials, never blended** | A surface is either **Screen** (flat paper, 1px borders, film grain, no shadows) or **Hardware** (casing gradients, light from above, panel grain, keys that travel). Don't put shadows on Screens or flat outlined boxes on the radio. |
| 2 | **Two themes, one object** | Night is the default; day turns the paper and casing cream. Hardware keeps its physical parts in both: the rocker, the map bezel, the red end-call key and the LEDs don't change. |
| 3 | **Square world** | Corner radius is 0. Only things that are physically round are round: dots, LEDs, bulbs. |
| 4 | **One color, one meaning** | Lime is a story, magenta is a question, green means on, red is danger. A color never shows up just for decoration. |
| 5 | **Readouts are digital, words are mono, pictures are pixels** | The segment font (DSEG14) is only for numbers a device would show. Every word is Geist Mono. Every picture (weather, characters, sign-in icons) is drawn on the same 16×16 one-ink pixel grid. |
| 6 | **Stop-motion, not tweening** | Digital things step: LCD content, pixel sprites, the radio switching on and off. Only light and real travel get smooth curves. See [§9](#9-motion). |
| 7 | **Everything on the radio makes a sound; little else does** | The radio clicks, latches and ratchets. Outside it, sound is kept for major moments. See [§9.6](#96-sound). |

---

## 2. Token architecture

Four tiers. Each tier only reads from the one above it.

```
Primitives          raw values: neutral ramps, signal hues, font files, the 4px unit
   ↓
Themes              night (:root) and day (:root[data-theme="light"]) assign primitives to tokens
   ↓
Semantic tokens     what a value is for: --background, --surface, --story, --key-lit, --motion-quick
   ↓  (@theme inline → Tailwind classes: bg-surface, text-story, ease-mechanical)
Recipes             components built only from semantic tokens: HardwareButton, RadioLcd, IntentPicker…
```

`src/lib/theme.ts` sets `data-theme` on `<html>` before first paint: **day between sunrise and sunset** where you are (7am–7pm if the place is unknown), night otherwise. `?theme=light|dark|auto` pins or unpins a theme for demos; the Dial Kit has the same switch.

---

## 3. Color

### 3.1 Neutral tokens

“Raised” is always closer to the light: lighter at night, whiter by day.

| Token | Night | Day | Used for |
|---|---|---|---|
| `backdrop` | `#000000` | `#dcd7cf` | Behind the 393px phone column on wide screens |
| `background` | `#1e1e1e` | `#f5f2ec` | Every Screen |
| `surface` | `#2b2b2b` | `#e9e5dd` | Stat cards, hover fill, tracks |
| `surface-raised` | `#404040` | `#fdfcf9` | Selected segment, raised tiles |
| `border` | `#6c6c6c` | `#c7c1b7` | 1px dividers and containers |
| `foreground` | `#ffffff` | `#1d1c1a` | Text, selected outlines |
| `accent` / `accent-foreground` | `#dedede` / `#000000` | `#2a2926` / `#f8f6f1` | Primary button |
| `accent-hover` | `#ffffff` | `#000000` | Primary button hover |
| `label` | `#bababa` | `#645f58` | Engraved hardware labels |
| `muted` | `#696969` | `#6f6b64` | Blueprint lines, Dial Kit chrome. **Not for text on Screens.** |
| `land-dot` | white 25% | ink 40% | Dots of the earth on Destination |

Night primitives (every gray in the dark theme snaps to one): `#050505` · `#111111` · `#1e1e1e` · `#2b2b2b` · `#393939` · `#404040` · `#6c6c6c` · `#bababa` · `#dedede` · `#ffffff`. The day theme uses warm grays and cream instead of neutral grays.

### 3.2 Text tiers

Text hierarchy comes from **foreground opacity**, not from extra grays. Contrast is against `background`.

| Tier | Class | Night | Day | Use |
|---|---|---|---|---|
| Primary | `text-foreground` | 16.7:1 | 15.2:1 | Values, titles, selected states, body |
| Secondary | `text-foreground/70` | 8.8:1 | 6.0:1 (5.6:1 on `surface`) | Labels, metadata, dates, units, unselected options |
| Tertiary | `text-foreground/40` | 3.8:1 | 2.5:1 | Placeholders and disabled only. Never for information you need to read. |
| Engraved | `text-label/80` | 5.3:1 on panel | see [§3.7](#37-contrast-fixes-for-day) | Labels printed on the radio body |
| LCD | `text-lcd-ink` | 7.1:1 on `lcd` | 6.8:1 on `lcd` | Anything on the LCD |

**Secondary is `/70`, not `/60`.** `/60` passes at night (6.8:1) but drops to 4.3:1 on cream, below the 4.5:1 that small text needs. Other opacities on text (`/50`, `/80`, `/85`, `/90`) snap to the nearest tier.

Non-text shades: `foreground/20` for unlit dots and empty tracks, `foreground/15` for empty calendar dots.

### 3.3 Signal colors: one meaning each

| Token | Night | Day | Means |
|---|---|---|---|
| `story` (= `marker-lime`) | `#d4ec21` | `#5f7300` | **Stories**, and what you're tuned into: story dots, “24 STORIES”, the tuner needle, focus on readouts |
| `question` (= `marker-magenta`) | `#ec6bf2` | `#b01ea8` | **Questions**: anything asking you to reply |
| `marker-sky`, `marker-orange` | `#7abdf0`, `#e3743d` | `#1f6fb0`, `#b64f1a` | Other **people** on the map only |
| `key-lit` (+ `key-lit-glow`) | `#6dff5c` | `#1f8a2c` | **On.** A latched console key's icon lights green (mic on, speaker on, the picked intent) |
| `led` / `led-amber` / LED red | `#6dff5c` / `#ffb020` / `#ff3535` | same | **Connection:** green on a call, amber connecting, red lost, dark when off |
| `character` / `character-lit` | white 20% / `#8dff7e` | ink 22% / `#2f8f3a` | Pixel characters: unlit, and the picked one lit |
| `danger` | `#ff5151` | `#ca3838` | Destructive actions and errors |
| `power` | `#ff3535` | same | The lit power key (an emitter, not a printed color) |
| `lcd` / `lcd-ink` | `#97bd93` / `#1e2a1d` | `#b5b3a8` / `#2b2a27` | The radio LCD: **green at night, gray by day** |
| `lcd-green` / `lcd-green-ink` | `#97bd93` / `#1e2a1d` | same | The always-green screen behind the Customize profile preview |

**Green means on.** LEDs, lit keys and the picked character all use green to say “this is active”. Never use green for decoration or for content.

**Shape rule: circles are content, squares are people.**
- ● **Dots** are content. Their color is the kind: `story`, `question`, white for start/end, `foreground/20` for plain path.
- ■ **Squares** (20px, 2px `marker-border`) are people. Each person gets an identity color from the four marker hues, in a fixed rotation. Because the shape is different, a lime square (a person) never reads as a story.
- Text is only colored when it names the kind (“24 STORIES”). Never color text for emphasis.

### 3.4 Hardware materials

Recipes, not colors. Use them only on the radio. Each has a day version in the theme, so the radio turns cream by day without code changes.

| Material | Token(s) |
|---|---|
| Casing (one continuous piece behind map and console) | `--casing-gradient` + `--panel-noise` |
| Panel (top bar, console) | `--panel-gradient` + `--panel-highlight` + `--panel-noise` |
| Key, up / down | `--button-gradient` + `--button-highlight` / `--button-gradient-pressed` + `--button-pressed-shadow` |
| End-call key | `--end-call-gradient` / `-pressed` (red in both themes) |
| Lit key | `.key-lit`: icon in `key-lit` with `--key-lit-glow` |
| LCD window | `bg-lcd shadow-[var(--lcd-inset)]` |

**Light source:** top-left, and on the radio it **moves with the phone.** `useTilt` turns device tilt into `--tilt-x` / `--tilt-y` (±25° / ±20°, eased toward the target at 0.12 per frame so it feels heavy) and the casing's highlight follows. Glow is only for emitters: LEDs, the power key, lit keys.

### 3.5 The map

- **With a Google key:** `NavMap` is a Google vector map tilted into a 3D follow view; the route is white (gray once driven), the next turn shows at the top. Tiles go black and white through `--map-lcd-tint`: a slight LCD-green cast at night, plain grayscale by day, so it reads as the same kind of screen as the LCD. Markers are HTML on top and keep their colors.
- **Without a key:** the dithered placeholder map ([§7](#7-texture)) and OpenStreetMap search and routes.
- **Washes:** when a story or question arrives, the map takes a `mix-blend-color` wash of that kind's color, rising from the bottom.

### 3.6 Retired values

| Found in | Value | Use instead |
|---|---|---|
| Figma inputs, `--border-input` | white 20% (night), ink 18% (day) | An input edge that's at least 3:1 ([§3.7](#37-contrast-fixes-for-day)) |
| Figma LCD text | `#456d4a` | `lcd-ink` (2.8:1 → 7.1:1) |
| Text anywhere | `text-muted`, `#696969` | `text-foreground/70` |
| Figma reply widget (`123:727`) | Blue fills, rounded corners, a sans font | LCD + hardware keys ([§8.3](#83-hardware-components)) |
| `Led.tsx` | `#55ff60`, `#3a3a3a`, `#aeaeae`, `#ffb020` gradients | `led`, `marker-border`, `label`, `led-amber` |
| `RockerSwitch.tsx` | `#0a0a0a`, `#050505`, `#cfcfcf` | Night primitives via a token, `label` |
| `PowerButton.tsx` | `#ff3535` in filters | `var(--power)` |
| `NavMap.tsx` | inline hex | Tokens |

### 3.7 Contrast fixes for day

The day theme is new, and a few of its values fell below the minimums. They now use these values (`globals.css`):

| Token (day) | Was | Contrast was | Now | Contrast |
|---|---|---|---|---|
| Input edge (`--border-input`) | ink 18% | ~1.6:1 | `#8f8b84` | 3.0:1 (input edges need 3:1) |
| `label` (engraved on the cream panel) | `#7a746b` at 80% | 2.5:1 | `#645f58` | 4.6:1 |
| `danger` | `#d23a3a` | 4.3:1 | `#ca3838` | 4.6:1 |
| `marker-orange` | `#b8501a` | 4.5:1 | `#b64f1a` | 4.6:1 |
| Night input edge (`--border-input`) | white 20% | 1.9:1 | `#6c6c6c` (= `border`) | 3.2:1 |

`border` itself (`#c7c1b7`, 1.6:1 by day) is fine for dividers between content. Anything you type into or tap needs the stronger edge.

---

## 4. Typography

### 4.1 Families

| Family | Token | Use | Notes |
|---|---|---|---|
| **Geist Mono** | `font-mono` (also `font-sans`) | Every word in the product | Weights 400 and 700 |
| **DSEG14 Classic Mini** | `font-display` | Device readouts only: clock, frequency, counts, countdowns | Stands in for Digital-7, which is personal-use only. If a Digital-7 license is bought it slots in first; nothing else changes. |
| **Pixel grid** | — | Pictures: weather, characters, sign-in and Allow access icons | 16×16, one ink, square pixels, one-pixel corner steps ([§10](#10-iconography)) |
| ~~Geist Sans~~ | — | Not used | Still loaded in `layout.tsx`. Remove it. |

### 4.2 Screen ramp

The Screen scale sits **one step smaller than Tailwind's default** for a quieter, more premium feel (commit `da68fcb`). Use these classes as-is; they're already remapped in `globals.css`.

| Role | Class | px / line | Used for |
|---|---|---|---|
| `heading` | `text-2xl` | 20 / 28 | The rare large heading |
| `title` | `text-xl` | 16 / 24 | Screen titles (they scramble in, [§9](#9-motion)), the profile handle, the hero input value |
| `body` | `text-base` | 13 / 20 | Prompts, buttons, inputs, list rows, stats |
| `small` | `text-sm` | 12 / 16 | Secondary rows, option labels, section labels, inline errors, small buttons |
| `micro` | `text-xs` | 10 / 14 | Metadata, dates, units, weekday heads, “results from” notes |
| `readout-lg` | `font-display text-4xl tabular-nums` | 36 / 40 | Big numbers on Screens |
| `readout-xl` | `font-display text-5xl tabular-nums` | 48 / 48 | Station frequency on the splash |

`text-lg` (15) exists but has no role. Don't use it. On Screens, `text-[10px]` is just `text-xs`, and `text-[11px]` snaps to `text-xs` or `text-sm`.

### 4.3 Hardware ramp (fixed)

The radio, its LCD and its map are a **scale model**: they don't shrink when the Screen scale changes, so they use fixed pixel sizes. Only these:

| Role | Class | Used for |
|---|---|---|
| `clock` | `font-display text-[20px] leading-none` | The clock on the radio and in the top bar (same size everywhere) |
| `engraved` | `text-[11px] font-bold uppercase text-label/80` | Labels printed on the radio (RADIO, OFF, ON), settings section titles, field labels |
| `key` | `text-[13px] font-bold uppercase` | Console key labels |
| `key-sm` | `text-[11px] font-bold uppercase` | Labels on small keys (intents, report reasons). Wrap to 2 lines rather than shrink. |
| `hw-note` | `text-[11px] normal-case text-label/80` | One-line explanations in the settings panel |
| `lcd-sm` | `text-[11px]` | LCD captions (“CURRENTLY CONNECTED TO”, “Back on air in”) |
| `lcd` | `text-[14px] uppercase leading-tight` | The LCD status line (CONNECTING…, CONNECTION LOST) |
| `lcd-name` | `text-[16px]` | The other person's @handle |
| `lcd-num` | `font-display text-[20px]` | Countdowns on the LCD |
| `tag` | `text-[9px] uppercase leading-[13px]` | Blueprint tags and map labels only. Never for anything you need to read. |

**Floors:** 10px on Screens, 11px on hardware, 9px only for `tag`.

### 4.4 Hierarchy on a screen

At most three levels visible at once:
1. **One hero:** the scrambled title, a readout, or the hero input. Only one.
2. **Prompt + controls:** `body` prompts and controls.
3. **Support:** `small` / `micro` at `foreground/70`.

To make something more important, move it up a tier. Don't bold it, color it, or add a size.

### 4.5 Rules

- **Case:** UI chrome is UPPERCASE (labels, buttons, titles, prompts, keys). User content keeps its own case (handles, place names, message bodies). **Sentences are sentence case**, including on the LCD and in the settings panel (“They won't know it was you.”).
- **Numbers that change** get `tabular-nums`.
- **Tracking:** 0. Geist Mono is already evenly spaced.
- **Weight:** 400 on Screens; 700 only on hardware (engraved and key labels). No italics.
- **Overflow:** single-line fields and rows truncate with an ellipsis.
- **Plurals:** “1 story”, “2 stories” (`lib/plural.ts`).

---

## 5. Spacing and layout

### 5.1 Scale

The unit is 4px. Use only these steps:

| px | 4 | 8 | 12 | 16 | 20 | 24 | 32 | 48 | 64 |
|---|---|---|---|---|---|---|---|---|---|
| Tailwind | `1` | `2` | `3` | `4` | `5` | `6` | `8` | `12` | `16` |

**Rhythm:** 4–8 inside a control (icon to label), 8–16 inside a group (label to field, row to row), 24 between groups, 48 between sections.

### 5.2 Screen layout

- **Frame:** `max-w-[393px]` column, `min-h-dvh`, centered on `bg-backdrop`. The `.grain` film grain goes on the column ([§7](#7-texture)).
- **Gutter: 44px (`px-11` / `mx-11`) on every Screen.** That gives a 305px column at 393 wide, matching Figma's buttons, sign-in and profile. Wider and narrower gutters (31, 33, 19) snap to 44.
- **Top:** most Screens open with the top bar (`h-14`): pixel weather icon + clock, nothing else. Sign-in and verification have no top bar. Titles sit below it and scramble in.
- **Bottom:** one primary action pinned to the bottom of the column, `pb-14` (56) from the edge.
- **Dial Kit:** a prototype panel beside the column on wide screens (theme, every flow, every radio state, arrive now). It's hidden at phone width and is never part of the product UI.

### 5.3 Console geometry

The radio is an object with fixed geometry on a 393×852 artboard. Don't respace it with the scale. Part rectangles (x, y, w, h), matching `PARTS` in `RadioIntro.tsx`:

| Part | Box | Part | Box |
|---|---|---|---|
| Clock | 17, 26, 116×20 | LCD | 156, 603, 221×130 |
| Power key | 346, 14, 44×44 | Music key (off) | 26, 751, 112×70 |
| Map window | 14, 64, 365×509 | Settings key | 146, 751, 111×70 |
| RADIO label | 30, 605, 55×20 | Speaker key | 266, 751, 111×70 |
| Rocker switch | 26, 629, 46×98 | Key gap | 8 |

Off, the key row is Music · Settings · Speaker. On a call it becomes square call keys with an icon-only End call. Settings opens a panel that grows up out of the console.

### 5.4 Sizes

- **Touch target:** at least 44×44 (`size-11` / `min-h-11`) for anything tappable.
- **Controls:** text inputs, full-width buttons, option rows and menu rows are **48px tall (`h-12`)**. Console keys are 70.

---

## 6. Shape, borders, depth

- **Radius:** `rounded-token` (0) on everything. `rounded-full` only for dots, LEDs and bulbs, the live pulse, and the dot on the primary button. Nothing in between.
- **Borders:** always 1px. `border-border` for dividers and containers; the input edge ([§3.7](#37-contrast-fixes-for-day)) for anything you type into; `border-foreground` for selected and focused; `border-foreground/40` for empty slots.
- **Depth:** Screens have **no shadows and no gradients** (except a fade mask at the bottom of a scrolling list). Depth only exists on hardware, made with light ([§3.4](#34-hardware-materials)).

---

## 7. Texture

Each texture has one job and one home. One texture per surface; never stack them.

| Texture | Recipe | Lives on | Never on |
|---|---|---|---|
| **Film grain** | `.grain` on the phone column: `--grain` (fractal noise; light specks at night, warm specks by day), still, between the background and the content | Every Screen except the radio | The radio, panels, text |
| **Panel grain** | `--panel-noise` (finer noise, 9% at night, 7% warm by day) | Radio casing and panels | Screens, the LCD |
| **Dither** | Ordered Bayer 16×16, pixel 3, 5 levels, contrast 1.12, brightness 82%, image at 80%. Pre-baked (`public/radio/map-dithered.png`). | The placeholder map | Screens, text |
| **Dot matrix** | Round dots on a grid: the earth (`land-dot`), the walking trail, the activity calendar | Data drawings on Screens | Backgrounds, decoration |
| **Pixel art** | 16×16 one-ink grid, square pixels | Weather icon, characters, sign-in / Allow access icons, the LCD | Mixed with vector icons in one spot |
| **Hatching** | −45° lines, 1px every 7px, `--grid-ink` at 12% | Blueprint (the radio load-in) only | Anything at rest |
| **Map tint / wash** | `--map-lcd-tint`; `mix-blend-color` washes | The map window | Screens |

Grain is still, never animated. It reads as paper, not noise.

---

## 8. Components

States for every component:

| State | Screen | Hardware |
|---|---|---|
| Hover (only inside `@media (hover: hover)`) | Outlined → `bg-surface`; primary → `bg-accent-hover` | `brightness-110` |
| Pressed | Sinks: `translate-y-px` + content `opacity-80`, `duration-75` | Gradient flips + pressed shadow, content `translate-y-px opacity-60`, `duration-75` |
| Focus (`:focus-visible`) | `outline-2 outline-offset-2 outline-foreground` | Same |
| Selected / on | White (ink) border + filled dot, or raised fill | Latched down + `.key-lit` icon |
| Disabled | `opacity-40 pointer-events-none` | Same |

Pressables **sink, they don't shrink.** A press is a key traveling into the body, so there's no `scale(0.97)`.

### 8.1 Screen components

| Component | Spec |
|---|---|
| **Top bar** | `h-14`, `pl-4 pr-1.5`. Pixel weather icon (two-frame sprite) + `clock`. Nothing on the right; Profile is a link on the start screen. |
| **Screen title** | `title` uppercase in `ScrambleText`: letters settle left to right from random glyphs once, on load. One per screen. |
| **Text field** | `h-12 border` (input edge) `bg-transparent px-3`. Value `title` for the one hero field on a screen, `body` in forms. Placeholder `foreground/40`. Focus `border-foreground`. Error: `border-danger` + a `small text-danger` line. Typing sounds (`data-cuelume-type`). |
| **Code boxes** (verification) | One bordered box per digit, blinking caret (`caret-blink`, `steps(1)`). Wrong code: a `text-danger` alert under the boxes, the error cue, and a warning on the pixel icon above. |
| **Primary button** | `h-12 w-full bg-accent text-accent-foreground`, `body` uppercase, trailing 10px dot (`size-2.5 rounded-full bg-current`). One per screen. If it moves to the next screen it plays a mechanical tap. |
| **Secondary button** | `h-12 border border-border text-foreground`, `body` uppercase. |
| **Option row** (intents) | `h-12 border px-5 gap-3`, `small` uppercase, 10px dot left. Unselected `border-foreground/40`, hollow dot; selected `border-foreground`, filled dot. Select sound. |
| **Character grid** | 8 pixel characters, unlit (`character`) with the picked one lit (`character-lit`) and animating; preview on the `lcd-green` screen. No background tile behind the pick. |
| **Permission block** (Allow access) | Pixel icon on top, status light (green granted, red blocked), a `small` note under the block. |
| **Recent journey row** | Place `body`, date `micro foreground/70`, distance · time `micro`, VIEW JOURNEY (secondary) + START AGAIN (primary). |
| **Stat card** | `bg-surface p-3`, value as a readout + unit `small foreground/70`, baseline-aligned. |
| **List panel** (history) | `border px-5 py-4`; groups 24 apart, rows 12 apart with 1px dividers; time `small`, duration `micro foreground/70`. Fade the bottom into `background` when it scrolls. |
| **Trip recap** | Lines appear one per frame; story and question counts count up frame by frame; the route drawn with its dots. |

### 8.2 Readouts

Clock, frequency, counts and countdowns use the segment font with `tabular-nums`. An editable readout gets a 1px bottom border at `foreground/40` that turns `story` on focus.

### 8.3 Hardware components

| Component | Spec |
|---|---|
| **Console key** (`HardwareButton`) | 70 tall, key material up/down. Label `key` at 80%; icons 24 at 60%. Latched keys stay down and light their icon (`.key-lit`): **lit = on** (mic lit = mic on). End call is icon-only and stays down until the next person connects. `tone="end"` uses the red material. |
| **Power key** | Phosphor `Power` 20 in a 44 button, `text-power` with a three-layer glow. Pressed: glow drops to 1px, `translate-y-px`, 80%. |
| **Rocker switch** | 46×98 housing; the paddle tilts on its center hinge ([§9.5](#95-3d-and-physical-motion)). `O` / `|` glyphs, engraved OFF / ON. |
| **LED** | 8px bulb in a 1px ring. Off: dark bulb. Connecting: amber. On a call: green. Lost: red. Each lit state glows in its own color. |
| **LCD** (`RadioLcd`) | `bg-lcd`, `lcd-ink`, inset shadow. One state at a time: blank (off), CONNECTING with stepping dots, the other person's character + @handle (idle / speaking frames), CONNECTION LOST, a break countdown, or a thank-you on arrival. Text uses the `lcd-*` roles. |
| **Settings panel** | Grows up out of the console in 4 hard steps. Sections with `engraved` titles; choices are small keys that latch and light (intents: Meet someone, Chit-chat, Share a story, Off my chest). Report reasons are short enough to fit a key. |
| **Map window** | See [§3.5](#35-the-map). People are 20px squares, 2px `marker-border`. |
| **Reply recorder** | Replaces Figma's blue rounded widget. The LCD shows the waveform (2px `lcd-ink` bars) and the count-up time as `lcd-num`; below, a FINISH key and a square Pause key. No blue, no radius. |

---

## 9. Motion

### 9.1 Should it move?

| How often it's seen | Decision |
|---|---|
| Every press, every keystroke, arrow keys | `press` feedback only. Keyboard steps are instant (plus a sound). |
| Several times per session (options, toggles, results) | `quick` state change |
| Once per screen (title scramble, trail drawing, recap lines) | `enter` or stepped, may stagger |
| Once per journey (splash dial, radio load-in, map zoom, power off) | A **moment**: up to ~3.5s, must work with reduced motion |

Every animation needs a reason: feedback, state, or explaining where something came from.

### 9.2 Pick the curve by what's moving

| Token | Curve | Tailwind | Material | Examples |
|---|---|---|---|---|
| `steps(n)` / `step-end` | — | arbitrary value | **Digital and pixel things. The default for anything on the LCD, any sprite, and the radio turning on or off.** Hard frames, never eased. | LCD dots (1, 2, 3, clear), characters hopping, sprites swapping, the load-in flashes, the radio dropping out in 8 steps, the settings panel growing in 4, recap lines appearing |
| `--motion-ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | `ease-out` | **Light and UI**: things appearing, fading, answering a press | Trail dots lighting up, the blueprint grid fading in, prompt fading out |
| `--motion-ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | `ease-in-out` | **Travel**: the camera or something moving across the screen | Earth-to-trail zoom. JS: `t < .5 ? 4t³ : 1 − (−2t + 2)³ / 2` |
| `--motion-ease-mechanical` | `cubic-bezier(0.3, 1.4, 0.5, 1)` | `ease-mechanical` | **Hinged parts with mass**: a little overshoot, then settle | Rocker paddle, toggle knob |
| `linear` | — | `ease-linear` | **Constant motion** | Blueprint edges drawing, timers |

**Never:** `ease-in` (it feels slow because nothing moves at first), the bare `ease` keyword, or Material's `cubic-bezier(0.4, 0, 0.2, 1)`. Exits use `ease-out` too, just shorter. JS number tweens (the tuning dial) use ease-out: `1 − (1 − t)⁵`.

### 9.3 Durations

| Token | ms | Tailwind | Use |
|---|---|---|---|
| `--motion-press` | 75 | `duration-75` | Contact feedback: key sinks, glow dims |
| `--motion-quick` | 150 | `duration-150` | State changes: rocker, toggles, option color, small fades |
| `--motion-enter` | 240 | `duration-240` | An element entering: one trail dot, a row |
| `--motion-screen` | 400 | `duration-400` | Screen-level fades, the blueprint grid |
| Moments | 360–3400 | named `*_MS` constants | Splash 3400 (tuning 2600), map zoom 1600, load-in frames 680, flash 360, power off 480 |

**Stepped loops** keep their frame rate as the duration: sprites 1s per cycle (400ms when speaking), LCD dots 1.6s, pixel float 2.4s, typing dots 0.9s, caret 1s.
**Stagger:** 30–40ms between small items (trail dots 35), ~100ms between large parts (load-in). Never blocks input.
**Exit faster than enter.**

### 9.4 Mechanics

- Animate only `transform`, `opacity`, `clip-path`, `visibility` (for frame swaps) and `filter` (for glow). Not `left`, `width`, `height`, `margin` or `padding`.
- **State changes use CSS transitions** (they can be interrupted). **Keyframes are for moments and stepped loops.**
- Nothing appears from `scale(0)`; light-up dots may start at `0.2` because they read as light.
- Pixel things move **one pixel at a time** (`--pixel` steps), never sub-pixel.
- Hover motion only inside `@media (hover: hover) and (pointer: fine)`.

### 9.5 3D and physical motion

Describe a physical part as **an object with a hinge, travel, mass, light and sound**, not as an animation. Every 3D or hardware motion gets this spec in its doc comment:

```
<Part> — <trigger>
  pivot:   where it hinges (transform-origin, including z depth)
  view:    perspective and where the viewer is
  travel:  rest → pushed (degrees or px), max
  curve:   token        time: token
  light:   what the highlight and shadow do as it moves
  sound:   cue name + theme, or none
  reduced: what happens with reduced motion
```

**Reference: the rocker switch** (`RockerSwitch.tsx`)

```
Rocker paddle — press either half
  pivot:   center of the paddle, 9px behind the face (50% 50% -9px)
  view:    perspective 220px, seen from slightly above (a phone held in front of you)
  travel:  rests at ±14°, pushed to ±19°
  curve:   ease-mechanical   time: quick (150ms)
  light:   face highlight, raised-end thickness and housing shadow follow the same tilt value
  sound:   tap (mech, subtle) on press; toggle (mech, strong, forward/back) on flip
  reduced: tilt snaps with no transition; light and shadow still show which side is down
```

**Other physical motion in the product:**
- **Casing light** (`useTilt`): the highlight follows the phone's tilt, ±25° / ±20°, catching up 12% per frame so it feels heavy.
- **Map camera** (`NavMap`): tilted follow view behind you, facing the road ahead.
- **Power off:** the whole radio drops out of the bottom in 8 hard steps (480ms), then back to Start your journey.

Rules for all physical parts:
- **Hinge where the real part hinges**, with depth (`preserve-3d`, real thickness).
- **Perspective 220px** for hand-sized parts; the viewer is slightly above.
- **Small travel.** Tilts max out around 20°; keys travel 1px. Nothing slides across the housing.
- **Light comes from the same value as the motion**, so they can't drift apart.
- **Mass decides timing:** contact `press`, hinged parts `quick` + `ease-mechanical`, heavy rolling things native scroll + snap, the whole radio in hard steps.
- **Interruptible:** state + transitions, pointer capture while pressed.

### 9.6 Sound

Every sound goes through `lib/sound.ts` ([cuelume](https://www.npmjs.com/package/cuelume)), so one switch mutes all of it (remembered per device).

| Where | Theme | Rule |
|---|---|---|
| **The radio** | `mech` (clicks, latches, ratchets) | Everything on it sounds: keys, the switch, the load-in, errors |
| **Everywhere else** | default (warm) | Major moments only: the main action on a screen, sign-in results, saving, deleting, and typing |

- Mark plain clicks with attributes: `data-cuelume-tap` / `-select` / `-toggle` / `-open` / `-close` / `-type`, plus `data-cuelume-theme="mech"` on hardware. Call `cue()` for outcomes and anything that isn't a click.
- Buttons that go to the next screen use a mechanical tap, **not** the navigate whoosh.
- One sound per event; volume 0.3–0.35 for repeated ticks. Never on hover or plain scrolling.

### 9.7 Reduced motion

- Wrap movement in `motion-safe:` or `@media (prefers-reduced-motion: no-preference)`.
- **Moments jump to their end state.** The load-in is skipped, the splash shows the station, the map shows the trail.
- **Stepped loops hold their first frame** (sprite frame A, all LCD dots visible).
- Keep state feedback: color and opacity changes at `quick` or shorter stay on.

### 9.8 Current motion inventory

| Where | What | Fits? |
|---|---|---|
| `HardwareButton`, `PowerButton` | Press 75ms | ✅ |
| `RockerSwitch` | 160ms `ease-mechanical` tilt + mech sounds | ✅ (use `quick`, 150) |
| `RadioIntro` | Blueprint edges 140ms linear, parts flash `step-end` 360ms, casing flickers out | ✅ |
| `RadioLcd`, sprites, pixel icons | Stepped loops | ✅ |
| `.radio-power-off` | 480ms `steps(8)` | ✅ |
| `TripSummary`, `TripMap` | Lines and dots per frame, `steps` | ✅ |
| `JourneyMap` | Zoom 1600ms ease-in-out cubic | ✅ |
| `RouteTrail` | `trail-in` 240ms | ⚠️ use `var(--motion-ease-out)`, not the `ease-out` keyword |
| `StartingRadio` | Splash fade-out 400ms `ease-in` | ⚠️ `ease-out` |
| `RadioSettings` | Panel grows with `transition-[height]` in `steps(4)` | ⚠️ step a `clip-path` or `transform` instead of `height` |
| `ToggleSwitch` | Animates `left` | ⚠️ animate `transform` |
| `Button`, `MenuRow`, `SegmentedTabs`, options | Default `transition-colors` | ⚠️ add `duration-150 ease-out` |

---

## 10. Iconography

Two families, never mixed in one spot:

**1. Glyphs: Phosphor only** (`@phosphor-icons/react`) for UI symbols on keys, buttons and rows. Carbon and the hand-drawn `components/ui/icons.tsx` are retired.

| Rule | Value |
|---|---|
| Weight | `regular`. `fill` only for media glyphs (Play, Pause, Stop, Record). No thin, light, bold or duotone. |
| Sizes | 16 next to 10–13px text, 20 in the top bar and next to 16px text, 24 on console keys. |
| Color | `currentColor`; on keys it follows the key's opacity, and `.key-lit` turns it green. |
| Gap | 8 between icon and label (12 on console keys). |
| A11y | Decorative icons `aria-hidden`; icon-only buttons need an `aria-label`. |

| Carbon / current | Phosphor |
|---|---|
| `ArrowRight`, `ArrowLeft` | `ArrowRight`, `ArrowLeft` |
| `Microphone` | `Microphone` / `MicrophoneSlash` |
| `VolumeUp`, `VolumeMute` | `SpeakerHigh`, `SpeakerSlash` |
| `Settings` | `GearSix` |
| `IncidentReporter` | `Flag` |
| `Power` | `Power` |
| `Music` | `MusicNotes` |
| `PartlyCloudyNight` (radio top bar) | The pixel weather icon, same as the Screen top bar |
| Already Phosphor | `PhoneDisconnect`, `SpeakerHigh`, `FlagCheckered`, `Crosshair` |

**2. Pictures: the pixel grid.** Weather icons, characters and the sign-in / Allow access icons are 16×16, one ink, square pixels with one-pixel corner steps, two frames that swap. Draw new pictures on this grid; don't use a Phosphor glyph where a picture belongs, and don't draw a pixel picture where a glyph belongs.

---

## 11. Figma overrides

| Figma | System | Why |
|---|---|---|
| Digital-7 | DSEG14 Classic Mini | Digital-7 is personal-use only |
| Screen prompts in Digital-7 | Geist Mono | The segment font is for readouts only (team decision, `b24792a`, `41fe316`) |
| Type at Figma sizes | Screen ramp one step smaller ([§4.2](#42-screen-ramp)) | Team decision (`da68fcb`): quieter, more premium |
| Hardware labels 13px | `engraved` 11px | Matches the code; one engraved size |
| Text at 25% / 50% / 60% / 85% | 40 / 70 / 100 tiers | Three tiers that pass in both themes |
| LCD text `#456d4a` | `lcd-ink` | 2.8:1 → 7.1:1 |
| Input border white 20% | 3:1 input edge | 1.9:1 fails |
| Gutters 31 / 37 / 42 / 44 | 44 everywhere | One column edge |
| Message = magenta wash, question = blue wash | **Story (message) = lime, question = magenta** | Matches the setup screen and the trail; blue stays a people color |
| Blue rounded “COUNT UP” reply widget | LCD waveform + console keys | It was the only rounded, off-palette element |
| Carbon + Material icons | Phosphor glyphs + pixel pictures | One glyph family |
| Dark only | Night + day themes | Team decision (`e3045ba`) |
| Spiral splash | Tuning dial that hunts across the band | Team decision (`b09fd33`) |

**Figma map** (file `aDzc2bXm7lrwe8ewApmlxe`, section `123:130`): Getting set up `123:533`, `125:807`, `123:131`–`123:207` · Splash `123:728` · Sync calling `123:287` connecting, `123:246` connected, `123:319` off · Receive `123:352` message, `123:441` question · Respond `123:471`, `123:502`, `123:727` · Profile `123:647` sign in, `123:541` profile. Day theme reference: Connecting `154:1263`.

**Flows in code:** `/` start + recent journeys → `/intents` → `/journey` (destination: address or coordinates) → `/journey/starting` (splash) → `/radio` (off · connecting · connected · lost · break · arrived) → `/trip` (recap). `/profile`: sign in → verify → customize profile → allow access → profile.

---

## 12. Ship checklist

- [ ] Looked right in **both themes** (Dial Kit → Light / Dark)
- [ ] Screens use only tokens and scale classes: no hex values, no `text-[Npx]`, no radius, no off-scale spacing
- [ ] Each surface is clearly Screen **or** Hardware
- [ ] One hero, one primary action, one signal color per screen
- [ ] Text uses the three tiers; nothing you need to read is under `/70`
- [ ] Every color means what [§3.3](#33-signal-colors-one-meaning-each) says
- [ ] Glyphs are Phosphor regular 16 / 20 / 24; pictures are on the pixel grid
- [ ] Tappable targets are at least 44×44; controls are 48
- [ ] Hover, pressed, focus-visible and disabled states exist
- [ ] Motion uses a curve and duration from [§9](#9-motion) (steps for anything digital), animates transform/opacity only, and has a reduced-motion path
- [ ] Physical parts have a motion spec ([§9.5](#95-3d-and-physical-motion))
- [ ] Sound follows [§9.6](#96-sound): mech on the radio, major moments only elsewhere
- [ ] Loading, empty and error states are designed
- [ ] A Storybook story exists for any new component

---

## 13. Known drift in code

Code that predates or differs from this spec. Fix it when you're next in the file, or in one cleanup pass.

- **Icons:** Carbon in `PowerButton`, `RadioScreen`, `RadioConsole`, `RadioSettings`, `SignIn` (arrows), the Profile menu (Settings, IncidentReporter) and the volume toggle; custom `ui/icons.tsx` → Phosphor ([§10](#10-iconography)). Then remove `@carbon/icons-react`.
- **Type on Screens:** `text-[10px]` → `text-xs`; `text-[11px]` on Screens → `text-xs`/`text-sm`; `tracking-wide`/`tracking-wider` → none.
- **Type on hardware:** `text-[9px]` on intent and report keys → `key-sm` (11px, wrap to 2 lines); `text-[12px]` keys → `key` (13) or `key-sm`; LCD `text-[12px]` peer caption → `lcd-sm`; `NavMap` next turn `text-[22px]` → 20.
- **Hex values:** `RockerSwitch`, `Led`, `PowerButton`, `NavMap` → tokens ([§3.6](#36-retired-values)).
- **Layout:** `px-[31px]`, `mx-[31px]`, `px-[33px]`, `px-[19px]` → the 44px gutter; `h-[47px]` → `h-12`; bottom spacers (`mb-[61px]`, `pb-[77px]`) → `pb-14`.
- **Motion:** the ⚠️ rows in [§9.8](#98-current-motion-inventory).
- **Misc:** `HardwareButton` disabled `opacity-50` → 40; `CalendarDots` active dot → `bg-foreground`; Geist Sans loaded but unused.
- **Input edge on the phone field:** `SignIn`'s phone number is a filled `bg-surface` box with no edge (about 1.1:1 against the cream background). Give it the input edge ([§3.7](#37-contrast-fixes-for-day)) like the other fields, or record the filled field as a recipe.
