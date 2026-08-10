import { supabaseAdmin } from '../../../lib/supabase';
import DisplayClient from './DisplayClient';

export const dynamic = 'force-dynamic';

export default async function Page({ params }) {
  const sb = supabaseAdmin();
  const { data: club } = await sb.from('clubs').select('ten_club, qr_token').eq('qr_token', params.token).maybeSingle();
  if (!club) {
    return (<main className="kiosk"><div className="card center stack"><h1>Không tìm thấy club</h1></div></main>);
  }
  return <DisplayClient token={club.qr_token} tenClub={club.ten_club} />;
}
