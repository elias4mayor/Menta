'use client';
import { useEffect, useState } from 'react';
import { request, errorMessage, button } from './client';
export function FilmPlayer({ filmId, label }: { filmId: string; label: string }) {
  const [url, setUrl] = useState<string>(); const [error, setError] = useState(''); const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    request<{ playbackUrl: string }>(`playback/${encodeURIComponent(filmId)}`, { signal: controller.signal }).then(r => setUrl(r.playbackUrl)).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); });
    return () => controller.abort();
  }, [filmId, reload]);
  return <figure className="space-y-2"><figcaption className="text-sm font-medium">{label}</figcaption>
    {error ? <div role="alert" className="space-y-2"><p>{error}</p><button className={button} onClick={() => { setUrl(undefined); setError(''); setReload(n => n + 1); }}>Retry playback</button></div> : url ? <video key={`${filmId}:${reload}`} aria-label={label} src={url} controls playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-black" onError={() => { setUrl(undefined); setError('Playback stopped or this format is unavailable. Retry to check access again.'); }} /> : <p role="status">Checking playback access…</p>}
  </figure>;
}
