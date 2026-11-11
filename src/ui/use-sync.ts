import {useEffect, useRef, useState} from 'react';
import {apiFetch} from '../session.js';
import {hosted} from '../runtime.js';
import type {SyncStatus} from '../../server/collection-types.js';
import type {Coverage} from '../types.js';

export type ArchiveStatus = SyncStatus & {coverage: Coverage};
function readStatus(value: unknown): ArchiveStatus {
  if (!value || typeof value !== 'object') throw new Error('État invalide');
  const s = value as ArchiveStatus;
  const count = (number: unknown) => typeof number === 'number' && Number.isFinite(number) && number >= 0;
  const c = s.coverage;
  if (typeof s.running !== 'boolean' || typeof s.phase !== 'string' || !count(s.done) || !count(s.total)
    || s.lastSuccess !== null && (typeof s.lastSuccess !== 'string' || !Number.isFinite(Date.parse(s.lastSuccess)))
    || !Array.isArray(s.errors) || !s.errors.every(item => item && typeof item.url === 'string' && typeof item.message === 'string')
    || !c || !c.calendar || !c.d4 || ![c.expected, c.published, c.partial, c.missing, c.uncollected, c.players, c.retained, c.calendar.discovered, c.d4.expected, c.d4.published].every(count)
    || c.calendar.expected !== null && !count(c.calendar.expected)) throw new Error('État invalide');
  return s;
}
export function useSync(onUpdated: () => Promise<void>) {
  const [status, setStatus] = useState<ArchiveStatus | null>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [force, setForce] = useState(false);
  const updated = useRef(onUpdated);
  updated.current = onUpdated;
  const refresh = useRef<(() => Promise<void>) | null>(null);
  const start = useRef<((force: boolean) => Promise<void>) | null>(null);
  useEffect(() => {
    const lifetime = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let wasRunning = false;
    let busy = false;
    let queued: boolean | null = null;
    const request = async (path: string, post = false): Promise<ArchiveStatus> => {
      const response = await apiFetch(path, {method: post ? 'POST' : 'GET',
        headers: post ? {'X-Observatoire-Sync': '1'} : undefined,
        signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(hosted ? 65000 : 8000)])});
      if (!response.ok && !(post && response.status === 409)) throw new Error('Archives indisponibles');
      return readStatus(await response.json());
    };
    const schedule = (delay: number) => { if (!lifetime.signal.aborted) timer = setTimeout(() => void refresh.current?.(), delay); };
    const resume = (delay: number) => {
      busy = false;
      if (lifetime.signal.aborted) return;
      if (queued !== null) { const forced = queued; queued = null; void start.current?.(forced); }
      else schedule(delay);
    };
    const accept = async (next: ArchiveStatus, observed = false) => {
      if (lifetime.signal.aborted) return;
      setStatus(next); setError('');
      if ((wasRunning || observed) && !next.running) await updated.current();
      wasRunning = next.running;
    };
    refresh.current = async () => {
      if (busy || lifetime.signal.aborted) return;
      busy = true; clearTimeout(timer);
      let delay = 10000;
      try {
        let next = await request('/api/sync');
        const observed = next.running;
        if (hosted && next.running) next = await request('/api/sync/step', true);
        await accept(next, observed); delay = next.running ? 2000 : 30000;
      } catch {
        if (!lifetime.signal.aborted) setError(hosted ? 'Connexion aux archives interrompue. Nouvelle tentative automatique ; les archives sont conservées.'
          : 'Le serveur local est indisponible. Relancez-le pour accéder aux archives et à la synchronisation.');
      } finally { resume(delay); }
    };
    start.current = async (forced: boolean) => {
      if (lifetime.signal.aborted) return;
      if (busy) { queued = forced; setStarting(true); return; }
      busy = true; clearTimeout(timer); setStarting(true); setError('');
      try { await accept(await request(`/api/sync${forced ? '?force=1' : ''}`, true)); }
      catch { if (!lifetime.signal.aborted) setError('Impossible de démarrer la mise à jour. Les données affichées sont conservées.'); }
      finally { if (!lifetime.signal.aborted) setStarting(false); resume(1000); }
    };
    void refresh.current();
    return () => { lifetime.abort(); clearTimeout(timer); };
  }, []);
  return {status, error, starting, force, setForce, running: starting || (!!status?.running && !error), start: () => start.current?.(force)};
}
