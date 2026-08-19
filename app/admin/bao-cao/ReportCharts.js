'use client';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
} from 'recharts';

const C = ['#1591D6', '#F5A623', '#4C8C2B', '#E0567A', '#8E63C8', '#12B5B0', '#E07B39', '#5A6B7B'];
const vnd = (n) => (n || 0).toLocaleString('vi-VN');
const box = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 };
const h3 = { margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#14202B' };

function Card({ title, sub, children }) {
  return (
    <div style={box} className="chart-card">
      <div style={h3}>{title}</div>
      {sub && <div style={{ color: '#6b7280', fontSize: 12, marginTop: -6, marginBottom: 8 }}>{sub}</div>}
      {children}
    </div>
  );
}

export default function ReportCharts({ data }) {
  const { daily, byClub, byType, byStatus, byHour, hvByClub, topHlv } = data;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16 }}>
      <Card title="Xu hướng buổi dạy theo ngày">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={daily} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="so" name="Số buổi" stroke="#1591D6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Buổi dạy theo club">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byClub} margin={{ top: 6, right: 12, left: -12, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
            <XAxis dataKey="club" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} interval={0} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="buoi" name="Số buổi" fill="#1591D6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Cơ cấu loại lớp">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {byType.map((e, i) => <Cell key={i} fill={C[i % C.length]} />)}
            </Pie>
            <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Trạng thái buổi dạy">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {byStatus.map((e, i) => <Cell key={i} fill={['#4C8C2B', '#F5A623', '#1591D6', '#E0567A'][i % 4]} />)}
            </Pie>
            <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Top 10 HLV theo thù lao" sub="Đơn vị: đồng">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={topHlv} layout="vertical" margin={{ top: 6, right: 40, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={vnd} />
            <YAxis type="category" dataKey="ten" width={120} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => vnd(v) + '₫'} />
            <Bar dataKey="tien" name="Thù lao" fill="#F5A623" radius={[0, 4, 4, 0]}>
              <LabelList dataKey="tien" position="right" formatter={vnd} style={{ fontSize: 10, fill: '#6b7280' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Buổi dạy theo khung giờ" sub="Giờ cao điểm trong ngày">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byHour} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
            <XAxis dataKey="gio" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="so" name="Số buổi" fill="#8E63C8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Học viên trung bình theo club">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={hvByClub} margin={{ top: 6, right: 12, left: -12, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
            <XAxis dataKey="club" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} interval={0} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="hvAvg" name="HV trung bình" fill="#12B5B0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
