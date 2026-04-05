// Color scale for the map: map a day-of-year value to a theme-aware color.
//
// Earlier frosts → green-ish (safer, Mediterranean); later frosts → red-ish
// (riskier, continental). A 5-stop piecewise-linear interpolation in OKLCH
// between the "safe" and "risky" endpoints.

type RGB = { r: number; g: number; b: number }

// OKLCH end points are nice in theory but browsers vary; we use simple RGB
// interpolation here. Colors hand-picked to feel at home against the
// sage-editorial palette (light) and its dark-mode variant.
const SCALE_LIGHT: Array<{ stop: number; color: RGB }> = [
  { stop: 0.0, color: { r: 180, g: 210, b: 175 } }, // pale sage
  { stop: 0.25, color: { r: 150, g: 195, b: 140 } }, // sage
  { stop: 0.5, color: { r: 220, g: 200, b: 120 } }, // amber
  { stop: 0.75, color: { r: 220, g: 140, b: 90 } }, // warm terracotta
  { stop: 1.0, color: { r: 190, g: 80, b: 65 } }, // tomato
]

const SCALE_DARK: Array<{ stop: number; color: RGB }> = [
  { stop: 0.0, color: { r: 85, g: 125, b: 85 } },
  { stop: 0.25, color: { r: 100, g: 150, b: 100 } },
  { stop: 0.5, color: { r: 170, g: 145, b: 75 } },
  { stop: 0.75, color: { r: 190, g: 110, b: 70 } },
  { stop: 1.0, color: { r: 170, g: 65, b: 55 } },
]

export type ColorRange = {
  /** Earliest doy in the dataset (maps to scale position 0). */
  min: number
  /** Latest doy in the dataset (maps to scale position 1). */
  max: number
}

/** Return a CSS rgb() string for the given day-of-year. */
export function colorForDoy(
  doy: number | null,
  range: ColorRange,
  theme: 'light' | 'dark' = 'light',
): string {
  if (doy === null) {
    // No frost observed — use a neutral muted color.
    return theme === 'dark' ? 'rgb(60, 65, 72)' : 'rgb(220, 222, 220)'
  }

  const t = clamp01((doy - range.min) / Math.max(1, range.max - range.min))
  const scale = theme === 'dark' ? SCALE_DARK : SCALE_LIGHT
  const { r, g, b } = interpolate(scale, t)
  return `rgb(${r}, ${g}, ${b})`
}

function interpolate(
  scale: Array<{ stop: number; color: RGB }>,
  t: number,
): RGB {
  for (let i = 1; i < scale.length; i++) {
    if (t <= scale[i].stop) {
      const prev = scale[i - 1]
      const next = scale[i]
      const local = (t - prev.stop) / (next.stop - prev.stop)
      return {
        r: Math.round(prev.color.r + (next.color.r - prev.color.r) * local),
        g: Math.round(prev.color.g + (next.color.g - prev.color.g) * local),
        b: Math.round(prev.color.b + (next.color.b - prev.color.b) * local),
      }
    }
  }
  return scale[scale.length - 1].color
}

function clamp01(x: number): number {
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}
