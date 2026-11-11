import {useCallback, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Activity, ArrowRight, Database, LogOut, RefreshCw, TriangleAlert} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import {AppearanceControls} from '../appearance/main';
import {Button} from '../appearance/ui/button';
import {Alert, Empty, Skeleton, Spinner} from '../appearance/ui/primitives';
import {apiFetch, signOut} from '../session.js';
import {hosted} from '../runtime.js';
import {validateSeason} from '../season.js';
import {ArchiveFooter} from './archive-footer';
import {Login} from './login';
import {SeasonBoard} from './season-board';
import {useSync} from './use-sync';
import type {SeasonData} from './model';

export function Observatory() {
  const [data, setData] = useState<SeasonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const response = await apiFetch('/api/season', {signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(hosted ? 30000 : 8000)]) : AbortSignal.timeout(hosted ? 30000 : 8000)});
      if (!response.ok) throw new Error();
      const next = validateSeason(await response.json());
      if (!signal?.aborted) { setData(next); setVersion(current => current + 1); }
    } catch {
      if (!signal?.aborted) setError(hosted ? 'La saison est indisponible. Vérifiez votre connexion puis réessayez.' : 'La saison est indisponible. Vérifiez le serveur local puis réessayez.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  const sync = useSync(useCallback(() => load(), [load]));
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  return <div className="od-ui"><header className="od-top"><a className="od-brand" href="#od-main" aria-label="Observatoire D4, aller à la consultation"><span className="od-mark"><Activity aria-hidden="true" /></span><span>Observatoire <b>D4</b><small>LE FOOTBALL, FEUILLE APRÈS FEUILLE</small></span></a>
    <div className="od-header-actions"><div className="od-sync-actions" role="group" aria-label="Synchronisation des archives">
      <label className="od-refresh-option"><input type="checkbox" data-sync-force checked={sync.force} disabled={sync.running} onChange={event => sync.setForce(event.target.checked)} />Revérifier toutes les feuilles</label>
      <Button data-sync disabled={sync.running} onClick={() => void sync.start()}>{sync.running ? <Spinner /> : <RefreshCw aria-hidden="true" />}{sync.running ? 'Mise à jour en cours…' : sync.error ? 'Réessayer la mise à jour' : 'Mettre à jour'}</Button></div>
      <div data-appearance-root><AppearanceControls /></div>
      {hosted && <Button variant="ghost" className="od-signout" disabled={leaving} onClick={() => { setLeaving(true); void signOut(); }}><LogOut aria-hidden="true" />Déconnexion</Button>}</div></header>
    <main id="od-main" className="od-main" aria-busy={loading}>
      {error ? <Alert role="alert" className="od-season-error"><TriangleAlert aria-hidden="true" /><div><h1>Impossible de lire la saison</h1><p>{error}</p><Button variant="outline" onClick={() => void load()}>Réessayer<ArrowRight aria-hidden="true" /></Button></div></Alert>
        : loading ? <div className="od-loading" role="status"><span className="od-inline"><Spinner />Chargement de la saison…</span><Skeleton className="od-loading-title" /><Skeleton className="od-loading-table" /></div>
          : data && Object.values(data.clubs).some(teams => teams.length) ? <SeasonBoard key={version} data={data} />
            : <Empty icon={<Database aria-hidden="true" />} title="Aucune équipe disponible pour cette saison."><p>Utilisez « Mettre à jour » pour vérifier les calendriers disponibles.</p></Empty>}
    </main><ArchiveFooter sync={sync} /></div>;
}
function Application() {
  const [authenticated, setAuthenticated] = useState(!hosted);
  const ready = useCallback(() => setAuthenticated(true), []);
  useEffect(() => {
    const expired = () => location.reload();
    window.addEventListener('od-session-expired', expired);
    return () => window.removeEventListener('od-session-expired', expired);
  }, []);
  return <Tooltip.Provider delayDuration={350}>{authenticated ? <Observatory /> : <Login onReady={ready} />}</Tooltip.Provider>;
}
const root = typeof document === 'undefined' ? null : document.getElementById('observatoire-d4');
if (root) createRoot(root).render(<Application />);
