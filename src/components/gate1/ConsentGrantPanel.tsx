'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { button, input, panel, request, post, errorMessage } from './client';
type Sharing = { evidence: { id: string; filmId: string; teamId: string; title: string }[]; contacts: { teamId: string; user: { id: string; name: string; role: string } }[]; grants: { id: string; granteeId: string; resourceId: string; expiresAt: string; grantee: { name: string }; permittedActions: string[] }[] };
export function ConsentGrantPanel({ actorId }: { actorId: string }) {
  const [data, setData] = useState<Sharing>(); const [evidenceId, setEvidenceId] = useState(''); const [granteeId, setGranteeId] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const lock = useRef(false);
  async function refresh() { setData(await request<Sharing>('sharing')); }
  useEffect(() => { const c = new AbortController(); request<Sharing>('sharing', { signal: c.signal }).then(setData).catch(e => { if (!c.signal.aborted) setError(errorMessage(e)); }); return () => c.abort(); }, []);
  const evidence = data?.evidence.find(e => e.id === evidenceId);
  async function share(event: FormEvent) {
    event.preventDefault(); if (!evidence || lock.current) return; lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await post('grants', { athleteId: actorId, teamId: evidence.teamId, granteeId, resourceType: 'EVIDENCE', resourceId: evidence.id, permittedActions: ['PLAY_MEDIA'], expiresAt: new Date(Date.now() + 86400000).toISOString() }); await refresh(); setMessage('Playback shared for 24 hours. No coaching notes or other videos were shared.'); }
    catch (e) { setError(errorMessage(e)); await refresh().catch(() => undefined); } finally { lock.current = false; setBusy(false); }
  }
  async function revoke(id: string) {
    if (lock.current) return; lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await request(`grants/${encodeURIComponent(id)}`, { method: 'DELETE' }); await refresh(); setMessage('Access revoked. New playback requests will be denied; already downloaded video cannot be recalled.'); }
    catch (e) { setError(errorMessage(e)); } finally { lock.current = false; setBusy(false); }
  }
  return <section className={panel} aria-label="Video sharing"><h2 className="text-xl font-semibold">Your video. Your access.</h2><p className="text-sm text-neutral-400">Share playback with a parent, trainer or recruiter on your team for 24 hours.</p>
    {error && <div role="alert"><p>{error}</p><button className={button} onClick={() => { setError(''); void refresh().catch(e => setError(errorMessage(e))); }}>Refresh sharing</button></div>}{message && <p role="status">{message}</p>}
    {!data ? <p>Loading sharing…</p> : <><form onSubmit={share} className="space-y-3"><fieldset disabled={busy} className="space-y-3">
      <label className="block text-sm">Video<select className={input} required value={evidenceId} onChange={e => { setEvidenceId(e.target.value); setGranteeId(''); }}><option value="">Choose a video</option>{data.evidence.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
      <label className="block text-sm">Recipient<select className={input} required value={granteeId} onChange={e => setGranteeId(e.target.value)}><option value="">Choose a team contact</option>{data.contacts.filter(c => c.teamId === evidence?.teamId).map(c => <option key={c.user.id} value={c.user.id}>{c.user.name} · {c.user.role.toLowerCase()}</option>)}</select></label>
      {evidence && <a className="block text-sm underline" href={`/next-move?film=${encodeURIComponent(evidence.filmId)}`}>Open playback page — share this link with your chosen recipient</a>}
      <button className={button} disabled={!evidence || !granteeId || busy || data.grants.some(g => g.resourceId === evidenceId && g.granteeId === granteeId && g.permittedActions.includes('PLAY_MEDIA'))}>{busy ? 'Saving…' : 'Allow playback for 24 hours'}</button>
    </fieldset></form><h3 className="font-semibold">Active access</h3>{data.grants.length === 0 ? <p className="text-sm text-neutral-400">No active shares.</p> : data.grants.map(g => <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 pt-3" key={g.id}><div><p>{g.grantee.name}</p><p className="text-sm text-neutral-400">{data.evidence.find(e => e.id === g.resourceId)?.title ?? 'Shared video'} · expires {new Date(g.expiresAt).toLocaleString()}</p></div><button className={button} disabled={busy} onClick={() => revoke(g.id)}>Revoke access</button></div>)}</>}
  </section>;
}
