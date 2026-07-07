/* Chart colors as hex constants: SVG presentation attributes can't resolve
   CSS custom properties, so these mirror tokens.css (dark-surface palette). */

export const chart = {
  blue: '#3987e5',
  blueSoft: 'rgba(57, 135, 229, 0.25)',
  gridline: '#2c2c2a',
  baseline: '#383835',
  inkMuted: '#898781',
  inkSecondary: '#c3c2b7',
  surface: '#1a1a19',
}

export const axisStyle = {
  stroke: chart.baseline,
  tick: { fill: chart.inkMuted, fontSize: 11 },
  tickLine: false as const,
  axisLine: { stroke: chart.baseline },
}

export const tooltipStyle = {
  contentStyle: {
    background: chart.surface,
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    fontSize: 12,
    color: chart.inkSecondary,
  },
  labelStyle: { color: chart.inkSecondary, fontWeight: 600 },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
}
