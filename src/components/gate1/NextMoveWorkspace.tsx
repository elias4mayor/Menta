'use client';
import { useEffect, useState } from 'react';
import { AthleteNextMoveCard } from './AthleteNextMoveCard';
import { CoachReviewCard } from './CoachReviewCard';
import { ConsentGrantPanel } from './ConsentGrantPanel';
import { FilmPlayer } from './FilmPlayer';
import { type Task, type Assignment, type Evidence, type Submission, panel, button, request, errorMessage } from './client';
type Detail = { assignment: Assignment; baseline: Evidence; observation: { observationNote: string; interpretationNote?: string; startSec: number; endSec: number }; followup?: Evidence; submission?: Submission };
function TaskDetail({ actorId, task, onSuccess }: { actorId: string; task: Task; onSuccess: (message: string) => void }) {
  const [detail, setDetail] = useState<Detail>(); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    async function load() {
      const assignment = await request<Assignment>(`assignments/${task.assignmentId}`, { signal: c.signal });
      const [baseline, observation, submission] = await Promise.all([request<Evidence>(`evidence/${assignment.baselineEvidenceId}`, { signal: c.signal }), request<Detail['observation']>(`observations/${assignment.observationId}`, { signal: c.signal }), task.latestSubmissionId ? request<Submission>(`submissions/${task.latestSubmissionId}`, { signal: c.signal }) : Promise.resolve(undefined)]);
      const followup = submission ? await request<Evidence>(`evidence/${submission.evidenceId}`, { signal: c.signal }) : undefined;
      if (!c.signal.aborted) setDetail({ assignment, baseline, observation, submission, followup });
    }
    void load().catch(e => { if (!c.signal.aborted) setError(errorMessage(e)); }); return () => c.abort();
  }, [task.assignmentId, task.latestSubmissionId, retry]);
  return <section className={panel} aria-label={task.title}><span className="inline-block rounded-full border border-neutral-600 px-3 py-1 text-xs uppercase tracking-wide">{task.reasonLabel}</span><h2 className="text-2xl font-semibold">{task.title}</h2><p className="text-sm text-neutral-400">{task.counterpartyName} · {task.teamName} · Due {new Date(task.dueAt).toLocaleString()}</p><p className="rounded-xl border border-neutral-800 bg-black p-3">{task.customCue}</p>
    {error ? <div role="alert"><p>{error}</p><button className={button} onClick={() => { setError(''); setRetry(n => n + 1); }}>Retry details</button></div> : !detail ? <p role="status">Loading evidence…</p> : <>
      <FilmPlayer key={detail.baseline.filmId} filmId={detail.baseline.filmId} label="Baseline" />
      <p className="text-sm"><span className="text-neutral-400">Observed at {detail.observation.startSec}–{detail.observation.endSec}s: </span>{detail.observation.observationNote}</p>
      {detail.observation.interpretationNote && <p className="text-sm"><span className="text-neutral-400">Coach interpretation: </span>{detail.observation.interpretationNote}</p>}
      {detail.followup && <FilmPlayer key={detail.followup.filmId} filmId={detail.followup.filmId} label="Latest retest" />}
      {detail.submission?.review && <div className="rounded-xl border border-neutral-600 p-3"><h3 className="font-semibold">Coach feedback</h3><p>{detail.submission.review.feedbackNote}</p><p className="mt-2 text-sm text-neutral-300">{detail.submission.review.comparabilityNotes}</p></div>}
      {task.roleView === 'ATHLETE' ? <AthleteNextMoveCard actorId={actorId} task={task} assignment={detail.assignment} baseline={detail.baseline} onSuccess={onSuccess} /> : <><p className="text-sm text-neutral-300">Pinned protocol: {detail.baseline.protocol.instructions}<br />Camera: {detail.baseline.protocol.cameraSetupNotes}<br />Success: {detail.assignment.successCriterion}</p><CoachReviewCard actorId={actorId} task={task} onSuccess={onSuccess} /></>}
    </>}
  </section>;
}
export function NextMoveWorkspace({ actorId, role, filmId }: { actorId: string; role: string; filmId?: string }) {
  const [selectedId, setSelectedId] = useState(''); const [tasks, setTasks] = useState<Task[]>(); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (filmId || !['ATHLETE', 'COACH'].includes(role)) return;
    const c = new AbortController();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    request<{ athleteQueue: Task[]; coachQueue: Task[] }>(`today?timeZone=${encodeURIComponent(timeZone)}`, { signal: c.signal }).then(data => setTasks(role === 'ATHLETE' ? data.athleteQueue : data.coachQueue)).catch(e => { if (!c.signal.aborted) setError(errorMessage(e)); });
    return () => c.abort();
  }, [refresh, filmId, role]);
  const selectedTask = tasks?.find(t => t.assignmentId === selectedId) ?? tasks?.[0];
  function reload() { setError(''); setRefresh(n => n + 1); }
  return <div className="mx-auto max-w-2xl space-y-5 rounded-3xl bg-black p-4 text-white sm:p-6"><header className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.25em] text-neutral-400">MENTA</p><h1 className="mt-1 text-3xl font-semibold">Next Move</h1></div>{!filmId && ['ATHLETE', 'COACH'].includes(role) && <button className={button} onClick={reload}>Refresh</button>}</header>
    {message && <p role="status" className="rounded-xl border border-neutral-700 p-4">{message}</p>}
    {filmId ? <section className={panel}><FilmPlayer key={filmId} filmId={filmId} label="Shared video" /><a href="/next-move" className="block underline">Back to Next Move</a></section> : <>
      {error && <p role="alert">{error}</p>}
      {['ATHLETE', 'COACH'].includes(role) ? !tasks ? <p role="status">Loading your next step…</p> : tasks.length ? <><p className="text-sm text-neutral-400">{tasks.length} active {tasks.length === 1 ? 'task' : 'tasks'}. Start with the first.</p>{tasks.length > 1 && <label className="block text-sm">Active task<select className="mt-2 w-full rounded-xl border border-neutral-700 bg-black p-3 text-white" value={selectedTask?.assignmentId} onChange={e => setSelectedId(e.target.value)}>{tasks.map(task => <option key={task.assignmentId} value={task.assignmentId}>{task.reasonLabel} · {task.title}</option>)}</select></label>}{selectedTask && <TaskDetail key={`${selectedTask.assignmentId}:${selectedTask.version}`} actorId={actorId} task={selectedTask} onSuccess={text => { setMessage(text); reload(); }} />}</> : <p className={panel}>{role === 'ATHLETE' ? 'No action needed right now. Submitted attempts are waiting for your coach.' : 'No submissions awaiting review or overdue tasks.'}</p> : <p className={panel}>Open the playback link shared with you by an athlete. Access is checked each time.</p>}
      {role === 'ATHLETE' && <ConsentGrantPanel key={refresh} actorId={actorId} />}
    </>}
  </div>;
}
