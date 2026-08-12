import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { themNV, xoaNV } from './actions';

export const dynamic = 'force-dynamic';

export default async function NhanVienPage({ searchParams }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const filterClub = searchParams?.club || '';
  const { data: clubs } = await sb.from('clubs').select('id, ma_club, ten_club').order('ma_club');
  let q = sb.from('nhan_vien').select('id, ma_nv, ho_ten, sdt, pin_hash, vai_tro, trang_thai, club_chinh_id, clubs!club_chinh_id ( ten_club )').order('ma_nv');
  if (filterClub) q = q.eq('club_chinh_id', filterClub);
  const { data: nv } = await q;

  return (
    <div className="stack">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><h1>Nhân viên ({nv?.length || 0})</h1><a className="btn" href={`/api/admin/export?type=nhan-vien&club=${filterClub}`}>Xuất Excel</a></div>

      <div className="card">
        <h2>Thêm nhân viên</h2>
        <form action={themNV} className="form-grid">
          <div><label>Mã NV</label><input name="ma_nv" required placeholder="VD: 65" /></div>
          <div><label>Họ và tên</label><input name="ho_ten" required /></div>
          <div><label>Club chính</label>
            <select name="club_chinh_id"><option value="">— chọn —</option>
              {(clubs || []).map((c) => <option key={c.id} value={c.id}>{c.ten_club}</option>)}
            </select>
          </div>
          <div><label>SĐT</label><input name="sdt" /></div>
          <div><label>Email</label><input name="email" /></div>
          <div><label>Vai trò</label>
            <select name="vai_tro"><option value="nhan_vien">Nhân viên</option><option value="quan_ly">Quản lý</option></select>
          </div>
          <div><label>PIN (tuỳ chọn)</label><input name="pin" placeholder="Để trống cho NV tự đặt" /></div>
          <div><label>Thù lao/ca (đ)</label><input name="thu_lao" placeholder="vd: 250000" /></div>
          <button className="btn primary">Thêm</button>
        </form>
      </div>

      <div className="card">
        <div className="toolbar">
          <form className="form-grid">
            <div>
              <label>Lọc theo club</label>
              <select name="club" defaultValue={filterClub}>
                <option value="">Tất cả club</option>
                {(clubs || []).map((c) => <option key={c.id} value={c.id}>{c.ten_club}</option>)}
              </select>
            </div>
            <button className="btn">Lọc</button>
          </form>
        </div>
        <table>
          <thead><tr><th>Mã</th><th>Họ tên</th><th>Club</th><th>SĐT</th><th>PIN</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {(nv || []).map((n) => (
              <tr key={n.id}>
                <td><b>{n.ma_nv}</b></td>
                <td>{n.ho_ten}</td>
                <td className="muted">{n.clubs?.ten_club || '—'}</td>
                <td className="muted">{n.sdt || '—'}</td>
                <td>{n.pin_hash ? <span className="tag green">Đã đặt</span> : <span className="tag warn">Chưa đặt</span>}</td>
                <td>{n.trang_thai === 'dang_lam' ? <span className="tag green">Đang làm</span> : <span className="tag gray">Đã nghỉ</span>}</td>
                <td>
                  <div className="row-actions">
                    <a className="btn" href={`/admin/nhan-vien/${n.id}`}>Sửa</a>
                    <form action={xoaNV}><input type="hidden" name="id" value={n.id} /><button className="btn danger">Xoá</button></form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
