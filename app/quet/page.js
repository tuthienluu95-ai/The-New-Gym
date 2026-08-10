import { supabaseAdmin } from '../../lib/supabase';
import { verifyToken } from '../../lib/auth';
import KioskClient from './KioskClient';

export const dynamic = 'force-dynamic';

export default async function QuetPage({ searchParams }) {
  const c = searchParams?.c;
  const sb = supabaseAdmin();
  let club = null;
  let expired = false;

  if (c) {
    const p = verifyToken(c);
    if (p && p.kind === 'qr' && p.club_id) {
      const { data } = await sb.from('clubs').select('id, ma_club, ten_club').eq('id', p.club_id).maybeSingle();
      club = data;
    } else if (c.includes('.')) {
      expired = true;
    } else {
      const { data } = await sb.from('clubs').select('id, ma_club, ten_club').eq('qr_token', c).maybeSingle();
      club = data;
    }
  }

  if (expired) {
    return (
      <main className="kiosk">
        <div className="card center stack">
          <h1>Mã QR đã hết hạn</h1>
          <p className="muted">Vui lòng quét lại mã đang hiển thị trên màn hình tại club.</p>
        </div>
      </main>
    );
  }
  if (!club) {
    return (
      <main className="kiosk">
        <div className="card center stack">
          <h1>Mã QR không hợp lệ</h1>
          <p className="muted">Vui lòng quét lại mã QR tại club.</p>
        </div>
      </main>
    );
  }
  return <KioskClient club={club} token={c} />;
}
