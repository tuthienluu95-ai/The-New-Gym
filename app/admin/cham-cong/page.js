import { matchQ } from '../../../lib/search';
import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { vnParts, fmtTime, vnMinutesOf, hmToMin } from '../../../lib/time';

export const dynamic = 'force-dynamic';

export default async function ChamCongPage({ searchParams }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { dateStr } = vnParts();
  const ngay = searchParams?.ngay || dateStr;
  const timkiem = searchParams?.q || '';

  const { data: rows } = await sb.from('cham_cong')
    .select('id, ngay, gio_vao, gio_ra, trang_thai, ghi_chu, nhan_vien!nv_id ( ma_nv, ho_ten ), clubs!club_id ( ten_club ), lich_lop!lich_lop_id ( ten_lop, gio_bat_dau )')
    .eq('ngay', ngay)
    .order('gio_vao', { ascending: true });
  const rowsF = (rows || []).filter((r) => matchQ(`${r.nhan_vien?.ma_nv || ''} ${r.nhan_vien?.ho_ten || ''} ${r.clubs?.ten_club || ''} ${r.lich_lop?.ten_lop || ''} ${r.ghi_chu || ''}`, timkiem));

  const today = dateStr;
  return (
    <div className="stack">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><h1>Chấm công</h1><a className="btn" href={`/api/admin/export?type=cham-cong&ngay=${ngay}&q=${encodeURIComponent(timkiem)}`}>Xuất Excel</a></div>
      <div className="card">
        <div className="toolbar">
          <form className="form-grid">
            <div><label>Tìm kiếm</label><input name="q" defaultValue={timkiem} placeholder="Tên, mã, club, lớp..." /></div>
            <div>
              <label>Chọn ngày</label>
              <input type="date" name="ngay" defaultValue={ngay} />
            </div>
            <button className="btn">Xem</button>
          </form>
        </div>
        <table>
          <thead><tr><th>Mã</th><th>Nhân viên</th><th>Club</th><th>Lớp</th><th>Vào</th><th>Ra</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {rowsF.length === 0 && <tr><td colSpan="7" className="muted">Không có lượt chấm công nào trong ngày này.</td></tr>}
            {rowsF.map((r) => {
              const quenRa = r.trang_thai === 'quen_ra' || (!r.gio_ra && r.ngay < today);
              const lateMin = (r.lich_lop?.gio_bat_dau && r.gio_vao) ? (vnMinutesOf(r.gio_vao) - hmToMin(r.lich_lop.gio_bat_dau)) : 0;
              return (
                <tr key={r.id}>
                  <td><b>{r.nhan_vien?.ma_nv}</b></td>
                  <td>{r.nhan_vien?.ho_ten}</td>
                  <td className="muted">{r.clubs?.ten_club}</td>
                  <td>{r.lich_lop?.ten_lop || <span className="muted">Lớp khác</span>}{r.ghi_chu ? <span className="muted"> · {r.ghi_chu}</span> : null}</td>
                  <td>{fmtTime(r.gio_vao)}{lateMin > 0 ? <span className="warn-text"> · trễ {lateMin}p</span> : null}</td>
                  <td>{r.gio_ra ? fmtTime(r.gio_ra) : '—'}</td>
                  <td>
                    {quenRa ? <span className="tag warn">Quên chấm ra</span>
                      : r.trang_thai === 'hoan_thanh' ? <span className="tag green">Hoàn thành</span>
                      : <span className="tag gray">Đang trong ca</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
