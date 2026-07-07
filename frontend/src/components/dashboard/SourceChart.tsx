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
import { axisStyle, chart, tooltipStyle } from './chartTheme'

export default function SourceChart({ data }: { data: Stats['by_source'] }) {
  if (!data.length) return <div className="empty-state">No sources recorded yet.</div>

  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={chart.gridline} horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...axisStyle} />
        <YAxis type="category" dataKey="source" width={92} {...axisStyle} />
        <Tooltip {...tooltipStyle} formatter={(value) => [value as number, 'applications']} />
        <Bar dataKey="count" fill={chart.blue} barSize={14} radius={[0, 4, 4, 0]}>
          <LabelList dataKey="count" position="right" fill={chart.inkSecondary} fontSize={11} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
