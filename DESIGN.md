---
name: Ignition Technical
colors:
  surface: '#121317'
  surface-dim: '#121317'
  surface-bright: '#38393d'
  surface-container-lowest: '#0d0e12'
  surface-container-low: '#1a1b1f'
  surface-container: '#1e1f23'
  surface-container-high: '#292a2e'
  surface-container-highest: '#343539'
  on-surface: '#e3e2e7'
  on-surface-variant: '#d0c6ab'
  inverse-surface: '#e3e2e7'
  inverse-on-surface: '#2f3034'
  outline: '#999077'
  outline-variant: '#4d4632'
  surface-tint: '#e9c400'
  primary: '#fff5dc'
  on-primary: '#3a3000'
  primary-container: '#ffd600'
  on-primary-container: '#705d00'
  inverse-primary: '#705d00'
  secondary: '#c8c6c8'
  on-secondary: '#303032'
  secondary-container: '#474649'
  on-secondary-container: '#b7b4b7'
  tertiary: '#f7f5f7'
  on-tertiary: '#303032'
  tertiary-container: '#dbd8db'
  on-tertiary-container: '#5f5e60'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe170'
  primary-fixed-dim: '#e9c400'
  on-primary-fixed: '#221b00'
  on-primary-fixed-variant: '#544600'
  secondary-fixed: '#e5e1e4'
  secondary-fixed-dim: '#c8c6c8'
  on-secondary-fixed: '#1b1b1d'
  on-secondary-fixed-variant: '#474649'
  tertiary-fixed: '#e4e2e4'
  tertiary-fixed-dim: '#c8c6c8'
  on-tertiary-fixed: '#1b1b1d'
  on-tertiary-fixed-variant: '#474649'
  background: '#121317'
  on-background: '#e3e2e7'
  surface-variant: '#343539'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  title-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-technical:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  touch-target-min: 48px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered for the high-stakes, high-velocity environment of group motorcycle touring. The brand personality is **technical, rugged, and premium**, prioritizing rapid information retrieval and absolute clarity under varying light conditions. 

The aesthetic draws from **Modern Automotive Instrumentation** and **Aeronautical Interface Design**. It avoids superficial trends like glassmorphism or neomorphism in favor of a "Utility-First" philosophy. The visual response should be one of professional-grade reliability—reminiscent of a high-end GPS unit or a motorcycle’s digital dash.

Key stylistic pillars include:
- **High-Contrast Dark Mode:** Optimized for outdoor visibility and reduced eye strain during night rides.
- **Precision Engineering:** Sharp execution, consistent line weights, and a lack of visual clutter.
- **Tactile Confidence:** Large, decisive interactive elements that imply durability.

## Colors

The palette is anchored in a "Deep Space" charcoal environment to ensure the **Circuit Amber** primary accent remains functionally distinct. 

- **Primary (Circuit Amber):** Used exclusively for critical calls to action, active navigation paths, and essential status indicators. This color is chosen for its high visibility against dark asphalt and night-mode interfaces.
- **Surface Strategy:** The system uses `#0A0A0B` as the true base, with `#121214` and `#1C1C1E` providing tonal elevation for cards and containers.
- **Typography:** Primary information uses a high-contrast off-white to prevent "haloing" common with pure white on black. Secondary metadata uses a muted slate to maintain hierarchy.
- **Semantic Logic:** Red and Green are used sparingly and strictly for functional states (Emergency/Stop vs. Active/Go).

## Typography

The typographic system utilizes a tri-font strategy to balance impact, legibility, and technical data display.

- **Hanken Grotesk (Headlines):** Chosen for its sharp, contemporary geometry and exceptional weight presence. Used for primary navigation titles and major headers.
- **Inter (Body):** The workhorse for all descriptive text. Its neutral character ensures high legibility at various distances and vibration levels.
- **JetBrains Mono (Data/Labels):** Used for "instrumentation" data such as speed, distance, coordinates, and timestamps. The monospaced nature allows for stable numerical layouts.

**Hierarchy Rules:**
- Use `display-lg` only for empty states or dashboard summaries.
- `label-technical` should be used for all dynamic data readouts.
- Increase line-height slightly for body text to improve readability while in motion.

## Layout & Spacing

This design system employs a **strict 4px grid** with a focus on "Gloved-Hand Accessibility." 

- **The Touch-First Model:** All interactive elements must maintain a minimum hit area of 48x48px. In riding modes, primary action targets should expand to 64px height.
- **Grid:** A 12-column fluid grid for desktop and a 4-column fluid grid for mobile.
- **Margins:** Generous 20px side margins on mobile to prevent accidental triggers while holding a device in a mount.
- **Map Centricity:** The layout assumes the map is the lowest layer. UI components exist as floating modules or anchored bottom sheets to maximize the "horizon" of the map view.

## Elevation & Depth

Depth is conveyed through **Tonal Tiering** and **Technical Outlines** rather than traditional shadows.

- **Layer 0 (Base):** The map or the main background (`#0A0A0B`).
- **Layer 1 (Containers):** Cards and list items (`#121214`). These are defined by a 1px solid border (`#2C2C2E`) to create separation from the background.
- **Layer 2 (Interactions):** Active pop-overs or selected cards. These utilize a secondary border in `Circuit Amber` or a subtle inner glow.
- **Shadows:** Only used sparingly on floating action buttons (FABs) to provide a slight lift off the map. Shadows should be sharp, low-blur, and high-opacity (e.g., `0px 4px 0px rgba(0,0,0,0.5)`).

## Shapes

The shape language is **Soft-Technical**. We avoid circular "pill" shapes for buttons to maintain a more rugged, industrial appearance, opting instead for consistent, small-radius corners.

- **Standard Elements:** 0.25rem (4px) corner radius for input fields, buttons, and small chips.
- **Containers:** 0.5rem (8px) for cards and bottom sheets to give them a slightly more "molded" feel.
- **Map Markers:** Distinctive "shield" or "hexagon" shapes rather than standard teardrops to reinforce the automotive theme.

## Components

### Buttons
- **Primary:** Circuit Amber background, Black text (`#0A0A0B`). High-weight bold caps.
- **Secondary:** Transparent background, 2px Slate border, Off-white text.
- **Critical:** Emergency Red background with high-contrast white text.

### Cards
- No shadows. Use 1px borders in `#2C2C2E`.
- Padding should be a minimum of 16px to ensure content is clear of the edges for gloved visibility.

### Bottom Sheets
- Anchored to the bottom for thumb-reachability. 
- Use a thick (4px) horizontal handle in `#2C2C2E` for intuitive swiping.
- Background: `#121214` with a subtle top-border highlight.

### Map Markers
- Use high-stroke-width icons.
- Group members' markers should feature their initials in `JetBrains Mono` for rapid identification.

### Input Fields
- Dark backgrounds (`#0A0A0B`) with 1px slate borders. 
- Active state: Border changes to Circuit Amber.
- Labels are always visible (no floating labels that disappear) to ensure context is never lost.

### Chips/Status Indicators
- Small, rectangular with 2px radius. 
- Use `label-technical` for text. 
- Use background tints of success/error colors at 15% opacity with 100% opacity text for status readability.