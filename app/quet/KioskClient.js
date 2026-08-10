'use client';
import { useState } from 'react';
import { fmtTime, thuLabel } from '../../lib/time';

export default function KioskClient({ club, token }) {
  const [step, setStep] = useState('auth'); // auth | checkin | checkout | done
  const [maNv, setMaNv] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null); // {sessionToken, ho_ten, firstTime}
  const [classes, setClasses] = useState([]);
  const [openSession, setOpenSession] = useState(null);
  const [result, setResult] = useState(null); // {kind:'in'|'out', ten_lop, gio}

  async function submitAuth(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await fetch('/api/kiosk/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ma_nv: maNv, pin }),
      });
      const d = await r.json();
      if (!d.ok) { setError(d.error || 'Có lỗi xảy ra'); setLoading(false); return; }
      setSession({ sessionToken: d.sessionToken, ho_ten: d.ho_ten, firstTime: d.firstTime });
      if (d.mode === 'checkout') { setOpenSession(d.openSession); setStep('checkout'); }
      else { setClasses(d.classes || []); setStep('checkin'); }
    } catch { setError('Không kết nối được máy chủ'); }
    setLoading(false);
  }

  async function doCheckin(lich_lop_id) {
    setError(''); setLoading(true);
    try {
      const r = await fetch('/api/kiosk/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: session.sessionToken, lich_lop_id }),
      });
      const d = await r.json();
      if (!d.ok) { setError(d.error || 'Có lỗi xảy ra'); setLoading(false); return; }
      setResult({ kind: 'in', ten_lop: d.ten_lop, gio: d.gio_vao }); setStep('done');
    } catch { setError('Không kết nối được máy chủ'); }
    setLoading(false);
  }

  async function doCheckout() {
    setError(''); setLoading(true);
    try {
      const r = await fetch('/api/kiosk/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: session.sessionToken }),
      });
      const d = await r.json();
      if (!d.ok) { setError(d.error || 'Có lỗi xảy ra'); setLoading(false); return; }
      setResult({ kind: 'out', ten_lop: d.ten_lop, gio: d.gio_ra }); setStep('done');
    } catch { setError('Không kết nối được máy chủ'); }
    setLoading(false);
  }

  function reset() {
    setStep('auth'); setMaNv(''); setPin(''); setError('');
    setSession(null); setClasses([]); setOpenSession(null); setResult(null);
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
          <div>
            <label>Mã nhân viên</label>
            <input className="big" inputMode="numeric" value={maNv}
              onChange={(e) => setMaNv(e.target.value)} placeholder="VD: 01" autoFocus />
          </div>
          <div>
            <label>Mã PIN</label>
            <input className="big" type="password" inputMode="numeric" value={pin}
              onChange={(e) => setPin(e.target.value)} placeholder="••••" />
          </div>
          <button className="btn primary big" disabled={loading}>
            {loading ? 'Đang xử lý…' : 'Tiếp tục'}
          </button>
          <p className="muted center">Lần đầu đăng nhập, mã PIN bạn nhập sẽ được đặt làm PIN của bạn.</p>
        </form>
      )}

      {step === 'checkin' && (
        <div className="card stack">
          <h2>Xin chào, {session.ho_ten}</h2>
          {session.firstTime && <div className="ok">Đã tạo mã PIN cho bạn. Hãy nhớ PIN này cho lần sau.</div>}
          {error && <div className="err">{error}</div>}
          <p className="muted">Chọn buổi lớp bạn đang bắt đầu để <b>vào ca</b>:</p>
          {classes.length === 0 && <div className="tag gray">Hôm nay ({thuLabel(new Date().getDay() === 0 ? 8 : new Date().getDay() + 1)}) không có lớp nào của bạn tại club này.</div>}
          {classes.map((c) => (
            <button key={c.id} className="class-btn" disabled={loading} onClick={() => doCheckin(c.id)}>
              <div className="t">{c.ten_lop}</div>
              <div className="s">{(c.gio_bat_dau || '').slice(0, 5)} – {(c.gio_ket_thuc || '').slice(0, 5)}</div>
            </button>
          ))}
          <button className="class-btn" disabled={loading} onClick={() => doCheckin(null)}>
            <div className="t">Dạy thay / lớp khác</div>
            <div className="s">Không có trong lịch của bạn</div>
          </button>
          <button className="btn block" onClick={reset}>Huỷ</button>
        </div>
      )}

      {step === 'checkout' && (
        <div className="card stack">
          <h2>Xin chào, {session.ho_ten}</h2>
          {error && <div className="err">{error}</div>}
          <p className="muted">Bạn đang có một buổi chưa kết thúc:</p>
          <div className="class-btn" style={{ cursor: 'default' }}>
            <div className="t">{openSession.ten_lop}</div>
            <div className="s">Vào lúc {fmtTime(openSession.gio_vao)}</div>
          </div>
          <button className="btn primary big" disabled={loading} onClick={doCheckout}>
            {loading ? 'Đang xử lý…' : 'Ra ca (kết thúc buổi dạy)'}
          </button>
          <button className="btn block" onClick={reset}>Huỷ</button>
        </div>
      )}

      {step === 'done' && (
        <div className="card center stack">
          <div style={{ fontSize: 40 }}>{result.kind === 'in' ? '✅' : '👋'}</div>
          <h2>{result.kind === 'in' ? 'Đã vào ca' : 'Đã ra ca'}</h2>
          <div className="ok">
            {result.ten_lop || 'Lớp khác'} · {fmtTime(result.gio)}
          </div>
          <button className="btn primary block" onClick={reset}>Xong</button>
        </div>
      )}
    </main>
  );
}
