import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/guard';
import { thuLabel } from '../../../../lib/time';
import { suaLich } from '../actions';

export const dynamic = 'force-dynamic';
const THU = [2, 3, 4, 5, 6, 7, 8];

export default async function EditLich({ params }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const [{ data: l }, { data: clubs }, { data: nvList }] = await Promise.all([
    sb.from('lich_lop').select('*').eq('id', params.id).maybeSingle(),
    sb.from('clubs').select('id, ten_club').order('ma_club'),
    sb.from('nhan_vien').select('id, ma_nv, ho_ten').order('ma_nv'),
  ]);
  if (!l) return <div className="card">Không tìm thấy buổi lớp.</div>;
  return (
    <div className="stack">
      <h1>Sửa buổi lớp</h1>
      <div className="card">
        <form action={suaLich} className="stack" style={{ maxWidth: 460 }}>
          <input type="hidden" name="id" value={l.id} />
          <div><label>Club</label>
            <select name="club_id" defaultValue={l.club_id}>
              {(clubs || []).map((c) => <option key={c.id} value={c.id}>{c.ten_club}</option>)}
            </select>
          </div>
          <div><label>Thứ</label>
            <select name="thu" defaultValue={l.thu}>{THU.map((t) => <option key={t} value={t}>{thuLabel(t)}</option>)}</select>
          </div>
          <div><label>Giờ bắt đầu</label><input type="text" inputMode="numeric" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="HH:MM" maxLength="5" name="gio_bat_dau" defaultValue={(l.gio_bat_dau || '').slice(0, 5)} required /></div>
          <div><label>Giờ kết thúc</label><input type="text" inputMode="numeric" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="HH:MM" maxLength="5" name="gio_ket_thuc" defaultValue={(l.gio_ket_thuc || '').slice(0, 5)} required /></div>
          <div><label>Lớp</label><input name="ten_lop" defaultValue={l.ten_lop} required /></div>
          <div><label>HLV phụ trách</label>
            <select name="nv_id" defaultValue={l.nv_id || ''}>
              <option value="">— chọn —</option>
              {(nvList || []).map((n) => <option key={n.id} value={n.id}>{n.ma_nv} · {n.ho_ten}</option>)}
            </select>
          </div>
          <div className="row-actions">
            <a className="btn" href="/admin/lich">Huỷ</a>
            <button className="btn primary">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  );
}
