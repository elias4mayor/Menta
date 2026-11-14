'use client';
import { useRef, useState, type FormEvent } from 'react';
import { type Task, button, input, post, operationKey, errorMessage } from './client';
export function CoachReviewCard({ actorId, task, onSuccess }: { actorId: string; task: Task; onSuccess: (message: string) => void }) {
  const [decision, setDecision] = useState(''); const [comparability, setComparability] = useState(''); const [feedback, setFeedback] = useState(''); const [conditions, setConditions] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const lock = useRef(false);
  async function review(event: FormEvent) {
    event.preventDefault(); if (lock.current || !task.latestSubmissionId) return; lock.current = true; setBusy(true); setError('');
    try {
      const payload = { assignmentId: task.assignmentId, submissionId: task.latestSubmissionId, expectedVersion: task.version, decision, feedbackNote: feedback.trim(), comparability, comparabilityNotes: conditions.trim() };
      await post('review', { ...payload, operationKey: await operationKey(actorId, 'review', payload) }); onSuccess(decision === 'CLOSED' ? 'Review recorded. Next Move closed.' : 'Revision requested. The athlete can submit another attempt.');
    } catch (e) { setError(errorMessage(e)); } finally { lock.current = false; setBusy(false); }
  }
  if (task.status !== 'SUBMITTED') return <p className="text-sm text-neutral-300">This task is overdue. There is no submission to review yet.</p>;
  return <form onSubmit={review} className="space-y-4"><fieldset disabled={busy} className="space-y-4">
    <label className="block text-sm">Retest conditions<select className={input} required value={comparability} onChange={e => { setComparability(e.target.value); if (e.target.value !== 'COMPARABLE') setDecision(''); }}><option value="">Choose after comparing the clips</option><option value="COMPARABLE">Comparable to the pinned protocol</option><option value="NOT_COMPARABLE">Not comparable</option></select></label>
    <label className="block text-sm">Conditions reviewed<textarea className={input} required maxLength={4000} value={conditions} onChange={e => setConditions(e.target.value)} placeholder="Explain the angle, surface and setup you compared." /></label>
    <label className="block text-sm">Coaching feedback<textarea className={input} required maxLength={4000} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What improved, and what needs work?" /></label>
    <label className="block text-sm">Decision<select className={input} required value={decision} onChange={e => setDecision(e.target.value)}><option value="">Choose a decision</option><option value="NEEDS_REVISION">Request revision</option><option value="CLOSED" disabled={comparability !== 'COMPARABLE'}>Approve and close</option></select></label>
  </fieldset>{error && <p role="alert">{error}</p>}<button className={`${button} w-full`} disabled={busy || !decision || !comparability || !conditions.trim() || !feedback.trim()}>{busy ? 'Recording decision…' : 'Record review'}</button></form>;
}
