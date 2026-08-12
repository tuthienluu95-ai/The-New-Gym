import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { themClub, xoaClub } from './actions';

export const dynamic = 'force-dynamic';

export default async function ClubsPage() {
  requireAdmin();
  const sb = supabaseAdmin();
  const { data: clubs } = await sb.from('clubs').select('id, ma_club, ten_club, dia_chi, lat, lng, qr_token').order('ma_club');
  return (
    <div className="stack">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><h1>Club ({clubs?.length || 0})</h1><a className="btn" href="/api/admin/export?type=clubs">Xuất Excel</a></div>

      <div className="card">
        <h2>Thêm club</h2>
        <form action={themClub} className="form-grid">
          <div><label>Mã club</label><input name="ma_club" required placeholder="VD: HVT" /></div>
          <div><label>Tên club</label><input name="ten_club" required placeholder="Club Hoàng Văn Thụ" /></div>
          <div><label>Địa chỉ (tuỳ chọn)</label><input name="dia_chi" /></div>
          <button className="btn primary">Thêm</button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Mã</th><th>Tên club</th><th>GPS</th><th></th></tr></thead>
          <tbody>
            {(clubs || []).map((c) => (
              <tr key={c.id}>
                <td><b>{c.ma_club}</b></td>
                <td>{c.ten_club}</td>
                <td>{c.lat != null && c.lng != null ? <span className="tag green">Đã đặt</span> : <span className="tag warn">Chưa đặt</span>}</td>
                <td>
                  <div className="row-actions">
                    <a className="btn" href={`/admin/clubs/${c.id}/qr`}>Mã QR</a>
                    <a className="btn" href={`/admin/clubs/${c.id}`}>Sửa</a>
                    <form action={xoaClub}><input type="hidden" name="id" value={c.id} /><button className="btn danger">Xoá</button></form>
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
