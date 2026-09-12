# CandleyAroma Visual Design System

CandleyAroma is an artisanal home-fragrance brand. The interface should feel like a quiet boutique perfumery: warm, tactile, spacious, and considered.

## Design Principles

- **Warm over sterile:** use alabaster as the default canvas instead of pure white.
- **Soft hierarchy:** use charcoal slate for readable structure, lavender for brand moments, and gold only for high-intent actions.
- **Breathing room:** use generous spacing and restrained borders so products remain the focus.
- **Tactile calm:** use 12px-16px corners and warm tinted shadows that echo wax and handmade objects.

## Color Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#FFFDF2` | Primary page background, alabaster / milk white |
| `--bg-soft` | `#F8F3E8` | Secondary bands and admin canvas |
| `--bg-lavender` | `#F4EFFC` | Soft branded surface |
| `--card` | `#FFFFFF` | Product cards and raised content |
| `--text-strong` | `#343434` | Headings and high-priority labels |
| `--text` | `#4F4F4F` | Body copy and structure |
| `--text-soft` | `#6F6A68` | Supporting copy |
| `--muted` | `#918B8A` | Metadata and helper copy |
| `--lavender` | `#8A6FCF` | Brand accent, tags, outlines, wishlist |
| `--lavender-dark` | `#6249A4` | Strong lavender text and announcement band |
| `--gold` | `#C19A6B` | Primary CTA, checkout, conversion moments |
| `--gold-dark` | `#957044` | CTA hover state |
| `--rose` | `#C5A3E0` | Secondary accent and seasonal highlights |
| `--rose-soft` | `#F5ECFB` | Hover and active soft surface |
| `--gold-soft` | `#F6EDDF` | Gold-tinted supporting surface |
| `--line` | `rgba(79, 79, 79, 0.14)` | Neutral dividers |
| `--line-lavender` | `rgba(138, 111, 207, 0.28)` | Branded borders |

### Background Contrast

- Use `--bg` behind standard content and navigation.
- Use `--card` only for raised panels, cards, forms, and product information.
- Use `--bg-soft` for broad secondary sections where a visual break is needed.
- Use `--bg-lavender` or `--lavender-soft` for tags, selected filters, seasonal moments, and brand callouts.
- Use `--lavender-dark` with light text for high-contrast branded bands.
- Never place `--muted` text on `--bg-lavender` for essential information; use `--text` instead.

## Typography

- **Display:** Playfair Display, falling back to Georgia. Use for the brand wordmark, hero headings, section titles, and product names.
- **Interface:** DM Sans, falling back to Segoe UI. Use for navigation, body copy, controls, prices, metadata, and form fields.
- **Eyebrows:** DM Sans, 0.72rem, uppercase, 0.18em tracking, lavender-dark.
- **Body:** DM Sans, 1rem, 1.5 line-height, charcoal slate.
- **Hero heading:** Playfair Display, responsive 2.5rem-5rem, tight line-height.
- **Section heading:** Playfair Display, responsive 1.8rem-3rem.

## Shape, Depth, and Spacing

- Default radius: `14px`.
- Compact controls and inputs: `12px`.
- Hero and editorial media: up to `30px` when the composition calls for a softer frame.
- Default shadow: `0 12px 32px rgba(193, 154, 107, 0.08)`.
- Hover shadow: `0 18px 42px rgba(193, 154, 107, 0.16)`.
- Keep cards separated by 20px and sections separated by at least 56px.

## Component States

### Primary CTA / Gold Button

- **Default:** gold background `#C19A6B`, alabaster text, warm shadow.
- **Hover:** darker gold `#957044`, translate up 2px, stronger warm shadow.
- **Active:** return to resting position, no layout shift.
- **Disabled:** 48% opacity, no transform, `not-allowed` cursor.
- **Focus:** 3px lavender focus ring.

### Secondary Button

- **Default:** white card background, lavender-tinted border, charcoal text.
- **Hover:** lilac rose surface `#F5ECFB`, rose border, translate up 2px.
- **Active:** return to resting position.
- **Disabled:** 48% opacity, no transform.
- **Focus:** 3px lavender focus ring.

### Wishlist

- **Default:** white circular control with lavender icon.
- **Hover:** rose-soft background and slightly enlarged control.
- **Active:** danger rose icon on rose-soft background.
- **Focus:** shared lavender focus ring.

### Inputs and Selects

- **Default:** alabaster background, neutral border, charcoal text.
- **Hover:** lavender-tinted border.
- **Focus:** lavender focus ring and no browser-default outline.
- **Disabled:** reduced opacity and non-interactive cursor.

### Product Cards

- **Default:** white card, neutral border, light warm shadow.
- **Hover:** lift 4px, lavender-tinted border, warm hover shadow.
- **Active:** preserve product position; only controls should respond.

## Accessibility

- Preserve visible keyboard focus using the shared lavender ring.
- Keep body copy in charcoal slate rather than muted gray for essential content.
- Provide text alternatives for product images and icon-only buttons.
- Respect `prefers-reduced-motion`; decorative movement must stop without hiding content.
