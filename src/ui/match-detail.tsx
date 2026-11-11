import {useEffect, useState} from 'react';
import {ExternalLink, FileText, ShieldCheck, X} from 'lucide-react';
import {Accordion, AccordionItem, AccordionTrigger, AccordionContent} from '../appearance/ui/accordion';
import {Button} from '../appearance/ui/button';
import {Alert, Badge, Spinner} from '../appearance/ui/primitives';
import {Timeline, TimelineItem, TimelineDate, TimelineContent} from '../appearance/ui/timeline';
import {createSeason} from '../season.js';
import {apiFetch} from '../session.js';
import {hosted} from '../runtime.js';
import {dateLabel, dayLabel, type Navigation, type SeasonData, type LiveMatch} from './model';

const statuses = {starter: 'Titulaire', entered: 'Entrée en jeu attestée', unverified: 'Remplaçant · participation non attestée'};
type PlayerStatus = keyof typeof statuses;
type Archive = {sheets: {name: string; state: string; players: {name: string; status: PlayerStatus}[]}[]};
function archiveData(value: unknown): Archive {
  if (!value || typeof value !== 'object' || !('sheets' in value) || !Array.isArray(value.sheets)) throw new Error('Archive invalide');
  for (const sheet of value.sheets) {
    if (!sheet || typeof sheet.name !== 'string' || !['published', 'partial', 'missing'].includes(sheet.state) || !Array.isArray(sheet.players)
      || !sheet.players.every((player: {name?: unknown; status?: unknown}) => typeof player.name === 'string'
        && typeof player.status === 'string' && Object.hasOwn(statuses, player.status))) throw new Error('Archive invalide');
  }
  return value as Archive;
}
function ArchiveSheet({url}: {url: string}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Archive | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open || data) return;
    const controller = new AbortController(); setError(false);
    void (async () => {
      try {
        const response = await apiFetch(`/api/sheet?url=${encodeURIComponent(url)}`, {signal: AbortSignal.any([controller.signal, AbortSignal.timeout(hosted ? 30000 : 8000)])});
        if (!response.ok) throw new Error();
        const next = archiveData(await response.json());
        if (!controller.signal.aborted) setData(next);
      } catch { if (!controller.signal.aborted) setError(true); }
    })();
    return () => controller.abort();
  }, [open, data, url]);
  return <details className="od-proof" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><FileText aria-hidden="true" />Composition archivée</summary>
    {open && <div className="od-proof-content" role={!data ? 'status' : undefined}>
      {error ? 'Lecture impossible. Fermez puis rouvrez ce détail pour réessayer.' : !data ? <span className="od-inline"><Spinner />Lecture de l’archive…</span>
        : data.sheets.map((sheet, index) => <section key={index}><h5>{sheet.name} · {sheet.state === 'published' ? 'Composition publiée' : sheet.state === 'partial' ? 'Composition partielle' : 'Composition manquante'}</h5>
          <ul>{sheet.players.map((player, row) => <li key={row}>{player.name} · {statuses[player.status]}</li>)}</ul></section>)}
    </div>}
  </details>;
}
function SourceLink({url, children}: {url: string; children: React.ReactNode}) {
  return <a className="od-source-link" href={url} target="_blank" rel="noopener noreferrer">{children}<ExternalLink aria-hidden="true" /></a>;
}
function RealRoster({match}: {match: LiveMatch}) {
  return <Accordion type="multiple" className="od-roster">{match.roster.map((player, index) => <AccordionItem value={String(index)} key={index}>
    <AccordionTrigger><span className="od-player-identity"><strong>{player.name}</strong><span className="od-player-status">{statuses[player.status]}</span></span>
      {player.history.length > 0 && player.status !== 'unverified' && <Badge className="od-badge-accent">À confirmer</Badge>}</AccordionTrigger>
    <AccordionContent>
      {(player.entry || player.exit) && <p className="od-movement">{[player.entry && `Entrée ${player.entry}′`, player.exit && `Sortie ${player.exit}′`].filter(Boolean).join(' · ')}</p>}
      {player.history.length ? <Timeline aria-label={`Antécédents de ${player.name}`}>{player.history.map(item => <TimelineItem key={item.sourceURL}>
        <TimelineDate dateTime={item.date}>{dateLabel(item.date)}<Badge>{item.division}</Badge></TimelineDate>
        <TimelineContent><strong>{item.team}</strong><span className="od-same-club"><ShieldCheck aria-hidden="true" />Même club</span>
          <ArchiveSheet url={item.sourceURL} /><SourceLink url={item.sourceURL}>Source en ligne</SourceLink></TimelineContent>
      </TimelineItem>)}</Timeline> : <p className="od-no-history">Aucune correspondance antérieure dans les feuilles archivées.</p>}
    </AccordionContent>
  </AccordionItem>)}</Accordion>;
}
export function MatchDetail({data, state, close}: {data: SeasonData; state: Navigation; close: () => void}) {
  const selected = state.selected!;
  const match = data.mode === 'live' ? data.matches![`${state.pool}:${selected.team}:${selected.day}`] : null;
  const demo = match ? null : createSeason(data).matchAt(selected.day, selected.team, state.pool);
  const fixture = match ?? demo!;
  const description = match ? /^Forfait\b/i.test(match.statusLabel) ? `${match.statusLabel}. Aucune participation jouée retenue.`
    : match.sheetState === 'uncollected' ? 'Feuille non encore archivée.' : match.sheetState === 'missing' ? 'Composition non publiée par la source.'
      : match.sheetState === 'partial' ? 'Composition partielle : le total reste inconnu.' : `${match.count} repérage${match.count === 1 ? '' : 's'} à confirmer parmi les participations attestées.`
    : fixture.count === null ? 'Composition indisponible pour cette équipe.' : fixture.count === 0 ? 'Aucun antécédent en division supérieure dans cet exemple.'
      : `${fixture.count} joueur(s) repéré(s) · ${data.clubs[state.pool][selected.team][0]}`;
  return <section className="od-match-panel" aria-labelledby="od-match-title" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
    <div className="od-match-heading"><div><p className="od-match-kicker">{dayLabel(selected.day)} · {dateLabel(match ? match.matchDate : data.dates[selected.day], true)}
      <span> / {match ? hosted ? 'ARCHIVE EN LIGNE' : 'ARCHIVE LOCALE' : fixture.realSheet ? 'EXEMPLE DOCUMENTÉ' : 'SIMULATION'}</span></p>
      <h3 id="od-match-title">{fixture.home}<span className="od-match-score">{fixture.score}</span>{fixture.away}</h3><p>{description}</p></div>
      <Button variant="ghost" size="icon" data-close aria-label="Fermer le détail" onClick={close}><X aria-hidden="true" /></Button></div>
    {match && <><Alert className="od-evidence-note">Noms abrégés : une correspondance ne certifie pas l’identité. Les feuilles manquantes peuvent masquer des antécédents.</Alert>
      {match.retained && <Alert>La dernière lecture était incomplète. La composition précédente est conservée.</Alert>}
      <RealRoster match={match} /><SourceLink url={match.sourceURL}>Feuille source en ligne</SourceLink></>}
    {demo && <><Accordion type="multiple" className="od-roster">{demo.players.map(([name, status, history], index) => <AccordionItem key={index} value={String(index)}>
      <AccordionTrigger><span className="od-player-identity"><strong>{name}</strong><span className="od-player-status">{status}</span></span>
        {[...new Set(history.map(item => item[1]))].map(level => <Badge key={level}>{level}</Badge>)}</AccordionTrigger>
      <AccordionContent><p className="od-movement">{dateLabel(data.dates[selected.day])} · D4 · {status}</p><Timeline>{history.map(([date, level, context], i) => <TimelineItem key={i}>
        <TimelineDate>{date}<Badge>{level}</Badge></TimelineDate><TimelineContent><strong>{context}</strong>
          {demo.realSheet && data.exampleSources[`${date}|${level}`] && <SourceLink url={data.exampleSources[`${date}|${level}`]}>Composition</SourceLink>}</TimelineContent></TimelineItem>)}</Timeline></AccordionContent>
    </AccordionItem>)}</Accordion>{demo.featured && <SourceLink url={data.exampleURL}>Feuille du match FFF</SourceLink>}</>}
  </section>;
}
