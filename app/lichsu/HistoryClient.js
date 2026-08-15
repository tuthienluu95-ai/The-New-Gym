'use client';
import { useState } from 'react';

function monthStart() { const d = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())); return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()).slice(0, 8) + '01'; }
function todayVN() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()); }

function badge(tt) {
  if (tt === 'hoan_thanh') return <span className="tag green">Hoàn thành</span>;
  if (tt === 'quen_ra') return <span className="tag warn">Quên chấm ra</span>;
  if (tt === 'dang_lam') return <span className="tag" style={{ background: 'var(--accent-weak)', color: 'var(--accent-dark)' }}>Đang trong ca</span>;
  return <span className="tag gray">—</span>;
}

export default function HistoryClient() {
  const [maNv, setMaNv] = useState('');
  const [pin, setPin] = useState('');
  const [tu, setTu] = useState(monthStart());
  const [den, setDen] = useState(todayVN());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  async function load(e) {
    e?.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await fetch('/api/me/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ma_nv: maNv, pin, tu, den }) });
      const d = await r.json();
      if (!d.ok) { setError(d.error || 'Có lỗi xảy ra'); setLoading(false); return; }
      setData(d);
    } catch { setError('Không kết nối được máy chủ'); }
    setLoading(false);
  }

  return (
    <main className="kiosk" style={{ maxWidth: 820 }}>
      <div className="brand"><div className="name">THE NEW GYM</div><div className="club">Lịch sử chấm công của tôi</div></div>

      {!data ? (
        <form className="card stack" onSubmit={load}>
          <h2>Đăng nhập</h2>
          {error && <div className="err">{error}</div>}
          <div><label>Mã nhân viên</label><input className="big" inputMode="numeric" value={maNv} onChange={(e) => setMaNv(e.target.value)} placeholder="VD: 01" autoFocus /></div>
          <div><label>Mã PIN</label><input className="big" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" /></div>
          <button className="btn primary big" disabled={loading}>{loading ? 'Đang tải…' : 'Xem lịch sử'}</button>
          <p className="muted center">Dùng đúng Mã NV và PIN bạn chấm công hằng ngày. Nếu chưa có PIN, hãy chấm công lần đầu tại club.</p>
        </form>
      ) : (
        <div className="card stack">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ margin: 0 }}>Xin chào, {data.ho_ten}</h2>
            <button className="btn" onClick={() => { setData(null); setPin(''); }}>Thoát</button>
          </div>
          <form className="filters" onSubmit={load}>
            <div><label>Từ ngày</label><input type="date" value={tu} onChange={(e) => setTu(e.target.value)} /></div>
            <div><label>Đến ngày</label><input type="date" value={den} onChange={(e) => setDen(e.target.value)} /></div>
            <button className="btn primary" disabled={loading}>{loading ? 'Đang tải…' : 'Xem'}</button>
          </form>
          <div className="grid">
            <div className="metric"><div className="n">{data.summary.so_ca}</div><div className="l">Số ca</div></div>
            <div className="metric"><div className="n" style={{ color: '#B7791F' }}>{data.summary.so_tre}</div><div className="l">Vào trễ</div></div>
            <div className="metric"><div className="n" style={{ color: '#B7791F' }}>{data.summary.so_som}</div><div className="l">Ra sớm</div></div>
          </div>
          {error && <div className="err">{error}</div>}
          <table>
            <thead><tr><th>Ngày</th><th>Club</th><th>Lớp</th><th>Ca lớp</th><th>Vào</th><th>Ra</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {data.rows.length === 0 && <tr><td colSpan="7" className="muted">Không có lượt chấm công trong khoảng này.</td></tr>}
              {data.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.ngay}</td>
                  <td className="muted">{r.club}</td>
                  <td>{r.lop}{r.ghi_chu ? <span className="muted"> · {r.ghi_chu}</span> : null}</td>
                  <td className="muted">{r.ca || '—'}</td>
                  <td>{r.vao}{r.late > 0 ? <span className="warn-text"> · trễ {r.late}p</span> : null}</td>
                  <td>{r.ra || '—'}{r.early > 0 ? <span className="warn-text"> · sớm {r.early}p</span> : null}</td>
                  <td>{badge(r.tt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
