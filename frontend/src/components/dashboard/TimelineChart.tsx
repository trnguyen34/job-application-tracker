import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Stats } from '../../api/types'
import { shortDate } from '../../lib/dates'
import { axisStyle, chart, tooltipStyle } from './chartTheme'

export default function TimelineChart({ data }: { data: Stats['applications_over_time'] }) {
  if (!data.length) return <div className="empty-state">No applications with dates yet.</div>

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
        <CartesianGrid stroke={chart.gridline} vertical={false} />
        <XAxis dataKey="week" tickFormatter={shortDate} {...axisStyle} />
        <YAxis allowDecimals={false} {...axisStyle} />
        <Tooltip
          {...tooltipStyle}
          labelFormatter={(week) => `Week of ${shortDate(String(week))}`}
          formatter={(value) => [value as number, 'applications']}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={chart.blue}
          strokeWidth={2}
          fill={chart.blueSoft}
          dot={{ r: 3, fill: chart.blue, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
