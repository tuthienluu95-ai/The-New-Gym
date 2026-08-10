'use client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

const BLUE = '#1591D6';
const ORANGE = '#F07E22';

export default function ReportChart({ daily, topPay }) {
  return (
    <div className="stack">
      <div className="card">
        <h2>Số ca theo ngày trong tháng</h2>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={daily} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E9EF" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v} ca`, 'Số ca']} labelFormatter={(d) => `Ngày ${d}`} />
              <Line type="monotone" dataKey="so" stroke={BLUE} strokeWidth={2.5} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2>Tổng tiền theo giáo viên (cao nhất)</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={topPay} layout="vertical" margin={{ top: 4, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E9EF" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => (v / 1000) + 'k'} />
              <YAxis type="category" dataKey="ten" width={120} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [Number(v).toLocaleString('vi-VN') + ' đ', 'Tổng tiền']} />
              <Bar dataKey="tien" fill={ORANGE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
