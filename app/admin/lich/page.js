import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { thuLabel } from '../../../lib/time';
import { themLich, xoaLich } from './actions';

export const dynamic = 'force-dynamic';
const THU = [2, 3, 4, 5, 6, 7, 8];

export default async function LichPage({ searchParams }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const filterClub = searchParams?.club || '';
  const [{ data: clubs }, { data: nvList }] = await Promise.all([
    sb.from('clubs').select('id, ma_club, ten_club').order('ma_club'),
    sb.from('nhan_vien').select('id, ma_nv, ho_ten').eq('trang_thai', 'dang_lam').order('ma_nv'),
  ]);
  let q = sb.from('lich_lop')
    .select('id, thu, gio_bat_dau, gio_ket_thuc, ten_lop, clubs:club_id ( ten_club ), nhan_vien:nv_id ( ho_ten, ma_nv )')
    .order('thu').order('gio_bat_dau');
  if (filterClub) q = q.eq('club_id', filterClub);
  const { data: lich } = await q;

  return (
    <div className="stack">
      <h1>Lịch lớp ({lich?.length || 0})</h1>

      <div className="card">
        <h2>Thêm buổi lớp</h2>
        <form action={themLich} className="form-grid">
          <div><label>Club</label>
            <select name="club_id" required><option value="">— chọn —</option>
              {(clubs || []).map((c) => <option key={c.id} value={c.id}>{c.ten_club}</option>)}
            </select>
          </div>
          <div><label>Thứ</label>
            <select name="thu" required>{THU.map((t) => <option key={t} value={t}>{thuLabel(t)}</option>)}</select>
          </div>
          <div><label>Giờ bắt đầu</label><input type="time" name="gio_bat_dau" required /></div>
          <div><label>Giờ kết thúc</label><input type="time" name="gio_ket_thuc" required /></div>
          <div><label>Lớp</label><input name="ten_lop" required placeholder="VD: Vinyasa Yoga" /></div>
          <div><label>HLV phụ trách</label>
            <select name="nv_id"><option value="">— chọn —</option>
              {(nvList || []).map((n) => <option key={n.id} value={n.id}>{n.ma_nv} · {n.ho_ten}</option>)}
            </select>
          </div>
          <button className="btn primary">Thêm</button>
        </form>
      </div>

      <div className="card">
        <div className="toolbar">
          <form>
            <label>Lọc theo club</label>
            <select name="club" defaultValue={filterClub} onChange={(e) => e.target.form.submit()}>
              <option value="">Tất cả club</option>
              {(clubs || []).map((c) => <option key={c.id} value={c.id}>{c.ten_club}</option>)}
            </select>
          </form>
        </div>
        <table>
          <thead><tr><th>Club</th><th>Thứ</th><th>Giờ</th><th>Lớp</th><th>HLV</th><th></th></tr></thead>
          <tbody>
            {(lich || []).map((l) => (
              <tr key={l.id}>
                <td className="muted">{l.clubs?.ten_club || '—'}</td>
                <td>{thuLabel(l.thu)}</td>
                <td>{(l.gio_bat_dau || '').slice(0, 5)}–{(l.gio_ket_thuc || '').slice(0, 5)}</td>
                <td><b>{l.ten_lop}</b></td>
                <td className="muted">{l.nhan_vien ? `${l.nhan_vien.ma_nv} · ${l.nhan_vien.ho_ten}` : '—'}</td>
                <td>
                  <div className="row-actions">
                    <a className="btn" href={`/admin/lich/${l.id}`}>Sửa</a>
                    <form action={xoaLich}><input type="hidden" name="id" value={l.id} /><button className="btn danger">Xoá</button></form>
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
