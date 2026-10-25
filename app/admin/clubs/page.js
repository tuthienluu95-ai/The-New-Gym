import { matchQ } from '../../../lib/search';
import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { themClub, xoaClub } from './actions';
import Drawer from '../_shell/Drawer';

export const dynamic = 'force-dynamic';

export default async function ClubsPage({ searchParams }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { data: clubs } = await sb.from('clubs').select('id, ma_club, ten_club, dia_chi, lat, lng, qr_token').order('ma_club');
  const timkiem = searchParams?.q || '';
  const clubsF = (clubs || []).filter((c) => matchQ(`${c.ma_club} ${c.ten_club} ${c.dia_chi || ''}`, timkiem));
  return (
    <div className="stack">
      <div className="page-head">
        <h1>Club ({clubsF.length})</h1>
        <div className="actions">
          <a className="btn" href={`/api/admin/export?type=clubs&q=${encodeURIComponent(timkiem)}`}>Xuất Excel</a>
          <Drawer label="+ Thêm club" title="Thêm club">
            <form action={themClub} className="form-grid">
              <div><label>Mã club</label><input name="ma_club" required placeholder="VD: HVT" /></div>
              <div><label>Tên club</label><input name="ten_club" required placeholder="Club Hoàng Văn Thụ" /></div>
              <div><label>Địa chỉ (tuỳ chọn)</label><input name="dia_chi" /></div>
              <button className="btn primary">Thêm</button>
            </form>
          </Drawer>
        </div>
      </div>

      <form className="filters">
        <div><label>Tìm kiếm</label><input name="q" defaultValue={timkiem} autoComplete="off" placeholder="Mã, tên club, địa chỉ..." /></div>
        <button className="btn">Tìm</button>
      </form>

      <div className="club-cards">
        {clubsF.length === 0 && <p className="muted">Không có club phù hợp.</p>}
        {clubsF.map((c) => (
          <article className="club-card" key={c.id}>
            <div>
              <h3>{c.ten_club}</h3>
              <div className="muted" style={{ fontSize: 13 }}>{c.ma_club}{c.dia_chi ? ` · ${c.dia_chi}` : ''}</div>
            </div>
            <div>GPS: {c.lat != null && c.lng != null ? <span className="tag green">Đã đặt</span> : <span className="tag warn">Chưa đặt</span>}</div>
            <div className="row-actions">
              <a className="btn" href={`/admin/clubs/${c.id}/qr`}>Mã QR</a>
              <a className="btn" href={`/admin/clubs/${c.id}`}>Sửa</a>
              <form action={xoaClub}><input type="hidden" name="id" value={c.id} /><button className="btn danger">Xoá</button></form>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
