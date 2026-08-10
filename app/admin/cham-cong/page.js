import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { vnParts, fmtTime } from '../../../lib/time';

export const dynamic = 'force-dynamic';

export default async function ChamCongPage({ searchParams }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { dateStr } = vnParts();
  const ngay = searchParams?.ngay || dateStr;

  const { data: rows } = await sb.from('cham_cong')
    .select('id, ngay, gio_vao, gio_ra, trang_thai, nhan_vien!nv_id ( ma_nv, ho_ten ), clubs!club_id ( ten_club ), lich_lop!lich_lop_id ( ten_lop )')
    .eq('ngay', ngay)
    .order('gio_vao', { ascending: true });

  const today = dateStr;
  return (
    <div className="stack">
      <h1>Chấm công</h1>
      <div className="card">
        <div className="toolbar">
          <form>
            <label>Chọn ngày</label>
            <input type="date" name="ngay" defaultValue={ngay} onChange={(e) => e.target.form.submit()} />
          </form>
        </div>
        <table>
          <thead><tr><th>Mã</th><th>Nhân viên</th><th>Club</th><th>Lớp</th><th>Vào</th><th>Ra</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {(rows || []).length === 0 && <tr><td colSpan="7" className="muted">Không có lượt chấm công nào trong ngày này.</td></tr>}
            {(rows || []).map((r) => {
              const quenRa = !r.gio_ra && r.ngay < today;
              return (
                <tr key={r.id}>
                  <td><b>{r.nhan_vien?.ma_nv}</b></td>
                  <td>{r.nhan_vien?.ho_ten}</td>
                  <td className="muted">{r.clubs?.ten_club}</td>
                  <td>{r.lich_lop?.ten_lop || <span className="muted">Lớp khác</span>}</td>
                  <td>{fmtTime(r.gio_vao)}</td>
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
