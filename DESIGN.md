---
name: PajakSim — Sistem Pembelajaran Pajak Online
description: Institutional navy-and-gold light UI mimicking Indonesia's national tax portal, with our own neutral branding.
colors:
  navy-authority: "oklch(0.28 0.09 270)"
  navy-heading: "oklch(0.31 0.095 270)"
  navy-ink: "oklch(0.28 0.075 270)"
  steel-muted: "oklch(0.45 0.045 260)"
  slate-crumb: "oklch(0.39 0.05 265)"
  paper: "oklch(0.972 0.008 250)"
  surface: "oklch(0.99 0.004 250)"
  mist-border: "oklch(0.89 0.014 255)"
  gold-highlight: "oklch(0.88 0.15 88)"
  gold-deep: "oklch(0.79 0.16 82)"
  gold-crest: "oklch(0.9 0.14 92)"
  amber-note-bg: "oklch(0.96 0.055 92)"
  amber-note-border: "oklch(0.88 0.075 92)"
  amber-note-text: "oklch(0.33 0.07 80)"
  sky-active-tab: "oklch(0.93 0.025 210)"
typography:
  headline:
    fontFamily: "system-ui sans (Tailwind default stack)"
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1.2
  title:
    fontFamily: "system-ui sans (Tailwind default stack)"
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1.3
  body:
    fontFamily: "system-ui sans (Tailwind default stack)"
    fontSize: "0.92rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui sans (Tailwind default stack)"
    fontSize: "0.78rem"
    fontWeight: 750
    lineHeight: 1.05
rounded:
  sm: "0.35rem"
  md: "0.55rem"
  lg: "0.62rem"
spacing:
  xs: "0.45rem"
  sm: "0.6rem"
  md: "1rem"
  lg: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.navy-authority}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  side-tab:
    backgroundColor: "transparent"
    textColor: "{colors.slate-crumb}"
    padding: "0.75rem 1rem"
  side-tab-active:
    backgroundColor: "{colors.sky-active-tab}"
    textColor: "{colors.navy-ink}"
  identity-block:
    backgroundColor: "{colors.navy-authority}"
    textColor: "{colors.surface}"
    padding: "1rem"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sm}"
  note-callout:
    backgroundColor: "{colors.amber-note-bg}"
    textColor: "{colors.amber-note-text}"
    rounded: "{rounded.sm}"
    padding: "0.8rem"
---

# Design System: PajakSim

## 1. Overview

**Creative North Star: "Loket Resmi" (The Official Counter)**

PajakSim looks like the desk of a well-run government service counter: light, formal, paper-adjacent surfaces; navy ink that means authority; a restrained gold thread that marks where you are. The layout skeleton is borrowed deliberately from Indonesia's national tax portal — branded topbar over a full-width module menubar, document pages split into a navy identity panel with status tabs on the left and a dense table panel on the right. Fidelity to that skeleton is pedagogy: students must recognize the real system in this one. The identity (crest, names, colors) is entirely our own.

This system explicitly rejects consumer-SaaS cheerfulness (pastel gradients, mascots, rounded-everything), the generic admin-template look, and dark mode. It is dense but ordered, serious but not hostile.

**Key Characteristics:**
- Light institutional surfaces, OKLCH-only color, no pure black or white
- Navy carries authority (identity blocks, primary actions); gold marks active navigation
- Heavy weight contrast (400 body vs 750–900 headings/labels) instead of size inflation
- Flat panels with 1px borders; shadows reserved for the sticky header
- Status is always label + color, never color alone

## 2. Colors

A committed institutional palette: navy carries 30–60% of document-page chrome, gold appears only as a wayfinding accent, everything else is blue-tinted paper.

### Primary
- **Navy Authority** (oklch(0.28 0.09 270)): identity blocks, primary buttons, the crest gradient's dark end. The color of officialdom; when a surface is navy, it speaks for the institution.
- **Navy Heading** (oklch(0.31 0.095 270)) and **Navy Ink** (oklch(0.28 0.075 270)): headings/nav text and body text respectively. Text is never gray-black; it is always navy-inked.

### Secondary
- **Gold Highlight** (oklch(0.88 0.15 88)) and **Gold Deep** (oklch(0.79 0.16 82)): active-state markers in the module menubar (highlight bar + underline) and the crest icon (oklch(0.9 0.14 92)). Gold answers one question only: "where am I / what is official".
- **Amber Note** family (bg oklch(0.96 0.055 92), border oklch(0.88 0.075 92), text oklch(0.33 0.07 80)): instructional callouts on create forms.

### Tertiary
- **Sky Active Tab** (oklch(0.93 0.025 210)): the selected status tab in document side panels. A cool counterpoint to gold; used nowhere else.
- Nuxt UI semantic roles: primary = indigo, neutral = slate; `warning`/`success`/`error` badges map to the slip lifecycle (Belum Terbit / Telah Terbit / Tidak Valid).

### Neutral
- **Paper** (oklch(0.972 0.008 250)): page background, with a faint radial blue tint from the top-right corner.
- **Surface** (oklch(0.99 0.004 250)): every panel, header, and table background. Not white — blue-tinted.
- **Mist Border** (oklch(0.89 0.014 255), family 0.88–0.91): the 1px lines that structure everything.
- **Steel Muted** (oklch(0.45 0.045 260)) / **Slate Crumb** (oklch(0.39 0.05 265)): secondary text, breadcrumbs, footers.

### Named Rules
**The Gold Thread Rule.** Gold exists only for wayfinding and insignia: active nav states, the crest, instructional notes. Never on buttons, table data, or decoration. Its rarity is what makes the menubar legible.

**The No-Hex Rule.** All color values are written in OKLCH, in code and in this spec. Never `#000`, never `#fff`; every neutral is tinted toward the blue brand hue.

## 3. Typography

**Display/Body Font:** System sans (Tailwind CSS 4 default stack)

**Character:** Bureaucratic clarity. No custom fonts; the voice comes from aggressive weight contrast and compact sizes, like a well-set government form.

### Hierarchy
- **Headline** (800–850, 1.35–1.4rem, lh 1.2): panel titles ("EBUPOT BP21..."), form headers. Document-module headlines may be uppercase, matching the reference system.
- **Title** (800, 1rem): form section headers.
- **Body** (400–650, 0.85–0.92rem, lh 1.5): table cells, form text. 650 for emphasized data (identity names, tab labels).
- **Label** (750–850, 0.67–0.78rem, lh 1.05): account chips, role tags, breadcrumbs, footers. Small but never light.

### Named Rules
**The Weight-Not-Size Rule.** Hierarchy is built by jumping weight (400 → 650 → 800), not by inflating size. If a heading exceeds 1.4rem, question it.

## 4. Elevation

Flat by default: depth comes from 1px mist borders and tonal layering (paper page → surface panels → navy identity blocks). Exactly one shadow exists in the system.

### Shadow Vocabulary
- **Header float** (`box-shadow: 0 0.65rem 1.6rem oklch(0.42 0.03 255 / 0.12)`): only on the sticky floating app header, to separate it from content scrolling beneath.

### Named Rules
**The One Shadow Rule.** No new box-shadows. A panel that needs separation gets a border or a tonal step, not a shadow.

## 5. Components

### Buttons
- **Shape:** gently rounded (0.55rem)
- **Primary:** Navy Authority background, Surface text (`.bupot-primary-button`), leading Lucide icon, ~0.5rem × 1rem padding
- **Secondary/Ghost:** Nuxt UI `color="neutral"` `variant="ghost|outline"` — toolbar and icon actions
- **Hover / Focus:** Nuxt UI defaults; visible focus ring required

### Cards / Containers (panels)
- **Corner Style:** 0.35rem (content panels); the floating header uses 0.55rem
- **Background:** Surface
- **Border:** 1px Mist Border on every panel; internal sections divided by the same line
- **Shadow Strategy:** none (see Elevation)
- **Internal Padding:** 1rem body, 0.85–1rem headers

### Inputs / Fields
- Nuxt UI `UForm` + `UFormField` + `UInput`/`USelect` defaults (indigo focus ring). Validation messages in Indonesian below the field; error color only after submit attempt.

### Navigation
- **Topbar:** brand crest (navy gradient square, gold landmark icon) + divider + app name; right side: icon buttons, account dropdown chip (name + role in two lines), home button.
- **Menubar:** full-width `UNavigationMenu` of tax modules, 0.92rem semibold, gold highlight bar + 0.13rem gold underline on the active item. Placeholder modules stay visible without links, mirroring the reference system.

### Document page shell (signature component)
The `.bupot-*` class family in `main.css`: breadcrumb row → two-column shell (left: `bupot-side` with navy identity block, module title, bordered status-tab list with count badges; right: `bupot-main` with header, toolbar, `UTable`, paginated footer). Create forms use `bupot-form` header + `bupot-section` panels with 3-column field grids (1-column under 980px). Every new document module must reuse this shell.

### Status badges
`UBadge` with `statusColor` mapping: draft → warning, issued → success, invalid → error; labels from `statusLabel`. Always label + color together.

## 6. Do's and Don'ts

### Do:
- **Do** reuse the `.bupot-*` shell for every document module; fidelity to the reference layout is the feature.
- **Do** write every color as OKLCH and tint neutrals toward hue 250–270.
- **Do** build hierarchy with weight jumps (400/650/800) at compact sizes.
- **Do** keep UI copy in Bahasa Indonesia, with the deliberate English exceptions the reference system itself uses on document screens.
- **Do** keep tables dense: ≥0.85rem text, server pagination, one action column.

### Don't:
- **Don't** use the real national tax system's name, logo, or official seals anywhere. The brand is "Sistem Pembelajaran Pajak Online" / PajakSim with the generic landmark crest.
- **Don't** introduce consumer-SaaS cheerfulness: no pastel gradients, mascots, confetti, or "rounded-everything" (PRODUCT.md anti-reference, verbatim).
- **Don't** ship dark mode; this is a light, formal, classroom interface.
- **Don't** add box-shadows beyond the header float, side-stripe borders (`border-left` > 1px as accent), gradient text, or glassmorphism.
- **Don't** convey status with color alone, and don't invent new status colors beyond warning/success/error.
- **Don't** fall back to the generic admin-template look; when unsure, copy the reference system's pattern, not a SaaS dashboard's.
