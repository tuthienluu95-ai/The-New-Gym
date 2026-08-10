'use server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function themNV(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  const pin = String(formData.get('pin') || '').trim();
  const row = {
    ma_nv: String(formData.get('ma_nv') || '').trim(),
    ho_ten: String(formData.get('ho_ten') || '').trim(),
    club_chinh_id: formData.get('club_chinh_id') || null,
    sdt: String(formData.get('sdt') || '').trim() || null,
    email: String(formData.get('email') || '').trim() || null,
    vai_tro: formData.get('vai_tro') || 'nhan_vien',
  };
  if (pin) row.pin_hash = await bcrypt.hash(pin, 10);
  await sb.from('nhan_vien').insert(row);
  revalidatePath('/admin/nhan-vien');
}

export async function suaNV(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  const id = formData.get('id');
  await sb.from('nhan_vien').update({
    ma_nv: String(formData.get('ma_nv') || '').trim(),
    ho_ten: String(formData.get('ho_ten') || '').trim(),
    club_chinh_id: formData.get('club_chinh_id') || null,
    sdt: String(formData.get('sdt') || '').trim() || null,
    email: String(formData.get('email') || '').trim() || null,
    vai_tro: formData.get('vai_tro') || 'nhan_vien',
    trang_thai: formData.get('trang_thai') || 'dang_lam',
  }).eq('id', id);
  revalidatePath('/admin/nhan-vien');
  redirect('/admin/nhan-vien');
}

export async function datPin(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  const id = formData.get('id');
  const pin = String(formData.get('pin') || '').trim();
  const hash = pin ? await bcrypt.hash(pin, 10) : null;
  await sb.from('nhan_vien').update({ pin_hash: hash }).eq('id', id);
  revalidatePath('/admin/nhan-vien');
  redirect('/admin/nhan-vien/' + id);
}

export async function xoaNV(formData) {
  requireAdmin();
  const sb = supabaseAdmin();
  await sb.from('nhan_vien').delete().eq('id', formData.get('id'));
  revalidatePath('/admin/nhan-vien');
}
