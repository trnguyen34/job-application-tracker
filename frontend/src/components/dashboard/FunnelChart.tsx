import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Stats } from '../../api/types'
import { STATUS_LABELS } from '../../api/types'
import { axisStyle, chart, tooltipStyle } from './chartTheme'

export default function FunnelChart({ data }: { data: Stats['status_funnel'] }) {
  const rows = data.map((row) => ({ ...row, label: STATUS_LABELS[row.status] }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={chart.gridline} horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...axisStyle} />
        <YAxis type="category" dataKey="label" width={92} {...axisStyle} />
        <Tooltip {...tooltipStyle} formatter={(value) => [value as number, 'applications']} />
        <Bar dataKey="count" fill={chart.blue} barSize={14} radius={[0, 4, 4, 0]}>
          <LabelList dataKey="count" position="right" fill={chart.inkSecondary} fontSize={11} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
