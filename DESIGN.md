---
name: SEEK
description: Restrained editorial surfaces for campus recruitment.
colors:
  bg: "#09090b"
  surface: "#111113"
  raised: "#19191c"
  border: "#29292e"
  ink: "#f4f4f5"
  muted: "#a1a1aa"
  accent: "#e8b66b"
  positive: "#a4c7ad"
  negative: "#f09c9c"
  accent-hover: "#f2c584"
  accent-ink: "#17120a"
  panel: "#0e0e10"
  field: "#151518"
  field-ink: "#eeeef2"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(40px, 5.5vw, 78px)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "29px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.55
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
  figures:
    fontFamily: "JetBrains Mono, monospace"
rounded:
  small: "4px"
  button: "5px"
  panel: "6px"
spacing:
  field-gap: "8px"
  action-gap: "10px"
  form-column-gap: "16px"
  panel-gap: "22px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.button}"
    padding: "10px 17px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-small:
    rounded: "{rounded.button}"
    padding: "5px 10px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-ink}"
    rounded: "{rounded.small}"
    padding: "11px 12px"
---

# Design System: SEEK

## Overview

SEEK uses the user-selected editorial app direction: near-black zinc, restrained warm amber, Inter text, and JetBrains Mono figures. Fine dividers and clear type hierarchy organize dense recruitment information. Broad unbroken backgrounds give the content room without turning every fact into a separate card.

This is a scan of the implemented stylesheet and shared UI components, with PRODUCT.md as the identity constraint. The descriptive language records the supplied direction; it does not introduce a new creative metaphor. Evidence is source-based, not a full cross-browser or accessibility audit.

Key characteristics:

- Quiet dark surfaces and narrow amber emphasis.
- Compact, aligned operational information.
- Editorial headings with precise numeric typography.

## Colors

### Primary

Warm amber (`accent`) marks primary actions, active navigation, keyboard focus, text selection, and small identity details. Its lighter hover companion is reserved for action feedback.

### Neutral

Near-black zinc (`bg`) is the canvas. `surface` and `raised` distinguish layered regions; `panel` is the subtle inset content surface. `border` supports division without heavy outlines. `ink` carries headings and important content; `muted` carries supporting text. Fields have their own slightly brighter neutral fill and text.

### Semantic colors

Soft sage (`positive`) supports successful or eligible states; soft red (`negative`) supports errors and destructive actions. Status badges also have locally defined subdued fills and borders. Their labels remain visible so meaning does not depend on color alone.

**The Restrained Accent Rule.** Keep amber concentrated on actions and state cues; preserve the neutral canvas.

## Typography

Inter with system sans-serif fallback is the implemented text family. JetBrains Mono with monospace fallback carries compensation, dates, metrics, and numeric cells, with tabular figures. Geist is a product-plan option, not the current CSS family.

The frontmatter records the base hierarchy. The display role belongs to the landing headline; page headings use the headline role. Panel titles are compact (14px), while form labels and most supporting interface text are (12px). Headings use medium weight and slightly tightened spacing. Hero supporting copy uses generous leading (1.9) and a bounded measure (415px).

**The Figures Rule.** Preserve monospaced, tabular numeric presentation for comparable values; keep ordinary prose in Inter.

## Layout

Operational portals use a fixed navigation rail (228px), remaining main canvas, and a content maximum (1600px). Default canvas padding is (36px 36px 32px). Dashboard content pairs a flexible main column with a secondary column (292px), separated by the panel gap. Tables retain horizontal scrolling when content needs it. Form fields generally use two columns with the form-column gap.

The landing has a two-column hero and wider vertical spacing. This records the current Persuade surface; the portals are Operate surfaces. These modes describe the existing composition, not a requirement to use marketing composition in working screens.

At (1200px) and below, the navigation rail narrows (205px). At (980px) and below, dashboard, job, analytics, and form-step layouts simplify. At (760px) and below, navigation becomes an off-canvas rail (250px), the canvas uses (26px 18px), metrics use two columns, and the landing stacks. At (1500px) and above, the secondary dashboard column grows (330px) and job listings use three columns. The mobile hero uses a separate responsive type clamp (38px to 60px).

## Elevation & Depth

Depth comes primarily from tonal changes and one-pixel dividers. Resting panels do not have decorative shadows. Drawers use a directional shadow; toasts use a compact shadow to separate transient feedback from underlying work. Exact shadow and motion values are carried in the sidecar.

**The Quiet Surface Rule.** Reserve shadow elevation for overlays and transient feedback.

## Shapes

Small corner radii keep controls and panels restrained. Use the frontmatter button, small, and panel radii for their corresponding roles. Circular forms are reserved for tiny status dots, step numbers, and identity marks. Borders are subtle and thin; avoid turning ordinary content containers into prominent floating tiles.

## Components

### Buttons

Primary buttons use amber with dark text; secondary buttons use a transparent fill and neutral stroke, becoming darker raised neutrals on hover. Default controls have a minimum height (40px), with a compact variant (31px). Disabled buttons reduce opacity (0.45) and show an unavailable cursor. Background and text transitions take (0.16s).

### Status badges

Compact outlined labels pair a small current-color dot with readable status text. Pending and interview states are amber, positive outcomes are sage, and negative outcomes use soft red. The dot is supplemental, not the only status indicator.

### Panels and tables

Panels use the subtle panel background, small curved corners, and a single thin border. Their headers arrange title and optional action horizontally. Tables use the shared scroll wrapper, compact headings, and aligned numeric values.

### Inputs and fields

Visible labels sit above inputs with a small gap. Hints are subordinate text below the control. Inputs, selects, and textareas use the field tokens and a thin neutral border. Disabled inputs have a darker fill and muted text. Textareas resize vertically.

### Navigation

The desktop rail groups compact links. Active links pair an amber icon with a thin amber underline beneath the label. Hover adds a subtle neutral fill. Mobile navigation slides into view over a scrim with a transform transition (0.2s).

### Drawers, feedback, and focus

Drawers sit at the right edge with a maximum width (570px), a sticky header, and internal scrolling. The shared component declares modal semantics, moves focus inside, handles Escape, cycles focus, locks body scrolling, and restores prior focus on close. These are implemented behaviors, not a claim of independently audited accessibility.

Keyboard-focusable controls share an amber outline (2px) with offset (4px). Loading and errors use status/alert semantics. Toasts sit near the bottom center. Reduced-motion preference disables CSS animation and transitions and resets smooth scrolling.

## Do's and Don'ts

- Do reuse the existing shared heading, panel, field, badge, drawer, and table components.
- Do preserve visible labels, focus outlines, and textual status meanings.
- Do maintain the neutral editorial hierarchy and restrained amber emphasis.
- Do keep operational screens compact and data-aligned.
- Don't apply landing display typography to routine working-screen labels.
- Don't replace subtle panel borders with decorative gradients or pervasive shadows.
- Don't present source inspection as a completed cross-browser audit.
