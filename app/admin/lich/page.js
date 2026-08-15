import { matchQ } from '../../../lib/search';
import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { thuLabel } from '../../../lib/time';
import { themLich, xoaLich, khoaLich } from './actions';

export const dynamic = 'force-dynamic';
const THU = [2, 3, 4, 5, 6, 7, 8];

export default async function LichPage({ searchParams }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const fClub = searchParams?.club || '';
  const fLop = searchParams?.lop || '';
  const fHlv = searchParams?.hlv || '';
  const anKhoa = searchParams?.an === '1';
  const timkiem = searchParams?.q || '';

  const [{ data: clubs }, { data: nvList }, { data: allLop }] = await Promise.all([
    sb.from('clubs').select('id, ma_club, ten_club').order('ma_club'),
    sb.from('nhan_vien').select('id, ma_nv, ho_ten').eq('trang_thai', 'dang_lam').order('ma_nv'),
    sb.from('lich_lop').select('ten_lop'),
  ]);
  const lopList = Array.from(new Set((allLop || []).map((x) => x.ten_lop).filter(Boolean))).sort();

  let q = sb.from('lich_lop')
    .select('id, thu, gio_bat_dau, gio_ket_thuc, ten_lop, dang_ap_dung, clubs!club_id ( ten_club ), nhan_vien!nv_id ( ho_ten, ma_nv )')
    .order('thu').order('gio_bat_dau');
  if (fClub) q = q.eq('club_id', fClub);
  if (fLop) q = q.eq('ten_lop', fLop);
  if (fHlv) q = q.eq('nv_id', fHlv);
  if (anKhoa) q = q.eq('dang_ap_dung', true);
  const { data: lich } = await q;
  const lichF = (lich || []).filter((l) => matchQ(`${l.clubs?.ten_club || ''} ${thuLabel(l.thu)} ${l.ten_lop} ${l.nhan_vien ? (l.nhan_vien.ma_nv + ' ' + l.nhan_vien.ho_ten) : ''}`, timkiem));

  return (
    <div className="stack">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><h1>Lịch lớp ({lichF.length})</h1><a className="btn" href={`/api/admin/export?type=lich&club=${fClub}&lop=${encodeURIComponent(fLop)}&hlv=${fHlv}&an=${anKhoa ? "1" : ""}&q=${encodeURIComponent(timkiem)}`}>Xuất Excel</a></div>

      <div className="card">
        <h2>Thêm buổi lớp</h2>
        <form action={themLich} className="form-grid">
          <div><label>Club</label>
            <select name="club_id" required><option value="">— chọn —</option>
              {(clubs || []).map((c) => <option key={c.id} value={c.id}>{c.ten_club}</option>)}
            </select>
          </div>
          <div><label>Thứ</label><select name="thu" required>{THU.map((t) => <option key={t} value={t}>{thuLabel(t)}</option>)}</select></div>
          <div><label>Giờ bắt đầu</label><input type="text" inputMode="numeric" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="HH:MM" maxLength="5" name="gio_bat_dau" required /></div>
          <div><label>Giờ kết thúc</label><input type="text" inputMode="numeric" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="HH:MM" maxLength="5" name="gio_ket_thuc" required /></div>
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
        <form className="filters">
            <div><label>Tìm kiếm</label><input name="q" defaultValue={timkiem} placeholder="Lớp, HLV, club..." /></div>
            <div><label>Lọc theo club</label>
              <select name="club" defaultValue={fClub}>
                <option value="">Tất cả club</option>
                {(clubs || []).map((c) => <option key={c.id} value={c.id}>{c.ten_club}</option>)}
              </select>
            </div>
            <div><label>Lọc theo lớp</label>
              <select name="lop" defaultValue={fLop}>
                <option value="">Tất cả lớp</option>
                {lopList.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div><label>Lọc theo giáo viên</label>
              <select name="hlv" defaultValue={fHlv}>
                <option value="">Tất cả giáo viên</option>
                {(nvList || []).map((n) => <option key={n.id} value={n.id}>{n.ma_nv} · {n.ho_ten}</option>)}
              </select>
            </div>
            <div>
              <label>Hiển thị</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42 }}>
                <input type="checkbox" name="an" value="1" defaultChecked={anKhoa} style={{ width: 18, height: 18 }} />
                Ẩn lớp đã khoá
              </label>
            </div>
            <button className="btn primary">Lọc</button>
        </form>
        <table>
          <thead><tr><th>Club</th><th>Thứ</th><th>Giờ</th><th>Lớp</th><th>HLV</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {lichF.length === 0 && <tr><td colSpan="7" className="muted">Không có buổi lớp phù hợp.</td></tr>}
            {lichF.map((l) => (
              <tr key={l.id} style={l.dang_ap_dung ? undefined : { opacity: 0.6 }}>
                <td className="muted">{l.clubs?.ten_club || '—'}</td>
                <td>{thuLabel(l.thu)}</td>
                <td>{(l.gio_bat_dau || '').slice(0, 5)}–{(l.gio_ket_thuc || '').slice(0, 5)}</td>
                <td><b>{l.ten_lop}</b></td>
                <td className="muted">{l.nhan_vien ? `${l.nhan_vien.ma_nv} · ${l.nhan_vien.ho_ten}` : '—'}</td>
                <td>{l.dang_ap_dung ? <span className="tag green">Đang áp dụng</span> : <span className="tag gray">Đã khoá</span>}</td>
                <td>
                  <div className="row-actions">
                    <form action={khoaLich}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="to" value={l.dang_ap_dung ? 'false' : 'true'} />
                      <button className="btn">{l.dang_ap_dung ? 'Khoá' : 'Mở khoá'}</button>
                    </form>
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
