'use server';
import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
  await sb.from('clubs').update({
    ma_club: String(formData.get('ma_club') || '').trim(),
    ten_club: String(formData.get('ten_club') || '').trim(),
    dia_chi: String(formData.get('dia_chi') || '').trim() || null,
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
