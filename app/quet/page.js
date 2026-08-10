import { supabaseAdmin } from '../../lib/supabase';
import KioskClient from './KioskClient';

export const dynamic = 'force-dynamic';

export default async function QuetPage({ searchParams }) {
  const token = searchParams?.c;
  let club = null;
  if (token) {
    const sb = supabaseAdmin();
    const { data } = await sb.from('clubs').select('id, ma_club, ten_club').eq('qr_token', token).maybeSingle();
    club = data;
  }
  if (!club) {
    return (
      <main className="kiosk">
        <div className="card center stack">
          <h1>Mã QR không hợp lệ</h1>
          <p className="muted">Vui lòng quét lại mã QR được dán tại club.</p>
        </div>
      </main>
    );
  }
  return <KioskClient club={club} token={token} />;
}
