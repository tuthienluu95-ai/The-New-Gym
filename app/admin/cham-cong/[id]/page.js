import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/guard';
import { fmtTime } from '../../../../lib/time';
import { suaChamCong } from '../actions';

export const dynamic = 'force-dynamic';

export default async function EditChamCong({ params }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { data: r } = await sb.from('cham_cong')
    .select('id, ngay, gio_vao, gio_ra, trang_thai, ghi_chu, so_hoc_vien, nhan_vien!nv_id ( ma_nv, ho_ten ), clubs!club_id ( ten_club ), lich_lop!lich_lop_id ( ten_lop )')
    .eq('id', params.id).maybeSingle();
  if (!r) return <div className="card">Không tìm thấy lượt chấm công.</div>;
  return (
    <div className="stack">
      <h1>Sửa chấm công</h1>
      <div className="card">
        <p className="muted">
          {r.nhan_vien?.ma_nv} · {r.nhan_vien?.ho_ten} — {r.clubs?.ten_club} — {r.lich_lop?.ten_lop || 'Lớp khác'} — Ngày {r.ngay}
        </p>
        <form action={suaChamCong} className="stack" style={{ maxWidth: 420 }}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="ngay" value={r.ngay} />
          <div className="form-grid">
            <div><label>Giờ vào</label><input type="time" name="gio_vao" defaultValue={fmtTime(r.gio_vao)} required /></div>
            <div><label>Giờ ra</label><input type="time" name="gio_ra" defaultValue={r.gio_ra ? fmtTime(r.gio_ra) : ''} /></div>
          </div>
          <div><label>Trạng thái</label>
            <select name="trang_thai" defaultValue={r.trang_thai}>
              <option value="hoan_thanh">Hoàn thành</option>
              <option value="dang_lam">Đang trong ca</option>
              <option value="quen_ra">Quên chấm ra</option>
            </select>
          </div>
          <div><label>Số học viên</label><input type="number" min="0" name="so_hoc_vien" defaultValue={typeof r.so_hoc_vien === 'number' ? r.so_hoc_vien : ''} placeholder="0 = 50% thù lao" /></div>
          <div><label>Ghi chú</label><input name="ghi_chu" defaultValue={r.ghi_chu || ''} placeholder="VD: mất điện, chấm bù" /></div>
          <div className="row-actions">
            <a className="btn" href="/admin/cham-cong">Huỷ</a>
            <button className="btn primary">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  );
}
