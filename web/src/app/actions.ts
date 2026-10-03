'use server';

import { revalidatePath } from 'next/cache';
import { panelApi } from '@/lib/api';
import { STATUSY } from '@/lib/types';

export type ActionState = { ok: boolean; message: string; data?: Record<string, number> } | null;

const done = (r: { ok: true } | { ok: false; error: string }, data?: Record<string, number>): ActionState => {
  revalidatePath('/', 'layout');
  return r.ok ? { ok: true, message: 'ok', data } : { ok: false, message: r.error };
};

export async function updateTopicAction(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('id') ?? '');
  const status = String(form.get('status') ?? '');
  const notatka = String(form.get('notatka') ?? '');
  if (!id || !(STATUSY as readonly string[]).includes(status)) return { ok: false, message: 'invalid input' };
  return done(await panelApi.updateTopic(id, { status, notatka }));
}

export async function publishAction(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('id') ?? '');
  if (!id) return { ok: false, message: 'invalid input' };
  return done(await panelApi.publish(id));
}

export async function jobAction(_: ActionState, form: FormData): Promise<ActionState> {
  const job = String(form.get('job') ?? '');
  if (job !== 'tematy' && job !== 'raport-dzienny' && job !== 'ingest') return { ok: false, message: 'invalid job' };
  return done(await panelApi.job(job));
}

export async function demoAction(_: ActionState, form: FormData): Promise<ActionState> {
  if (form.get('op') === 'delete') return done(await panelApi.deleteDemo());
  const r = await panelApi.seedDemo();
  return done(r, r.ok ? r.data ?? undefined : undefined);
}
