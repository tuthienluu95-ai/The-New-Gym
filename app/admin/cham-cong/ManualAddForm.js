'use client';
import { useState } from 'react';
import { themChamCong } from './actions';
import { matchQ } from '../../../lib/search';

const hhmm = (t) => (t || '').slice(0, 5);
const THU = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ nhật' };
function thuOf(d) { if (!d) return null; const w = new Date(d + 'T12:00:00Z').getUTCDay(); return w === 0 ? 8 : w + 1; }

export default function ManualAddForm({ nvList, clubs, classes, defaultNgay }) {
  const [nvQ, setNvQ] = useState('');
  const [nvId, setNvId] = useState('');
  const [openList, setOpenList] = useState(false);
  const [ngay, setNgay] = useState(defaultNgay);
  const [lop, setLop] = useState('');
  const thu = thuOf(ngay);
  const matches = nvQ ? nvList.filter((n) => matchQ(`${n.ma_nv} ${n.ho_ten}`, nvQ)).slice(0, 8) : [];
  const opts = classes.filter((c) => c.nv_id === nvId && (!thu || c.thu === thu));

  return (
    <>
      {nvId && opts.length === 0 && (
        <div className="muted" style={{ marginBottom: 10 }}>Lưu ý: HLV này không có lớp vào {THU[thu] || 'ngày đã chọn'} — hãy chọn "Lớp khác".</div>
      )}
      <form action={themChamCong} className="manual-grid">
        <div style={{ position: 'relative' }}><label>Nhân viên</label>
          <input value={nvQ} autoComplete="off" placeholder="Gõ tên hoặc mã..."
            onChange={(e) => { setNvQ(e.target.value); setNvId(''); setLop(''); setOpenList(true); }}
            onFocus={() => setOpenList(true)} onBlur={() => setTimeout(() => setOpenList(false), 150)} />
          <input type="hidden" name="nv_id" value={nvId} />
          {openList && matches.length > 0 && (
            <div className="combo-list">
              {matches.map((n) => (
                <div key={n.id} className="combo-item" onMouseDown={() => { setNvId(n.id); setNvQ(`${n.ma_nv} · ${n.ho_ten}`); setLop(''); setOpenList(false); }}>
                  {n.ma_nv} · {n.ho_ten}
                </div>
              ))}
            </div>
          )}
        </div>
        <div><label>Ngày</label>
          <input type="date" lang="en-GB" name="ngay" value={ngay} onChange={(e) => { setNgay(e.target.value); setLop(''); }} required />
        </div>
        <div><label>Lớp</label>
          <select name="lich_lop_id" value={lop} onChange={(e) => setLop(e.target.value)}>
            <option value="">— Lớp khác —</option>
            {opts.map((c) => <option key={c.id} value={c.id}>{hhmm(c.gio_bat_dau)} · {c.ten_lop} · {c.ten_club}</option>)}
          </select>
        </div>
        <div><label>Club (nếu "Lớp khác")</label>
          <select name="club_id"><option value="">—</option>{clubs.map((c) => <option key={c.id} value={c.id}>{c.ten_club}</option>)}</select>
        </div>
        <div><label>Giờ vào</label><input type="text" inputMode="numeric" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="HH:MM" maxLength="5" name="gio_vao" required /></div>
        <div><label>Giờ ra</label><input type="text" inputMode="numeric" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="HH:MM" maxLength="5" name="gio_ra" /></div>
        <div><label>Số học viên</label><input type="number" min="0" name="so_hoc_vien" placeholder="0 = 50% thù lao" /></div>
        <div><label>Ghi chú</label><input name="ghi_chu" placeholder="VD: mất điện, chấm bù" /></div>
        <button className="btn primary">Thêm</button>
      </form>
    </>
  );
}
