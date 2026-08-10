import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/guard';
import { suaClub } from '../actions';

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
        <form action={suaClub} className="stack" style={{ maxWidth: 420 }}>
          <input type="hidden" name="id" value={c.id} />
          <div><label>Mã club</label><input name="ma_club" defaultValue={c.ma_club} required /></div>
          <div><label>Tên club</label><input name="ten_club" defaultValue={c.ten_club} required /></div>
          <div><label>Địa chỉ</label><input name="dia_chi" defaultValue={c.dia_chi || ''} /></div>
          <div className="row-actions">
            <a className="btn" href="/admin/clubs">Huỷ</a>
            <button className="btn primary">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  );
}
