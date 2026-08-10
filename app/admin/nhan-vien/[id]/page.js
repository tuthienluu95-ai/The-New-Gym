import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/guard';
import { suaNV, datPin } from '../actions';

export const dynamic = 'force-dynamic';

export default async function EditNV({ params }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const [{ data: n }, { data: clubs }] = await Promise.all([
    sb.from('nhan_vien').select('*').eq('id', params.id).maybeSingle(),
    sb.from('clubs').select('id, ten_club').order('ma_club'),
  ]);
  if (!n) return <div className="card">Không tìm thấy nhân viên.</div>;
  return (
    <div className="stack">
      <h1>Sửa nhân viên · {n.ma_nv}</h1>
      <div className="card">
        <form action={suaNV} className="stack" style={{ maxWidth: 460 }}>
          <input type="hidden" name="id" value={n.id} />
          <div><label>Mã NV</label><input name="ma_nv" defaultValue={n.ma_nv} required /></div>
          <div><label>Họ và tên</label><input name="ho_ten" defaultValue={n.ho_ten} required /></div>
          <div><label>Club chính</label>
            <select name="club_chinh_id" defaultValue={n.club_chinh_id || ''}>
              <option value="">— chọn —</option>
              {(clubs || []).map((c) => <option key={c.id} value={c.id}>{c.ten_club}</option>)}
            </select>
          </div>
          <div><label>SĐT</label><input name="sdt" defaultValue={n.sdt || ''} /></div>
          <div><label>Email</label><input name="email" defaultValue={n.email || ''} /></div>
          <div><label>Vai trò</label>
            <select name="vai_tro" defaultValue={n.vai_tro}><option value="nhan_vien">Nhân viên</option><option value="quan_ly">Quản lý</option></select>
          </div>
          <div><label>Trạng thái</label>
            <select name="trang_thai" defaultValue={n.trang_thai}><option value="dang_lam">Đang làm</option><option value="da_nghi">Đã nghỉ</option></select>
          </div>
          <div className="row-actions">
            <a className="btn" href="/admin/nhan-vien">Huỷ</a>
            <button className="btn primary">Lưu</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Đặt lại mã PIN</h2>
        <form action={datPin} className="form-grid">
          <input type="hidden" name="id" value={n.id} />
          <div><label>PIN mới</label><input name="pin" placeholder="Để trống = xoá PIN (NV tự đặt lại)" /></div>
          <button className="btn">Lưu PIN</button>
        </form>
        <p className="muted">Hiện tại: {n.pin_hash ? 'đã có PIN' : 'chưa có PIN'}.</p>
      </div>
    </div>
  );
}
