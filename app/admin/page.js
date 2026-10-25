import { supabaseAdmin } from '../../lib/supabase';
import { requireAdmin } from '../../lib/guard';
import { vnParts } from '../../lib/time';
import { buildReport } from '../../lib/report';
import ReportCharts from './ReportCharts';

export const dynamic = 'force-dynamic';
const vnd = (n) => (n || 0).toLocaleString('vi-VN');

export default async function Dashboard({ searchParams }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { dateStr } = vnParts();
  const tu = searchParams?.tu || (dateStr.slice(0, 7) + '-01');
  const den = searchParams?.den || dateStr;
  const club = searchParams?.club || '';

  const [{ data: clubs }, homNay, dangDay] = await Promise.all([
    sb.from('clubs').select('id, ten_club').order('ma_club'),
    sb.from('cham_cong').select('id', { count: 'exact', head: true }).eq('ngay', dateStr),
    sb.from('cham_cong').select('id', { count: 'exact', head: true }).eq('trang_thai', 'dang_lam').eq('ngay', dateStr),
  ]);
  const rep = await buildReport(sb, tu, den, club || null);
  const t = rep.totals;
  const dungGio = t.so_ca ? Math.round(((t.so_ca - t.so_tre) / t.so_ca) * 100) : 0;
  const tenClub = club ? (clubs || []).find((c) => c.id === club)?.ten_club : 'Tất cả club';
  const ccLink = (view) => `/admin/cham-cong?view=${view}&tu=${tu}&den=${den}`;

  const kpis = [
    { l: 'Tổng buổi dạy', v: vnd(t.so_ca) },
    { l: 'Tổng lượt học viên', v: vnd(t.tong_hv) },
    { l: 'Tỉ lệ đúng giờ', v: dungGio + '%' },
    { l: 'Chấm công hôm nay', v: vnd(homNay.count) },
    { l: 'Đang trong ca', v: vnd(dangDay.count) },
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Bảng điều khiển</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>{tenClub} · {tu} → {den}</p>
        </div>
        <form className="actions">
          <div><label>Từ ngày</label><input type="date" name="tu" defaultValue={tu} /></div>
          <div><label>Đến ngày</label><input type="date" name="den" defaultValue={den} /></div>
          <div><label>Club</label>
            <select name="club" defaultValue={club}>
              <option value="">Tất cả club</option>
              {(clubs || []).map((c) => <option key={c.id} value={c.id}>{c.ten_club}</option>)}
            </select>
          </div>
          <button className="btn primary">Xem</button>
          <a className="btn" href={`/api/admin/report-export?tu=${tu}&den=${den}`}>Xuất Excel</a>
        </form>
      </div>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div className="kpi" key={k.l}><div className="kpi-v">{k.v}</div><div className="kpi-l">{k.l}</div></div>
        ))}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Cần xử lý</h2>
        <div className="attn">
          <a className="red" href={ccLink('trong')}><span>Lớp trống (GV vắng)</span><b>{vnd(rep.missed)}</b></a>
          <a className="amber" href={ccLink('ithv')}><span>Buổi ≤ 5 học viên</span><b>{vnd(rep.hvList.length)}</b></a>
          <a className="blue" href={ccLink('tresom')}><span>Vào trễ / Ra sớm</span><b>{vnd(t.so_tre + t.so_som)}</b></a>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>Bấm vào từng mục để xem danh sách chi tiết trong Chấm công.</p>
      </div>

      <ReportCharts data={rep} />
    </div>
  );
}
