import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/guard';
import { suaClub } from '../actions';
import LocationButton from './LocationButton';

export const dynamic = 'force-dynamic';

export default async function EditClub({ params }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { data: c } = await sb.from('clubs').select('*').eq('id', params.id).maybeSingle();
  if (!c) return <div className="card">Không tìm thấy club.</div>;
  return (
    <div className="stack">
      <h1>Sửa club</h1>
      <div className="card">
        <form name="clubForm" action={suaClub} className="stack" style={{ maxWidth: 460 }}>
          <input type="hidden" name="id" value={c.id} />
          <div><label>Mã club</label><input name="ma_club" defaultValue={c.ma_club} required /></div>
          <div><label>Tên club</label><input name="ten_club" defaultValue={c.ten_club} required /></div>
          <div><label>Địa chỉ</label><input name="dia_chi" defaultValue={c.dia_chi || ''} /></div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <label>Vị trí club (để kiểm tra GPS khi chấm công)</label>
            <div className="form-grid">
              <div><label>Vĩ độ (lat)</label><input name="lat" defaultValue={c.lat ?? ''} placeholder="vd: 10.762622" /></div>
              <div><label>Kinh độ (lng)</label><input name="lng" defaultValue={c.lng ?? ''} placeholder="vd: 106.660172" /></div>
              <div><label>Bán kính (m)</label><input name="ban_kinh_m" defaultValue={c.ban_kinh_m ?? 200} /></div>
            </div>
            <p className="muted" style={{ marginTop: 8 }}>
              Đứng tại club, bấm nút dưới để tự điền toạ độ. Để trống toạ độ = tắt kiểm tra GPS cho club này.
            </p>
            <LocationButton />
          </div>

          <div className="row-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <a className="btn" href="/admin/clubs">Huỷ</a>
            <button className="btn primary">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  );
}
