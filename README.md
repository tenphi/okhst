# OKHST: A Tone Space for Stable Perceptual Lightness

> OKHST is an OKHSL-derived color space that replaces authored lightness with a
> tone axis. The goal is to keep the same perceptual lightness for the same tone
> value, regardless of hue or saturation, while making tone steps trend toward
> even contrast.

## Table of Contents

1. [Overview](#1-overview)
2. [Coordinate System](#2-coordinate-system)
3. [Tone Transfer](#3-tone-transfer)
4. [Why Tone Steps Tend Toward Even Contrast](#4-why-tone-steps-tend-toward-even-contrast)
5. [Same Tone, Same Lightness](#5-same-tone-same-lightness)
6. [Scheme Mapping](#6-scheme-mapping)
7. [Recommended Defaults](#7-recommended-defaults)
8. [Verification and Saturation Drift](#8-verification-and-saturation-drift)
9. [Migration from OKHSL Lightness](#9-migration-from-okhsl-lightness)

---

## 1. Overview

OKHST is OKHSL with its lightness axis replaced by a **tone** axis. It keeps
OKHSL's hue and saturation behavior, while deriving the third coordinate from a
normalized logarithmic luminance transfer.

The primary reason OKHST exists is to preserve a simple authoring invariant:
the same tone value should produce the same OKHSL perceptual lightness no matter
which hue or saturation the color uses. A red, blue, gray, and yellow with the
same tone all map to the same OKHSL lightness.

The secondary goal is practical ramp uniformity. Equal tone steps tend to
produce even perceived steps and even WCAG contrast progression, especially for
neutral or low-saturation colors. This is not exact for every hue and
saturation: changing saturation changes the final sRGB luminance, so measured
contrast can drift. That tradeoff is intentional. Correcting the tone transfer
per hue or saturation would improve measured contrast in some cases, but it
would break the same-tone, same-lightness invariant.

OKHST exists to make color ramps easier to author:

- Same tone values share the same OKHSL perceptual lightness.
- Equal tone steps tend toward even perceived and contrast progression.
- Dark-mode inversion can be expressed as `100 - tone`.
- Tone offsets remain stable across schemes.
- The output remains compatible with existing CSS color formats.

OKHST is an **authoring and internal representation space**. There is no CSS
`okhst()` function. Implementations should parse OKHST input and emit standard
formats such as `okhsl`, `rgb`, `hsl`, or `oklch`.

---

## 2. Coordinate System

| Space | Coordinates | Third axis |
|---|---|---|
| OKHSL | `h, s, l` | `l`: perceptual lightness |
| OKHST | `h, s, t` | `t`: tone mapped to OKHSL lightness |

The OKHST coordinates are:

- `h`: hue, in degrees, usually normalized to `[0, 360)`.
- `s`: OKHSL saturation, usually normalized to `[0, 1]`.
- `t`: tone, normalized to `[0, 100]`.

Only the third coordinate changes. Hue and saturation are passed through exactly
as OKHSL defines them.

An implementation may expose OKHST as:

```text
okhst(H S% T%)
```

or as structured data:

```ts
type OkhstColor = {
  h: number;
  s: number;
  t: number;
  alpha?: number;
};
```

---

## 3. Tone Transfer

For a neutral color at OKHSL lightness `l`, luminance can be approximated by
passing through the OKHSL toe curve and the OKLab cube:

```text
Y = toeInv(l) ^ 3
l = toe(cbrt(Y))
```

Here:

- `l` is OKHSL lightness on `[0, 1]`.
- `Y` is relative luminance on `[0, 1]`.
- `toe` and `toeInv` are the standard OKHSL toe transfer functions.

Tone is a normalized natural logarithm of luminance with a small offset `eps`:

```text
toTone(Y, eps) =
  (ln(Y + eps) - ln(eps)) /
  (ln(1 + eps) - ln(eps)) * 100

fromTone(T, eps) =
  exp((T / 100) * (ln(1 + eps) - ln(eps)) + ln(eps)) - eps
```

`toTone` and `fromTone` are analytic inverses. They satisfy:

```text
toTone(0, eps) = 0
toTone(1, eps) = 100
```

for any positive `eps`.

The canonical OKHST reference value is:

```text
REF_EPS = 0.05
```

This value is not arbitrary: it matches the `0.05` offset in the WCAG 2 contrast
formula.

---

## 4. Why Tone Steps Tend Toward Even Contrast

WCAG 2 contrast is:

```text
contrast = (Y_hi + 0.05) / (Y_lo + 0.05)
```

When `eps = 0.05`, tone becomes a normalized logarithm of the same quantity used
by WCAG contrast: `Y + 0.05`.

Two neutral colors separated by a fixed tone delta therefore have a fixed ratio
of `(Y + 0.05)`:

```text
cr(T2, T1) =
  (Y2 + 0.05) / (Y1 + 0.05)

cr(T2, T1) =
  exp((T2 - T1) / 100 * (ln(1.05) - ln(0.05)))
```

For neutral colors, a fixed tone step corresponds to a fixed WCAG contrast
multiplier, independent of where the step appears on the scale.

For neutral colors with `eps = 0.05`, contrast against black is approximately:

| Tone | Contrast vs black |
|---:|---:|
| 10 | 1.36 |
| 30 | 2.49 |
| 50 | 4.58 |
| 70 | 8.43 |
| 90 | 15.49 |
| 100 | 21.00 |

A neutral tone ramp such as `[20, 40, 60, 80]` therefore has constant contrast
between adjacent stops.

For chromatic colors, this becomes an approximation. OKHST keeps the same
OKHSL lightness for the same tone, but hue and saturation affect the final sRGB
luminance. Higher saturation can move measured contrast away from the neutral
prediction. In practice, the tone axis still gives a useful progression, but it
should not be described as perfectly uniform for every color.

---

## 5. Same Tone, Same Lightness

Converting OKHST to OKHSL passes hue and saturation through unchanged:

```text
okhstToOkhsl({ h, s, t }) = {
  h,
  s,
  l: toe(cbrt(fromTone(t, REF_EPS)))
}
```

This gives OKHST its main invariant:

> A given tone maps to the same OKHSL lightness for every hue and saturation.

The invariant is intentionally about OKHSL lightness, not physical luminance.
Different saturated hues at the same OKHST tone can still have different real
luminance after conversion to sRGB. A saturated yellow and saturated blue may
share OKHSL lightness but differ in measured WCAG or APCA contrast.

This chromatic drift is the main approximation in OKHST. The model accepts it
because the alternative is worse for authoring: if the tone transfer changed by
hue or saturation, the same tone value would no longer mean the same perceptual
lightness. Implementations that need guaranteed contrast should measure the
final rendered color instead of assuming tone alone is enough.

---

## 6. Scheme Mapping

OKHST makes scheme mapping simple because tone is a stable `[0, 100]` axis.

A practical rendering pipeline is:

```text
author tone T
  -> choose scheme branch
      light/static: keep T
      dark/auto:    use 100 - T
  -> remap T into the scheme tone window [lo, hi]
  -> convert tone to OKHSL lightness
  -> render to the desired output color format
  -> optionally verify measured contrast
```

The dark-mode transform is a single inversion:

```text
T_dark = 100 - T_light
```

No fitted dark curve is required.

### Tone Windows

A scheme may constrain rendered tone to a window:

```text
[lo, hi]
```

For example, a light scheme may avoid pure black by mapping the full author
range into `[10, 100]`, while a dark scheme may map into `[15, 95]`.

Window remapping is linear in tone space:

```text
T_windowed = lo + (T / 100) * (hi - lo)
```

High-contrast modes should normally use the full `[0, 100]` range.

---

## 7. Recommended Defaults

Recommended defaults for general UI color systems:

| Setting | `lo` | `hi` | `eps` |
|---|---:|---:|---:|
| Light scheme | 10 | 100 | 0.05 |
| Dark scheme | 15 | 95 | 0.05 |
| High contrast | 0 | 100 | 0.05 |

These defaults keep neutral tone stepping close to WCAG contrast-even while
avoiding overly harsh extremes in ordinary light and dark schemes.

An implementation may allow advanced users to configure per-scheme `eps`
values. If it does, the reference tone should still be stored with `REF_EPS` so
relative tone offsets and contrast checks remain comparable across schemes.

---

## 8. Verification and Saturation Drift

OKHST's tone axis gives exact WCAG contrast spacing for neutral colors under
the WCAG formula. For chromatic colors, tone maps through OKHSL lightness and
then into the target gamut. The resulting sRGB luminance can drift by hue and
saturation.

This distinction is important. Formulas derived from `Y + 0.05` describe a
neutral-color ramp. Once saturation enters the color, the rendered luminance
shifts. Two colors with the same tone keep the same OKHSL lightness, but they
may no longer have the same WCAG ratio or APCA `Lc` against a base.

An implementation that promises contrast floors should treat OKHST tone as the
starting point and verify the rendered result:

1. Convert OKHST to the output color.
2. Compute actual WCAG ratio or APCA `Lc` against the base.
3. If the target is missed, continue tone search or report a warning.

This keeps the model honest: OKHST provides a better authoring axis for stable
perceptual lightness, while final contrast guarantees still require measuring
the rendered color.

---

## 9. Migration from OKHSL Lightness

OKHSL lightness and OKHST tone are not the same value.

To convert an existing OKHSL lightness value `L` on `[0, 100]` into OKHST tone:

```text
Y = toeInv(L / 100) ^ 3
T = toTone(Y, REF_EPS)
```

To convert OKHST tone back into OKHSL lightness:

```text
Y = fromTone(T, REF_EPS)
L = toe(cbrt(Y)) * 100
```

Existing lightness scales should be migrated intentionally. A visually even
OKHSL ramp will not necessarily become a contrast-even OKHST ramp by preserving
the same numeric values.
