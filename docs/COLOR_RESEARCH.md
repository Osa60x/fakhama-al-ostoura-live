# Color research notes

## Verified references

- [Material 3 Color System](https://m3.material.io/styles/color/overview): recommends semantic color roles for surfaces, content, controls, and dark themes instead of reusing one accent everywhere. It documents built-in light/dark relationships and tone-based surface roles.
- [Material 3 Color & Contrast](https://m3.material.io/foundations/designing/color-contrast): body text should generally reach at least 4.5:1 contrast; large text and meaningful graphics at least 3:1. Clustered controls should be distinguishable from adjacent surfaces.
- [WebAIM Contrast](https://webaim.org/articles/contrast/): transparency and gradients still affect contrast; test the lowest-contrast area, not only a solid-color sample. Non-text controls should generally reach 3:1 against adjacent colors.
- [Media Studio luxury palettes](https://www.mediastudio.hk/blog-post/best-luxury-color-palettes-for-web-design): identifies navy/gray, dark leather brown/gold, dark green/orange, maroon/salmon, and beige/gold as useful luxury directions, while recommending brand consistency and contrast testing.

## V2 design decisions

1. Keep gold as a restrained accent, not the default text color on every surface.
2. Use separate tokens for page background, surface, elevated surface, primary text, muted text, border, accent, and accent-on-surface.
3. Use deep brown/charcoal rather than pure black for dark mode, and ivory rather than pure white for primary dark-mode text.
4. Test the actual text/background pairs and focus states in both themes; gradients and alpha surfaces must be checked at their lowest contrast point.
5. Add explicit plus/minus controls with `aria-label`, `title`, keyboard support, and a predictable step of 1.00 SAR; keep direct numeric typing available.

## V2 contrast audit

A local WCAG relative-luminance calculation on the selected solid token pairs produced the following ratios:

| Pair | Ratio |
| --- | ---: |
| Light primary text `#272217` on `#f7f3eb` | 14.29:1 |
| Light muted text `#5f5749` on `#f7f3eb` | 6.44:1 |
| Light navy button text `#30475c` on `#fffdf8` | 9.47:1 |
| Light burgundy alert text `#6b3040` on `#fffdf8` | 9.74:1 |
| Dark primary text `#fff5db` on `#211d16` | 15.44:1 |
| Dark muted text `#d7cbb1` on `#211d16` | 10.44:1 |
| Dark gold text `#e4c76e` on `#211d16` | 10.14:1 |

These are solid-color pair checks, not a claim that every pixel of every gradient, transparency state, focus ring, or user-configured title color passes automatically. Gradient and user-supplied colors still require visual/component-level validation.

## Published visual verification

On 2026-08-21, the production page was opened before and after selecting the dark appearance control. The light state showed the ivory/champagne surface treatment; the dark state showed a dark brown/charcoal page, summary, cards, chart, and footer with ivory text and gold borders. This verifies the theme transition at the public-page level. The authenticated admin screen and actual save of a plus/minus adjustment remain E2E-pending because the sandbox browser has no owner session.
