'use client';
import { useEffect, useState } from 'react';

export default function DisplayClient({ token, tenClub }) {
  const [svg, setSvg] = useState('');
  const [left, setLeft] = useState(0);

  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        const r = await fetch(`/api/kiosk/live-token?c=${encodeURIComponent(token)}`, { cache: 'no-store' });
        const d = await r.json();
        if (alive && d.ok) { setSvg(d.svg); setLeft(d.ttl); }
      } catch {}
    }
    refresh();
    const iv = setInterval(refresh, 40000);
    const tick = setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 0)), 1000);
    return () => { alive = false; clearInterval(iv); clearInterval(tick); };
  }, [token]);

  return (
    <main className="kiosk">
      <div className="brand">
        <div className="name">THE NEW GYM<span className="dot">.</span></div>
        <div className="club">{tenClub}</div>
      </div>
      <div className="card center stack">
        <h2>Quét mã để chấm công</h2>
        <div style={{ background: '#fff', padding: 12, borderRadius: 12, display: 'inline-block', minHeight: 320 }}
          dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="muted">Mã tự đổi mỗi phút{left ? ` · còn ${left}s` : ''}</p>
      </div>
      <p className="muted center" style={{ color: 'rgba(255,255,255,.85)' }}>
        Để màn hình này luôn mở tại quầy. Nhân viên quét mã bằng điện thoại để vào/ra ca.
      </p>
    </main>
  );
}
