# Luxury Editorial Redesign

## Mode
Redesign · Overhaul — a new visual language while preserving the live gold-price product contract.

## Preserve
- Public route and `/admin` route.
- Arabic RTL behavior and all live price, freshness, chart, share, calculator, and admin flows.
- Existing theme resolution, Supabase logo support, disclosure copy, and accessibility focus states.

## Improve
- First viewport hierarchy, brand storytelling, product imagery, navigation cues, responsive rhythm, CTA feedback, and motion craft.
- Shift from “data dashboard” to “luxury market salon”: editorial hero, collection cards, and a clearer price ritual.

## Remove
- Generic dashboard-first framing and oversized abstract diamond as the only visual anchor.

## Protected contracts
Routes, field names (`grams`, `carat`), share behavior, chart range values, admin entry, legal/disclosure copy, and dynamic theme tokens.

## Design Read + dials
- Artifact: Arabic luxury gold price salon / commerce dashboard
- Audience: Saudi shoppers and jewelry clients checking a trusted reference price
- Visual language: quiet editorial jewelry campaign, dark mineral surfaces, champagne-gold accents, generous negative space
- Mode: overhaul with preserved data contracts
- Visual variance: 8/10 · motion intensity: 5/10 · information density: 5/10 · asset dependence: 9/10 · brand fidelity: 8/10

## Design decisions
- Palette: obsidian `#11100e`, mineral `#1b1915`, parchment `#efe3cf`, champagne `#d6ad62`, muted sage `#9ca995`.
- Typography: Cairo for Arabic utility; Cormorant Garamond for editorial Latin numerals/labels via CSS fallback stack.
- Spacing: 8px rhythm with generous section separation.
- Radius: large 24px editorial surfaces, 12px controls, pill badges only for status.
- Shadows: soft layered shadow, never glossy neon.
- Motion: 220–700ms cubic-bezier transitions, slow ambient light, reveal-on-load, reduced-motion safe.

## Highest-risk change
Adding a photographic hero without obscuring live prices on smaller screens.

## Rollback / fallback
Hero uses a local generated asset with a mineral gradient fallback; all sections remain usable if images fail to load.
