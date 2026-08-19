import { supabaseAdmin } from '../../lib/supabase';
import { requireAdmin } from '../../lib/guard';
import { vnParts } from '../../lib/time';
import { buildReport } from '../../lib/report';
import ReportChart from './ReportChart';

export const dynamic = 'force-dynamic';
const vnd = (n) => (Number(n) || 0).toLocaleString('vi-VN') + ' đ';

export default async function Dashboard({ searchParams }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { dateStr } = vnParts();
  const tu = searchParams?.tu || (dateStr.slice(0, 7) + '-01');
  const den = searchParams?.den || dateStr;

  const [clubs, nv, lich, homNay, dangDay] = await Promise.all([
    sb.from('clubs').select('id', { count: 'exact', head: true }),
    sb.from('nhan_vien').select('id', { count: 'exact', head: true }).eq('trang_thai', 'dang_lam'),
    sb.from('lich_lop').select('id', { count: 'exact', head: true }).eq('dang_ap_dung', true),
    sb.from('cham_cong').select('id', { count: 'exact', head: true }).eq('ngay', dateStr),
    sb.from('cham_cong').select('id', { count: 'exact', head: true }).eq('trang_thai', 'dang_lam').eq('ngay', dateStr),
  ]);

  const report = await buildReport(sb, tu, den);
  const topPay = report.list.slice(0, 10).map((r) => ({ ten: r.ho_ten, tien: r.tong_tien })).reverse();

  const M = [
    { n: nv.count ?? 0, l: 'Giáo viên đang làm' },
    { n: clubs.count ?? 0, l: 'Club' },
    { n: lich.count ?? 0, l: 'Buổi lớp/tuần' },
    { n: homNay.count ?? 0, l: 'Chấm công hôm nay' },
    { n: dangDay.count ?? 0, l: 'Đang trong ca' },
  ];

  return (
    <div className="stack">
      <h1>Bảng điều khiển</h1>
      <div className="grid">
        {M.map((m) => (<div className="metric" key={m.l}><div className="n">{m.n}</div><div className="l">{m.l}</div></div>))}
      </div>

      <div className="card">
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <form className="form-grid">
            <div><label>Từ ngày</label><input type="date" name="tu" defaultValue={tu} /></div>
            <div><label>Đến ngày</label><input type="date" name="den" defaultValue={den} /></div>
            <button className="btn">Xem báo cáo</button>
          </form>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <a className="btn primary" href={`/api/admin/report-export?tu=${tu}&den=${den}`}>Xuất Excel</a>
          </div>
        </div>
        <div className="grid">
          <div className="metric"><div className="n">{report.totals.so_gv}</div><div className="l">Giáo viên có công</div></div>
          <div className="metric"><div className="n">{report.totals.so_ca}</div><div className="l">Tổng số ca</div></div>
          <div className="metric"><div className="n" style={{ color: '#B7791F' }}>{report.totals.so_tre}</div><div className="l">Ca chấm công trễ</div></div>
          <div className="metric"><div className="n" style={{ color: '#B7791F' }}>{report.totals.so_som}</div><div className="l">Ca ra sớm</div></div>
          <div className="metric"><div className="n">{report.totals.tong_hv}</div><div className="l">Tổng lượt học viên</div></div>
          <div className="metric"><div className="n">{vnd(report.totals.tong_tien)}</div><div className="l">Tổng tiền thù lao</div></div>
          <div className="metric"><div className="n" style={{ color: 'var(--warn)' }}>{report.missed}</div><div className="l">Lớp trống (GV không đến)</div></div>
        </div>
      </div>

      <ReportChart daily={report.daily} topPay={topPay} />

      <div className="card">
        <h2>Bảng công theo giáo viên · {tu} → {den}</h2>
        <table>
          <thead><tr><th>Mã</th><th>Giáo viên</th><th>Số ca</th><th>Trễ</th><th>Thù lao/ca</th><th>Tổng tiền</th></tr></thead>
          <tbody>
            {report.list.length === 0 && <tr><td colSpan="6" className="muted">Chưa có dữ liệu chấm công trong khoảng ngày này.</td></tr>}
            {report.list.map((r) => (
              <tr key={r.ma_nv}>
                <td><b>{r.ma_nv}</b></td>
                <td>{r.ho_ten}</td>
                <td>{r.so_ca}</td>
                <td>{r.so_tre > 0 ? <span className="tag warn">{r.so_tre}</span> : <span className="muted">0</span>}</td>
                <td className="muted">{vnd(r.thu_lao)}</td>
                <td><b>{vnd(r.tong_tien)}</b></td>
              </tr>
            ))}
            {report.list.length > 0 && (
              <tr><td colSpan="2"><b>TỔNG</b></td><td><b>{report.totals.so_ca}</b></td><td><b>{report.totals.so_tre}</b></td><td></td><td><b>{vnd(report.totals.tong_tien)}</b></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {report.list.some((r) => r.ngay_som.length > 0) && (
        <div className="card">
          <h2>Chi tiết ra ca sớm</h2>
          <table>
            <thead><tr><th>Giáo viên</th><th>Số ca ra sớm</th><th>Các ngày</th></tr></thead>
            <tbody>
              {report.list.filter((r) => r.ngay_som.length > 0).map((r) => (
                <tr key={r.ma_nv}><td>{r.ma_nv} · {r.ho_ten}</td><td><span className="tag warn">{r.so_som}</span></td><td className="muted">{r.ngay_som.join(', ')}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {report.manualList.length > 0 && (
        <div className="card">
          <h2>Chấm công thủ công (admin nhập/sửa) — {report.manualList.length}</h2>
          <table>
            <thead><tr><th>Ngày</th><th>Club</th><th>Lớp</th><th>HLV</th><th>Vào</th><th>Ra</th><th>HV</th><th>Ghi chú</th></tr></thead>
            <tbody>
              {report.manualList.map((m, i) => (
                <tr key={i}><td>{m.ngay}</td><td className="muted">{m.club}</td><td>{m.lop}</td><td className="muted">{m.hlv}</td><td>{m.vao}</td><td>{m.ra || '—'}</td><td>{m.hv}</td><td className="muted">{m.ghi_chu}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {report.hvList.length > 0 && (
        <div className="card">
          <h2>Lớp ít học viên (≤ 5 HV, thấp → cao)</h2>
          <p className="muted" style={{ marginTop: 0 }}>Buổi 0 học viên được tính 50% thù lao; có học viên tính 100%.</p>
          <table>
            <thead><tr><th>Số HV</th><th>Ngày</th><th>Khung giờ</th><th>Club</th><th>Lớp</th><th>HLV</th></tr></thead>
            <tbody>
              {report.hvList.map((h, i) => (
                <tr key={i}><td><b>{h.so_hoc_vien}</b>{h.so_hoc_vien === 0 ? <span className="warn-text"> (50%)</span> : null}</td><td>{h.ngay}</td><td>{h.gio}</td><td className="muted">{h.club}</td><td>{h.lop}</td><td className="muted">{h.hlv}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {report.missed > 0 && (
        <div className="card">
          <h2>Lớp trống — giáo viên không đến ({report.missed})</h2>
          <table>
            <thead><tr><th>Ngày</th><th>Club</th><th>Giờ</th><th>Lớp</th><th>HLV phụ trách</th></tr></thead>
            <tbody>
              {report.missedList.map((m, i) => (
                <tr key={i}><td>{m.ngay}</td><td className="muted">{m.club}</td><td>{m.gio}</td><td><b>{m.lop}</b></td><td className="muted">{m.hlv}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {report.list.some((r) => r.ngay_tre.length > 0) && (
        <div className="card">
          <h2>Chi tiết chấm công trễ</h2>
          <table>
            <thead><tr><th>Giáo viên</th><th>Số ca trễ</th><th>Các ngày trễ</th></tr></thead>
            <tbody>
              {report.list.filter((r) => r.ngay_tre.length > 0).map((r) => (
                <tr key={r.ma_nv}><td>{r.ma_nv} · {r.ho_ten}</td><td><span className="tag warn">{r.so_tre}</span></td><td className="muted">{r.ngay_tre.join(', ')}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
