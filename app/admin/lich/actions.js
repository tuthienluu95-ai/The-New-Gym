'use server';
import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function payload(formData) {
  return {
    club_id: formData.get('club_id'),
    thu: parseInt(formData.get('thu'), 10),
    gio_bat_dau: formData.get('gio_bat_dau'),
    gio_ket_thuc: formData.get('gio_ket_thuc'),
    ten_lop: String(formData.get('ten_lop') || '').trim(),
    nv_id: formData.get('nv_id') || null,
  };
}

export async function themLich(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  await sb.from('lich_lop').insert(payload(formData));
  revalidatePath('/admin/lich');
}

export async function suaLich(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  await sb.from('lich_lop').update(payload(formData)).eq('id', formData.get('id'));
  revalidatePath('/admin/lich');
  redirect('/admin/lich');
}

export async function xoaLich(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  await sb.from('lich_lop').delete().eq('id', formData.get('id'));
  revalidatePath('/admin/lich');
}
