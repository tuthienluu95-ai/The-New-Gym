import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { vnParts, fmtTime } from '../../../lib/time';

export const dynamic = 'force-dynamic';

const DAYS = [2, 3, 4, 5, 6, 7, 8];
const DLABEL = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ nhật' };
const hhmm = (t) => (t || '').slice(0, 5);

function thuFromDate(s) { const w = new Date(s + 'T12:00:00Z').getUTCDay(); return w === 0 ? 8 : w + 1; }
function lopColor(name) {
  const s = (name || '').toLowerCase();
  if (s.includes('yoga')) return '#4C8C2B';
  if (s.includes('zumba') || s.includes('dance') || s.includes('tiktok')) return 'var(--accent)';
  if (s.includes('combat') || s.includes('pump')) return 'var(--orange)';
  return 'var(--accent-dark)';
}
function badge(tt) {
  if (tt === 'hoan_thanh') return <span className="tag green">Đã hoàn thành</span>;
  if (tt === 'dang_lam') return <span className="tag" style={{ background: 'var(--accent-weak)', color: 'var(--accent-dark)' }}>Đang dạy</span>;
  if (tt === 'quen_ra') return <span className="tag warn">Quên chấm ra</span>;
  return <span className="tag gray">Chưa dạy</span>;
}

export default async function TkbPage({ searchParams }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { dateStr } = vnParts();
  const che_do = searchParams?.che_do === 'ngay' ? 'ngay' : 'tuan';
  const ngay = searchParams?.ngay || dateStr;
  const fClub = searchParams?.club || '';
  const fLop = searchParams?.lop || '';
  const fHlv = searchParams?.hlv || '';
  const an = searchParams?.an === '1';

  const [{ data: clubs }, { data: nvList }, { data: allLop }] = await Promise.all([
    sb.from('clubs').select('id, ten_club').order('ma_club'),
    sb.from('nhan_vien').select('id, ma_nv, ho_ten').eq('trang_thai', 'dang_lam').order('ma_nv'),
    sb.from('lich_lop').select('ten_lop'),
  ]);
  const lopList = Array.from(new Set((allLop || []).map((x) => x.ten_lop).filter(Boolean))).sort();

  const filterBar = (
    <form className="filters">
      <div><label>Chế độ xem</label>
        <select name="che_do" defaultValue={che_do}><option value="tuan">Theo tuần (lưới)</option><option value="ngay">Theo ngày</option></select>
      </div>
      <div><label>Ngày (khi xem theo ngày)</label><input type="date" name="ngay" defaultValue={ngay} /></div>
      <div><label>Club</label>
        <select name="club" defaultValue={fClub}><option value="">Tất cả club</option>
          {(clubs || []).map((c) => <option key={c.id} value={c.id}>{c.ten_club}</option>)}
        </select>
      </div>
      <div><label>Lớp</label>
        <select name="lop" defaultValue={fLop}><option value="">Tất cả lớp</option>
          {lopList.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div><label>Giáo viên</label>
        <select name="hlv" defaultValue={fHlv}><option value="">Tất cả giáo viên</option>
          {(nvList || []).map((n) => <option key={n.id} value={n.id}>{n.ma_nv} · {n.ho_ten}</option>)}
        </select>
      </div>
      {che_do === 'ngay' && (
        <div><label>Hiển thị</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42 }}>
            <input type="checkbox" name="an" value="1" defaultChecked={an} style={{ width: 18, height: 18 }} /> Ẩn lớp đã hoàn thành
          </label>
        </div>
      )}
      <button className="btn primary">Xem</button>
    </form>
  );

  // ===== Chế độ TUẦN: lưới giống thời khoá biểu =====
  if (che_do === 'tuan') {
    let q = sb.from('lich_lop')
      .select('id, thu, gio_bat_dau, gio_ket_thuc, ten_lop, club_id, clubs!club_id ( ten_club ), nhan_vien!nv_id ( ho_ten, sdt )')
      .eq('dang_ap_dung', true).order('thu').order('gio_bat_dau');
    if (fClub) q = q.eq('club_id', fClub);
    if (fLop) q = q.eq('ten_lop', fLop);
    if (fHlv) q = q.eq('nv_id', fHlv);
    const { data: lich } = await q;

    const groups = new Map();
    for (const l of (lich || [])) {
      if (!groups.has(l.club_id)) groups.set(l.club_id, { ten_club: l.clubs?.ten_club || '', days: {} });
      const g = groups.get(l.club_id);
      (g.days[l.thu] ||= []).push(l);
    }
    const clubGroups = Array.from(groups.values()).sort((a, b) => a.ten_club.localeCompare(b.ten_club));
    const chuaXep = (lich || []).filter((l) => !l.nhan_vien).length;

    return (
      <div className="stack">
        <h1>Thời khoá biểu</h1>
        <div className="card">{filterBar}
          {chuaXep > 0 && <div className="err">Có {chuaXep} lớp chưa xếp HLV (được tô cảnh báo bên dưới).</div>}
        </div>
        {clubGroups.length === 0 && <div className="card muted">Không có lớp phù hợp.</div>}
        {clubGroups.map((g) => (
          <div className="card tkb-club" key={g.ten_club}>
            <h2>{g.ten_club}</h2>
            <div className="tkb-grid">
              {DAYS.map((d) => (
                <div className="tkb-col" key={d}>
                  <div className="tkb-day-head">{DLABEL[d]}</div>
                  {(g.days[d] || []).length === 0 && <div className="tkb-empty">—</div>}
                  {(g.days[d] || []).map((c) => (
                    <div className={'tkb-cell' + (c.nhan_vien ? '' : ' warn')} key={c.id} style={{ borderLeftColor: lopColor(c.ten_lop) }}>
                      <div className="lop" style={{ color: lopColor(c.ten_lop) }}>{c.ten_lop}</div>
                      <div className="gio">{hhmm(c.gio_bat_dau)} – {hhmm(c.gio_ket_thuc)}</div>
                      <div className="hlv">{c.nhan_vien ? `${c.nhan_vien.ho_ten}${c.nhan_vien.sdt ? ' · ' + c.nhan_vien.sdt : ''}` : '⚠ Chưa xếp HLV'}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ===== Chế độ NGÀY: bảng + trạng thái chấm công =====
  const thu = thuFromDate(ngay);
  let q = sb.from('lich_lop')
    .select('id, gio_bat_dau, gio_ket_thuc, ten_lop, clubs!club_id ( ten_club ), nhan_vien!nv_id ( ma_nv, ho_ten )')
    .eq('thu', thu).eq('dang_ap_dung', true).order('gio_bat_dau');
  if (fClub) q = q.eq('club_id', fClub);
  if (fLop) q = q.eq('ten_lop', fLop);
  if (fHlv) q = q.eq('nv_id', fHlv);
  const { data: lich } = await q;

  const { data: cc } = await sb.from('cham_cong').select('lich_lop_id, trang_thai, gio_vao, gio_ra').eq('ngay', ngay);
  const map = new Map();
  for (const r of (cc || [])) if (r.lich_lop_id) map.set(r.lich_lop_id, r);
  let rows = (lich || []).map((l) => { const a = map.get(l.id); return { ...l, tt: a ? a.trang_thai : 'chua', gio_vao: a?.gio_vao, gio_ra: a?.gio_ra }; });
  if (an) rows = rows.filter((r) => r.tt !== 'hoan_thanh');

  return (
    <div className="stack">
      <h1>Thời khoá biểu</h1>
      <div className="card">{filterBar}
        <p className="muted">{DLABEL[thu]} · {ngay} · {rows.length} lớp</p>
        <table>
          <thead><tr><th>Club</th><th>Giờ</th><th>Lớp</th><th>HLV</th><th>Vào</th><th>Ra</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="7" className="muted">Không có lớp phù hợp.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className={r.nhan_vien ? undefined : undefined}>
                <td className="muted">{r.clubs?.ten_club}</td>
                <td>{hhmm(r.gio_bat_dau)}–{hhmm(r.gio_ket_thuc)}</td>
                <td><b>{r.ten_lop}</b></td>
                <td className="muted">{r.nhan_vien ? `${r.nhan_vien.ma_nv} · ${r.nhan_vien.ho_ten}` : <span className="warn-text">⚠ Chưa xếp HLV</span>}</td>
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
