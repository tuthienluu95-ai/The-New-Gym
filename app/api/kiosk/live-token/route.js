import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../../../../lib/supabase';
import { signToken } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const c = new URL(req.url).searchParams.get('c');
  if (!c) return NextResponse.json({ ok: false }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: club } = await sb.from('clubs').select('id, ten_club').eq('qr_token', c).maybeSingle();
  if (!club) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

  const ttl = 60;
  const short = signToken({ club_id: club.id, kind: 'qr' }, ttl);
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('host');
  const url = `${proto}://${host}/quet?c=${encodeURIComponent(short)}`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 320 });

  return NextResponse.json({ ok: true, svg, ttl, ten_club: club.ten_club });
}
