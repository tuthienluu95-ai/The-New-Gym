import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { buildReport } from '../../../lib/report';
import { vnParts } from '../../../lib/time';
import ReportCharts from './ReportCharts';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';
const vnd = (n) => (n || 0).toLocaleString('vi-VN');

export default async function BaoCaoPage({ searchParams }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { dateStr } = vnParts();
  const tu = searchParams?.tu || (dateStr.slice(0, 7) + '-01');
  const den = searchParams?.den || dateStr;
  const club = searchParams?.club || '';

  const { data: clubs } = await sb.from('clubs').select('id, ten_club').order('ma_club');
  const rep = await buildReport(sb, tu, den, club || null);
  const t = rep.totals;
  const dungGio = t.so_ca ? Math.round(((t.so_ca - t.so_tre) / t.so_ca) * 100) : 0;
  const tenClub = club ? (clubs || []).find((c) => c.id === club)?.ten_club : 'Tất cả club';

  const kpis = [
    { l: 'Tổng buổi dạy', v: vnd(t.so_ca) },
    { l: 'Tổng thù lao', v: vnd(t.tong_tien) + '₫' },
    { l: 'Tổng lượt học viên', v: vnd(t.tong_hv) },
    { l: 'Tỉ lệ đúng giờ', v: dungGio + '%' },
    { l: 'Lớp trống (GV vắng)', v: vnd(rep.missed) },
    { l: 'Buổi ≤ 5 HV', v: vnd(rep.hvList.length) },
  ];

  return (
    <div className="stack report-page">
      <div className="report-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>Báo cáo vận hành</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>{tenClub} · {tu} → {den}</p>
        </div>
        <div className="noprint" style={{ display: 'flex', gap: 8 }}>
          <a className="btn" href={`/api/admin/report-export?tu=${tu}&den=${den}`}>Xuất Excel</a>
          <PrintButton />
        </div>
      </div>

      <div className="card noprint">
        <form className="filters">
          <div><label>Từ ngày</label><input type="date" name="tu" defaultValue={tu} /></div>
          <div><label>Đến ngày</label><input type="date" name="den" defaultValue={den} /></div>
          <div><label>Club</label>
            <select name="club" defaultValue={club}>
              <option value="">Tất cả club</option>
              {(clubs || []).map((c) => <option key={c.id} value={c.id}>{c.ten_club}</option>)}
            </select>
          </div>
          <button className="btn primary">Xem báo cáo</button>
        </form>
      </div>

      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div className="kpi" key={i}>
            <div className="kpi-v">{k.v}</div>
            <div className="kpi-l">{k.l}</div>
          </div>
        ))}
      </div>

      <ReportCharts data={rep} />

      <div className="card">
        <h2>Bảng thù lao theo HLV</h2>
        <table>
          <thead><tr><th>HLV</th><th>Số buổi</th><th>Đi trễ</th><th>Lượt HV</th><th>Thù lao</th></tr></thead>
          <tbody>
            {rep.list.length === 0 && <tr><td colSpan="5" className="muted">Chưa có dữ liệu.</td></tr>}
            {rep.list.map((r, i) => (
              <tr key={i}>
                <td><b>{r.ma_nv}</b> · {r.ho_ten}</td>
                <td>{r.so_ca}</td>
                <td>{r.so_tre ? <span className="warn-text">{r.so_tre}</span> : 0}</td>
                <td>{r.tong_hv}</td>
                <td>{vnd(r.tong_tien)}₫</td>
              </tr>
            ))}
          </tbody>
          {rep.list.length > 0 && (
            <tfoot><tr style={{ fontWeight: 700 }}>
              <td>Tổng</td><td>{t.so_ca}</td><td>{t.so_tre}</td><td>{t.tong_hv}</td><td>{vnd(t.tong_tien)}₫</td>
            </tr></tfoot>
          )}
        </table>
      </div>

      <p className="muted print-only" style={{ display: 'none', textAlign: 'center', marginTop: 20 }}>
        THE NEW GYM · Báo cáo vận hành · {tenClub} · {tu} → {den}
      </p>
    </div>
  );
}
