'use client';
import { useState, useRef, type FormEvent } from 'react';
import { type Task, type Assignment, type Evidence, button, input, post, request, operationKey, errorMessage } from './client';
export function AthleteNextMoveCard({ actorId, task, assignment, baseline, onSuccess }: { actorId: string; task: Task; assignment: Assignment; baseline: Evidence; onSuccess: (message: string) => void }) {
  const [file, setFile] = useState<File | null>(null); const [notes, setNotes] = useState(''); const [captureNotes, setCaptureNotes] = useState(''); const [recordedAt, setRecordedAt] = useState(''); const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false); const lock = useRef(false); const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState<string | null>(null);
  async function accept() {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { const payload = { assignmentId: task.assignmentId, expectedVersion: task.version }; await post('accept', { ...payload, operationKey: await operationKey(actorId, 'accept', payload) }); onSuccess('Accepted. Your next step is to record the retest.'); }
    catch (e) { setError(errorMessage(e)); } finally { lock.current = false; setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (lock.current || !file) return; lock.current = true; setBusy(true); setError('');
    try {
      let evidenceId = uploaded;
      if (!evidenceId) {
        const form = new FormData(); form.set('file', file); form.set('athleteId', assignment.athleteId); form.set('teamId', assignment.teamId); form.set('protocolVersionId', assignment.protocolVersionId);
        form.set('title', `${task.title} — retest`); form.set('recordedAt', new Date(recordedAt).toISOString()); form.set('captureNotes', captureNotes.trim()); form.set('recordingRightsConfirmed', String(rights));
        const evidence = await request<{ id: string }>('evidence', { method: 'POST', body: form }); evidenceId = evidence.id; setUploaded(evidenceId);
      }
      const payload = { assignmentId: task.assignmentId, expectedVersion: task.version, evidenceId, ...(notes.trim() ? { athleteNotes: notes.trim() } : {}) };
      await post('submit', { ...payload, operationKey: await operationKey(actorId, 'submit', payload) }); onSuccess('Retest submitted. Your coach will review it next.');
    } catch (e) { setError(errorMessage(e)); } finally { lock.current = false; setBusy(false); }
  }
  return <div className="space-y-4">
    <div className="rounded-xl border border-neutral-800 p-3"><h3 className="font-semibold">Your drill</h3><p className="mt-2 whitespace-pre-wrap">{baseline.protocol.instructions}</p><p className="mt-2 text-sm text-neutral-300">Camera: {baseline.protocol.cameraSetupNotes}</p><p className="mt-2 text-sm">Goal: {assignment.successCriterion}</p></div>
    {error && <p role="alert">{error}</p>}
    {task.status === 'ASSIGNED' ? <button disabled={busy} onClick={accept} className={`${button} w-full`}>{busy ? 'Accepting…' : 'Accept Next Move'}</button> : <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={busy || Boolean(uploaded)} className="space-y-3">
        <label className="block text-sm">Retest video<input className={input} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-m4v,.mov,.mp4" required onChange={e => { setFile(e.target.files?.[0] ?? null); setError(''); }} /></label>
        {file && <p className="text-xs text-neutral-400">{file.name} · {(file.size / 1048576).toFixed(1)} MB. Duration is checked after upload.</p>}
        <label className="block text-sm">When did you record it? <span className="text-neutral-400">(your report, local time)</span><input type="datetime-local" className={input} value={recordedAt} onChange={e => setRecordedAt(e.target.value)} required /></label>
        <label className="block text-sm">Recording conditions<textarea className={input} value={captureNotes} maxLength={4000} onChange={e => setCaptureNotes(e.target.value)} placeholder="Camera angle, surface, equipment and any changes" required /></label>
        <label className="flex gap-3 text-sm"><input className="h-5 w-5 shrink-0 accent-white" type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)} required />I have permission to upload and share this recording for coaching.</label>
      </fieldset>
      <label className="block text-sm">Your notes (optional)<textarea className={input} disabled={busy} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      {uploaded && <p role="status" className="text-sm text-neutral-300">Video uploaded. Retrying sends the existing evidence to your coach.</p>}
      <button className={`${button} w-full`} disabled={busy || !file || !rights || !recordedAt || !captureNotes.trim()}>{busy ? (uploaded ? 'Submitting…' : 'Uploading and inspecting…') : uploaded ? 'Retry submission' : 'Submit retest'}</button>
    </form>}
  </div>;
}
