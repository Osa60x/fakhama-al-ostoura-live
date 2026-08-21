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
