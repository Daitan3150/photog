'use server';

import { redirect } from 'next/navigation';

export default async function AdminSettingsPage() {
  redirect('/admin/settings/covers');
}
