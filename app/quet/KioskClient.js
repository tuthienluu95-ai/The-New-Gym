'use client';
import { useState } from 'react';
import { fmtTime } from '../../lib/time';

const hhmm = (t) => (t || '').slice(0, 5);

export default function KioskClient({ club, token }) {
  const [step, setStep] = useState('auth'); // auth | checkin | substitute | checkout | done
  const [maNv, setMaNv] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [classes, setClasses] = useState([]);
  const [clubClasses, setClubClasses] = useState([]);
  const [openSession, setOpenSession] = useState(null);
  const [result, setResult] = useState(null);

  function getPos() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }

  async function submitAuth(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const pos = await getPos();
      const r = await fetch('/api/kiosk/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ma_nv: maNv, pin, lat: pos?.lat ?? null, lng: pos?.lng ?? null }) });
      const d = await r.json();
      if (!d.ok) { setError(d.error || 'Có lỗi xảy ra'); setLoading(false); return; }
      setSession({ sessionToken: d.sessionToken, ho_ten: d.ho_ten, firstTime: d.firstTime });
      if (d.mode === 'checkout') { setOpenSession(d.openSession); setStep('checkout'); }
      else { setClasses(d.classes || []); setClubClasses(d.clubClasses || []); setStep('checkin'); }
    } catch { setError('Không kết nối được máy chủ'); }
    setLoading(false);
  }

  async function doCheckin(lich_lop_id, ghi_chu) {
    setError(''); setLoading(true);
    try {
      const r = await fetch('/api/kiosk/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: session.sessionToken, lich_lop_id, ghi_chu }) });
      const d = await r.json();
      if (!d.ok) { setError(d.error || 'Có lỗi xảy ra'); setLoading(false); return; }
      setResult({ kind: 'in', ten_lop: d.ten_lop, gio: d.gio_vao }); setStep('done');
    } catch { setError('Không kết nối được máy chủ'); }
    setLoading(false);
  }

  async function doCheckout() {
    setError(''); setLoading(true);
    try {
      const r = await fetch('/api/kiosk/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: session.sessionToken }) });
      const d = await r.json();
      if (!d.ok) { setError(d.error || 'Có lỗi xảy ra'); setLoading(false); return; }
      setResult({ kind: 'out', ten_lop: d.ten_lop, gio: d.gio_ra }); setStep('done');
    } catch { setError('Không kết nối được máy chủ'); }
    setLoading(false);
  }

  function reset() {
    setStep('auth'); setMaNv(''); setPin(''); setError('');
    setSession(null); setClasses([]); setClubClasses([]); setOpenSession(null); setResult(null);
  }

  function lockedRow(c, key) {
    return (
      <div className="class-btn locked" key={key}>
        <div className="t">{c.ten_lop}{c.hlv ? <span style={{ fontWeight: 400 }}> · HLV: {c.hlv}</span> : null}</div>
        <div className="s">{hhmm(c.gio_bat_dau)} – {hhmm(c.gio_ket_thuc)} · <span className="warn-text">Đã khoá · trễ quá 15 phút</span></div>
      </div>
    );
  }

  return (
    <main className="kiosk">
      <div className="brand">
        <div className="name">THE NEW GYM</div>
        <div className="club">{club.ten_club}</div>
      </div>

      {step === 'auth' && (
        <form className="card stack" onSubmit={submitAuth}>
          <h2>Chấm công</h2>
          {error && <div className="err">{error}</div>}
          <div><label>Mã nhân viên</label>
            <input className="big" inputMode="numeric" value={maNv} onChange={(e) => setMaNv(e.target.value)} placeholder="VD: 01" autoFocus /></div>
          <div><label>Mã PIN</label>
            <input className="big" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" /></div>
          <button className="btn primary big" disabled={loading}>{loading ? 'Đang xử lý…' : 'Tiếp tục'}</button>
          <p className="muted center">Hệ thống sẽ tự nhận biết bạn đang <b>vào ca</b> hay <b>ra ca</b>. Lần đầu, mã PIN bạn nhập sẽ được đặt làm PIN. Hãy cho phép truy cập vị trí khi được hỏi.</p>
        </form>
      )}

      {step === 'checkin' && (
        <div className="card stack">
          <span className="mode in">● CHẤM CÔNG VÀO</span>
          <h2 style={{ margin: 0 }}>Xin chào, {session.ho_ten}</h2>
          {session.firstTime && <div className="ok">Đã tạo mã PIN cho bạn. Hãy nhớ PIN này cho lần sau.</div>}
          {error && <div className="err">{error}</div>}
          <p className="muted">Chọn buổi lớp bạn đang bắt đầu để <b>vào ca</b>:</p>
          {classes.length === 0 && <div className="tag gray">Hôm nay bạn không có lớp tại club này.</div>}
          {classes.map((c) => c.khoa ? lockedRow(c, c.id) : (
            <button key={c.id} className="class-btn" disabled={loading} onClick={() => doCheckin(c.id, null)}>
              <div className="t">{c.ten_lop}</div>
              <div className="s">{hhmm(c.gio_bat_dau)} – {hhmm(c.gio_ket_thuc)}</div>
            </button>
          ))}
          <button className="class-btn" disabled={loading} onClick={() => setStep('substitute')}>
            <div className="t">Dạy thay / lớp khác</div>
            <div className="s">Chọn lớp và người cần dạy thay</div>
          </button>
          <button className="btn block" onClick={reset}>Huỷ</button>
        </div>
      )}

      {step === 'substitute' && (
        <div className="card stack">
          <span className="mode in">● CHẤM CÔNG VÀO · DẠY THAY</span>
          <h2 style={{ margin: 0 }}>Chọn lớp bạn dạy thay</h2>
          {error && <div className="err">{error}</div>}
          <p className="muted">Các lớp hôm nay tại {club.ten_club}. Chọn lớp bạn đang hỗ trợ:</p>
          {clubClasses.length === 0 && <div className="tag gray">Hôm nay club không có lớp trong lịch.</div>}
          {clubClasses.map((c) => c.khoa ? lockedRow(c, c.id) : (
            <button key={c.id} className="class-btn" disabled={loading} onClick={() => doCheckin(c.id, c.hlv ? `Dạy thay cho ${c.hlv}` : 'Dạy thay')}>
              <div className="t">{c.ten_lop}</div>
              <div className="s">{hhmm(c.gio_bat_dau)} – {hhmm(c.gio_ket_thuc)}{c.hlv ? ` · dạy thay cho ${c.hlv}` : ''}</div>
            </button>
          ))}
          <button className="class-btn" disabled={loading} onClick={() => doCheckin(null, 'Lớp khác')}>
            <div className="t">Lớp khác (không có trong lịch)</div>
            <div className="s">Ghi nhận là buổi phát sinh</div>
          </button>
          <button className="btn block" onClick={() => setStep('checkin')}>← Quay lại</button>
        </div>
      )}

      {step === 'checkout' && (
        <div className="card stack">
          <span className="mode out">● CHẤM CÔNG RA</span>
          <h2 style={{ margin: 0 }}>Xin chào, {session.ho_ten}</h2>
          {error && <div className="err">{error}</div>}
          <p className="muted">Bạn đang có một buổi chưa kết thúc:</p>
          <div className="class-btn" style={{ cursor: 'default' }}>
            <div className="t">{openSession.ten_lop}</div>
            <div className="s">Vào lúc {fmtTime(openSession.gio_vao)}</div>
          </div>
          <button className="btn primary big" disabled={loading} onClick={doCheckout}>{loading ? 'Đang xử lý…' : 'Ra ca (kết thúc buổi dạy)'}</button>
          <button className="btn block" onClick={reset}>Huỷ</button>
        </div>
      )}

      {step === 'done' && (
        <div className="card center stack">
          <div style={{ fontSize: 40 }}>{result.kind === 'in' ? '✅' : '👋'}</div>
          <span className={result.kind === 'in' ? 'mode in' : 'mode out'} style={{ margin: '0 auto' }}>
            {result.kind === 'in' ? '● ĐÃ VÀO CA' : '● ĐÃ RA CA'}
          </span>
          <div className="ok">{result.ten_lop || 'Lớp khác'} · {fmtTime(result.gio)}</div>
          <button className="btn primary block" onClick={reset}>Xong</button>
        </div>
      )}
    </main>
  );
}
