import {Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import {ChevronLeft, ChevronRight, Pause, Play} from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import {Button} from '../appearance/ui/button';
import {Badge, Hint, NativeSelect} from '../appearance/ui/primitives';
import {Frame, FrameHeader, FramePanel, FrameFooter} from '../appearance/ui/frame';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '../appearance/ui/table';
import {clubLogoURL} from '../club-logos.js';
import {LOGOS_EVENT, LOGOS_KEY, readCustomLogos} from '../custom-logos.js';
import {createSeason} from '../season.js';
import {MatchDetail} from './match-detail';
import {cellState, dateLabel, dayLabel, teamOrder, type SeasonData} from './model';
import {useNavigation} from './use-navigation';

function ClubBadge({name, initials, logos}: {name: string; initials: string; logos: Record<string, string>}) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = clubLogoURL(name, logos);
  return <span className="od-crest" data-club-name={name} aria-hidden="true">
    <span className="od-monogram">{initials}</span>{url && failed !== url && <img src={url} alt="" width="28" height="28" decoding="async" onError={() => setFailed(url)} />}
  </span>;
}
export function SeasonBoard({data}: {data: SeasonData}) {
  const nav = useNavigation(data);
  const {state} = nav;
  const scroll = useRef<HTMLDivElement>(null);
  const keyboardOpen = useRef(false);
  const [revision, setRevision] = useState(0);
  const logos = useMemo(() => readCustomLogos(), [revision]);
  const season = useMemo(() => createSeason(data), [data]);
  const teams = data.clubs[state.pool];
  useEffect(() => {
    const changed = () => setRevision(value => value + 1);
    const storage = (event: StorageEvent) => { if (event.key === LOGOS_KEY || event.key === null) changed(); };
    window.addEventListener(LOGOS_EVENT, changed); window.addEventListener('storage', storage);
    return () => { window.removeEventListener(LOGOS_EVENT, changed); window.removeEventListener('storage', storage); };
  }, []);
  useLayoutEffect(() => {
    const element = scroll.current;
    if (!element) return;
    const resize = new ResizeObserver(() => element.style.setProperty('--od-view', `${element.clientWidth}px`));
    resize.observe(element);
    return () => resize.disconnect();
  }, []);
  useLayoutEffect(() => {
    const element = scroll.current;
    const column = element?.querySelector<HTMLElement>(`thead [data-column="${state.day}"]`);
    if (!element || !column) return;
    const bounds = element.getBoundingClientRect(), position = column.getBoundingClientRect();
    const sticky = element.querySelector<HTMLElement>('.od-team')?.offsetWidth ?? 0;
    const delta = position.right > bounds.right ? position.right - bounds.right : position.left < bounds.left + sticky ? position.left - bounds.left - sticky : 0;
    if (delta) element.scrollBy({left: delta, behavior: 'instant'});
  }, [state.day, state.pool]);
  useEffect(() => {
    if (state.selected && keyboardOpen.current) scroll.current?.querySelector<HTMLButtonElement>('[data-close]')?.focus({preventScroll: true});
    keyboardOpen.current = false;
  }, [state.selected]);
  const close = () => {
    const selected = state.selected;
    nav.select(null);
    if (selected) requestAnimationFrame(() => scroll.current?.querySelector<HTMLButtonElement>(`[data-team="${selected.team}"][data-day="${selected.day}"]`)?.focus({preventScroll: true}));
  };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && state.selected && !document.querySelector('[role="dialog"]')) close();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  });
  return <div data-content className="od-season" style={{'--od-rounds': data.dates.length, '--od-team-count': Math.max(1, teams.length)} as CSSProperties}>
    <div className="od-season-toolbar"><div className="od-season-heading"><p className="od-eyebrow">DISTRICT 4 DU LOT <span>/</span> SAISON {data.seasonStart ? `${data.seasonStart}–${data.seasonStart + 1}` : '2026–2027'}</p>
      <h1>Les équipes, au fil des journées</h1>{data.mode !== 'live' && <Badge className="od-badge-accent" data-demo-label>Démonstration</Badge>}</div>
      <div className="od-selects"><label htmlFor="od-pool">Poule<NativeSelect id="od-pool" data-pool value={state.pool} onChange={event => nav.pool(event.target.value as 'a' | 'b')}>
        <option value="a">Poule A</option><option value="b">Poule B</option></NativeSelect></label>
      <label htmlFor="od-sort">Trier les équipes<NativeSelect id="od-sort" data-sort value={state.sort} onChange={event => nav.sort(event.target.value as typeof state.sort)}>
        <option value="rank">Classement</option><option value="name">Nom (A–Z)</option><option value="total">Apparitions cumulées</option></NativeSelect></label></div>
    </div>
    <Frame className="od-board" role="region" aria-labelledby="od-matrix-title"><FrameHeader className="od-board-head"><div className="od-board-title"><h2 id="od-matrix-title">Équipes par journée</h2><Badge>{teams.length} équipes</Badge></div>
      <div className="od-legend" aria-label="Nombre de repérages connus, de 0 à 5 et plus"><span>{data.mode === 'live' ? 'Repérages connus' : 'Repérages'}</span><span className="od-scale">{[0, 1, 2, 3, 4, 5].map(tone => <b data-tone={tone} key={tone}>{tone === 5 ? '5+' : tone}</b>)}</span></div></FrameHeader>
      <FramePanel className="od-scroll" ref={scroll}><Table><caption className="od-sr">Repérages de noms en division supérieure à confirmer, par équipe et par journée de D4</caption>
        <TableHeader><TableRow><TableHead scope="col" className="od-team">Équipe</TableHead>{data.dates.map((date, day) => <TableHead scope="col" data-column={day} className={day === state.day ? 'od-active' : ''} key={day}>
          <button type="button" className="od-day-button" data-jump={day} aria-pressed={day === state.day} onClick={() => nav.navigate(day)}>{dayLabel(day)}<span>{dateLabel(date)}</span></button>
        </TableHead>)}</TableRow></TableHeader>
        <TableBody>{teamOrder(data, state).map(team => <Fragment key={team}><TableRow data-row={team}><TableHead scope="row" className="od-team"><div className="od-club"><span className="od-rank" aria-label={`Rang ${team + 1}`}>{String(team + 1).padStart(2, '0')}</span>
          <ClubBadge key={`${teams[team][0]}:${revision}`} name={teams[team][0]} initials={teams[team][1]} logos={logos} /><span>{teams[team][0]}</span></div></TableHead>
          {data.dates.map((_, day) => { const cell = cellState(data, state, team, day, season); const picked = state.selected?.team === team && state.selected.day === day;
            return <TableCell key={day} data-column={day} className={day === state.day ? 'od-active' : ''}><button type="button" data-team={team} data-day={day}
              className={`od-cell${cell.missing ? ' od-missing' : ''}${cell.disabled ? ' od-empty' : ''}${picked ? ' od-picked' : ''}`} data-tone={cell.tone}
              aria-label={cell.label} title={cell.disabled ? undefined : cell.label} disabled={cell.disabled} aria-expanded={picked} aria-controls={picked ? 'od-match-title' : undefined}
              onClick={event => { if (picked) close(); else { keyboardOpen.current = event.detail === 0; nav.select({team, day}); } }}>
              {cell.value}{cell.result && <span className="od-result" aria-hidden="true">{cell.result.code}</span>}</button></TableCell>; })}</TableRow>
          {state.selected?.team === team && <TableRow className="od-detail-row"><TableCell colSpan={data.dates.length + 1}><MatchDetail key={`${state.pool}:${team}:${state.selected.day}:${state.sort}`} data={data} state={state} close={close} /></TableCell></TableRow>}
        </Fragment>)}</TableBody>
      </Table></FramePanel>
      <FrameFooter className="od-board-foot"><span><b className="od-missing">?</b> Feuille absente ou incomplète</span><span><b>—</b> À venir / non joué</span><span><b>·</b> Après le curseur</span><span className="od-results-legend">V · Victoire / N · Nul / D · Défaite / F · Forfait</span></FrameFooter>
    </Frame>
    <section className="od-replay" aria-label="Lecture de la saison"><div className="od-replay-top"><div className="od-transport">
      <Button data-play aria-pressed={nav.playing} disabled={data.lastPlayed < 1} onClick={nav.togglePlay}>{nav.playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}<span>{nav.playing ? 'Pause' : 'Lecture'}</span></Button>
      <div className="od-button-group"><Hint label="Journée précédente" disabled={state.day === 0}><Button variant="outline" size="icon" data-prev aria-label="Journée précédente" disabled={state.day === 0} onClick={() => nav.navigate(state.day - 1)}><ChevronLeft aria-hidden="true" /></Button></Hint>
        <Hint label="Journée suivante" disabled={state.day === data.dates.length - 1}><Button variant="outline" size="icon" data-next aria-label="Journée suivante" disabled={state.day === data.dates.length - 1} onClick={() => nav.navigate(state.day + 1)}><ChevronRight aria-hidden="true" /></Button></Hint></div></div>
      <p className="od-current"><strong>Journée {state.day + 1}</strong><span>·</span>{dateLabel(data.dates[state.day], true)}</p></div>
      <div className="od-timeline"><Slider.Root className="od-slider" value={[state.day]} min={0} max={data.dates.length - 1} step={1} onValueChange={([day]) => nav.navigate(day)}>
        <Slider.Track className="od-slider-track"><Slider.Range className="od-slider-range" /><span className="od-round-segments" aria-hidden="true">{data.dates.map((_, day) => <span key={day}
          data-phase={day === state.day ? 'current' : day < state.day && day <= data.lastPlayed ? 'reached' : day <= data.lastPlayed ? 'known' : 'future'} />)}</span></Slider.Track><Slider.Thumb className="od-slider-thumb" aria-label="Journée affichée" aria-valuetext={`Journée ${state.day + 1}, ${dateLabel(data.dates[state.day], true)}`} /></Slider.Root>
        <div className="od-ticks" aria-hidden="true">{[0, Math.floor((data.dates.length - 1) / 2), data.dates.length - 1].map(day => <span key={day}>{dayLabel(day)}</span>)}</div></div>
    </section><span className="od-sr" aria-live="polite">{nav.announcement}</span>
  </div>;
}
