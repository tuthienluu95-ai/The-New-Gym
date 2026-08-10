import QRCode from 'qrcode';
import { headers } from 'next/headers';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { requireAdmin } from '../../../../../lib/guard';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

export default async function ClubQR({ params }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { data: c } = await sb.from('clubs').select('ma_club, ten_club, qr_token').eq('id', params.id).maybeSingle();
  if (!c) return <div className="card">Không tìm thấy club.</div>;
  const h = headers();
  const proto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('host');
  const url = `${proto}://${host}/quet?c=${c.qr_token}`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 260 });
  return (
    <div className="stack">
      <div className="noprint"><a href="/admin/clubs">← Về danh sách club</a></div>
      <div className="card center stack" style={{ maxWidth: 360, margin: '0 auto' }}>
        <div style={{ fontWeight: 700 }}>THE NEW GYM</div>
        <div>{c.ten_club}</div>
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="muted" style={{ wordBreak: 'break-all' }}>{url}</p>
        <div className="noprint"><PrintButton /></div>
      </div>
      <p className="muted center noprint">In mã này và dán tại quầy lễ tân của club. Nhân viên dùng camera điện thoại quét là vào thẳng màn hình chấm công.</p>
    </div>
  );
}
