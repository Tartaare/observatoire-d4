import {CircleCheck, Database, Info, TriangleAlert} from 'lucide-react';
import {Badge, Spinner} from '../appearance/ui/primitives';
import {hosted} from '../runtime.js';
import type {useSync} from './use-sync';

export function ArchiveFooter({sync}: {sync: ReturnType<typeof useSync>}) {
  const {status, error, starting, running} = sync;
  const coverage = status?.coverage;
  const last = status?.lastSuccess ? `MAJ ${new Intl.DateTimeFormat('fr-FR', {dateStyle: 'short', timeStyle: 'short'}).format(new Date(status.lastSuccess))}` : 'Aucune mise à jour complète';
  const message = error || (starting ? 'Démarrage de la mise à jour…' : status ? status.running
    ? `${status.phase}${hosted ? ' · Gardez cet onglet ouvert ; reprise à sa réouverture' : ''}` : `${status.phase} · ${last}` : 'Lecture de l’état des archives…');
  return <footer className="od-footer" aria-label="État des archives et méthode">
    <div className="od-sync-info" tabIndex={0} role="region" aria-label="Bilan des archives, défilement horizontal si nécessaire">
      <p data-sync-message role="status" className="od-inline">{error ? <TriangleAlert aria-hidden="true" /> : running ? <Spinner /> : status?.lastSuccess ? <CircleCheck aria-hidden="true" /> : <Database aria-hidden="true" />}{message}</p>
      {running && <progress data-sync-progress aria-label="Avancement de la synchronisation" max={Math.max(1, status?.total ?? 1)} value={status?.total ? status.done : undefined} aria-valuetext={`${status?.done ?? 0} sur ${status?.total ?? 0}`} />}
      {coverage?.expected ? <p className="od-sync-coverage" data-sync-coverage title="Calendrier : rencontres découvertes/attendues. D4 et tous niveaux : compositions complètes/attendues. Noms : entrées publiées sur les feuilles, pas des personnes distinctes.">
        <span>Calendrier <b>{coverage.calendar.discovered}{coverage.calendar.expected === null ? '' : `/${coverage.calendar.expected}`}</b></span>
        <span>D4 <b>{coverage.d4.published}/{coverage.d4.expected}</b></span><span>Tous niveaux <b>{coverage.published}/{coverage.expected}</b></span>
        <span>{coverage.partial} partielles</span><span>{coverage.missing} absentes</span><span>{coverage.uncollected} à récupérer</span><span>{coverage.players} noms</span>
        {!!coverage.retained && <span>{coverage.retained} archives conservées</span>}</p>
        : status && <p className="od-sync-coverage" data-sync-coverage>{hosted ? 'Première utilisation : lancez une mise à jour pour archiver les compositions.' : 'Première utilisation : connectez-vous à Internet puis lancez une mise à jour. Les archives seront ensuite disponibles hors ligne.'}</p>}
    </div>
    <details className="od-method"><summary><Info aria-hidden="true" />Méthode et limites</summary><p data-method-note>Un nom est repéré s’il apparaît dans une participation attestée en D4 et dans une feuille antérieure de championnat supérieur du même club, pendant la même saison. Noms abrégés : identités à confirmer. Les totaux portent sur les feuilles archivées.</p></details>
    {!!status?.errors.length && <details className="od-sync-errors" data-sync-errors><summary><TriangleAlert aria-hidden="true" /><Badge>{status.errors.length}</Badge>Voir les erreurs de collecte</summary>
      <ul data-sync-error-list>{status.errors.map((item, index) => <li key={index}>{item.url} — {item.message}</li>)}</ul></details>}
  </footer>;
}
