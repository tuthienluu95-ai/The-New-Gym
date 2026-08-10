'use server';
import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function num(v) {
  const s = String(v || '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function themClub(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  await sb.from('clubs').insert({
    ma_club: String(formData.get('ma_club') || '').trim(),
    ten_club: String(formData.get('ten_club') || '').trim(),
    dia_chi: String(formData.get('dia_chi') || '').trim() || null,
  });
  revalidatePath('/admin/clubs');
}

export async function suaClub(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  const id = formData.get('id');
  const banKinh = num(formData.get('ban_kinh_m'));
  await sb.from('clubs').update({
    ma_club: String(formData.get('ma_club') || '').trim(),
    ten_club: String(formData.get('ten_club') || '').trim(),
    dia_chi: String(formData.get('dia_chi') || '').trim() || null,
    lat: num(formData.get('lat')),
    lng: num(formData.get('lng')),
    ban_kinh_m: banKinh == null ? 200 : Math.round(banKinh),
  }).eq('id', id);
  revalidatePath('/admin/clubs');
  redirect('/admin/clubs');
}

export async function xoaClub(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  await sb.from('clubs').delete().eq('id', formData.get('id'));
  revalidatePath('/admin/clubs');
}
