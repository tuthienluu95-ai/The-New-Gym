import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { vnParts, fmtTime } from '../../../lib/time';

export const dynamic = 'force-dynamic';

function thuFromDate(s) {
  const w = new Date(s + 'T12:00:00Z').getUTCDay(); // 0=CN..6=T7
  return w === 0 ? 8 : w + 1;
}
const THU_LABEL = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ nhật' };

function badge(tt) {
  if (tt === 'hoan_thanh') return <span className="tag green">Đã hoàn thành</span>;
  if (tt === 'dang_lam') return <span className="tag" style={{ background: 'var(--accent-weak)', color: 'var(--accent-dark)' }}>Đang dạy</span>;
  if (tt === 'quen_ra') return <span className="tag warn">Quên chấm ra</span>;
  return <span className="tag gray">Chưa dạy</span>;
}

export default async function LichNgayPage({ searchParams }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { dateStr } = vnParts();
  const ngay = searchParams?.ngay || dateStr;
  const club = searchParams?.club || '';
  const an = searchParams?.an === '1';
  const thu = thuFromDate(ngay);

  const { data: clubs } = await sb.from('clubs').select('id, ten_club').order('ma_club');
  let q = sb.from('lich_lop')
    .select('id, gio_bat_dau, gio_ket_thuc, ten_lop, clubs:club_id ( ten_club ), nhan_vien:nv_id ( ma_nv, ho_ten )')
    .eq('thu', thu).eq('dang_ap_dung', true).order('gio_bat_dau');
  if (club) q = q.eq('club_id', club);
  const { data: lich } = await q;

  const { data: cc } = await sb.from('cham_cong')
    .select('lich_lop_id, trang_thai, gio_vao, gio_ra').eq('ngay', ngay);
  const map = new Map();
  for (const r of (cc || [])) if (r.lich_lop_id) map.set(r.lich_lop_id, r);

  let rows = (lich || []).map((l) => {
    const a = map.get(l.id);
    return { ...l, tt: a ? a.trang_thai : 'chua', gio_vao: a?.gio_vao, gio_ra: a?.gio_ra };
  });
  if (an) rows = rows.filter((r) => r.tt !== 'hoan_thanh');

  const done = (lich || []).filter((l) => map.get(l.id)?.trang_thai === 'hoan_thanh').length;

  return (
    <div className="stack">
      <h1>Lịch theo ngày</h1>
      <div className="card">
        <div className="toolbar">
          <form className="form-grid">
            <div><label>Ngày</label><input type="date" name="ngay" defaultValue={ngay} /></div>
            <div><label>Club</label>
              <select name="club" defaultValue={club}>
                <option value="">Tất cả club</option>
                {(clubs || []).map((c) => <option key={c.id} value={c.id}>{c.ten_club}</option>)}
              </select>
            </div>
            <div>
              <label>Hiển thị</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, color: 'var(--ink)' }}>
                <input type="checkbox" name="an" value="1" defaultChecked={an} style={{ width: 18, height: 18 }} />
                Ẩn lớp đã hoàn thành
              </label>
            </div>
            <button className="btn primary">Xem</button>
          </form>
        </div>
        <p className="muted">{THU_LABEL[thu]} · {ngay} · {rows.length} lớp hiển thị{done ? ` · ${done} lớp đã hoàn thành` : ''}</p>
        <table>
          <thead><tr><th>Club</th><th>Giờ</th><th>Lớp</th><th>HLV</th><th>Vào</th><th>Ra</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="7" className="muted">Không có lớp phù hợp.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.clubs?.ten_club}</td>
                <td>{(r.gio_bat_dau || '').slice(0, 5)}–{(r.gio_ket_thuc || '').slice(0, 5)}</td>
                <td><b>{r.ten_lop}</b></td>
                <td className="muted">{r.nhan_vien ? `${r.nhan_vien.ma_nv} · ${r.nhan_vien.ho_ten}` : '—'}</td>
                <td>{r.gio_vao ? fmtTime(r.gio_vao) : '—'}</td>
                <td>{r.gio_ra ? fmtTime(r.gio_ra) : '—'}</td>
                <td>{badge(r.tt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
