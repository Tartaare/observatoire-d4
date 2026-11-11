import {useCallback, useEffect, useState} from 'react';
import {restoreNavigation, saveNavigation} from '../navigation.js';
import {cellState, dateLabel, type Navigation, type SeasonData} from './model';

export function useNavigation(data: SeasonData) {
  const [state, setState] = useState<Navigation>(() => restoreNavigation(data));
  const [playing, setPlaying] = useState(false);
  const [announcement, announce] = useState('');
  useEffect(() => { saveNavigation(data, {...state, timer: null}); }, [data, state]);
  const setDay = useCallback((day: number) => {
    setState(current => {
      const next = Math.max(0, Math.min(day, data.dates.length - 1));
      return {...current, day: next, selected: current.selected && current.selected.day <= next ? current.selected : null};
    });
  }, [data.dates.length]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setState(current => {
      const day = Math.min(current.day + 1, data.lastPlayed);
      return {...current, day};
    }), 780);
    const visibility = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [playing, data.lastPlayed]);
  useEffect(() => {
    if (playing && state.day >= data.lastPlayed) {
      setPlaying(false); announce(`Lecture terminée à la journée ${data.lastPlayed + 1}`);
    }
  }, [state.day, playing, data.lastPlayed]);
  const navigate = (day: number) => {
    const bounded = Math.max(0, Math.min(day, data.dates.length - 1));
    setPlaying(false); setDay(bounded); announce(`Journée ${bounded + 1}, ${dateLabel(data.dates[bounded], true)}`);
  };
  const togglePlay = () => {
    if (!playing && state.day >= data.lastPlayed) setDay(0);
    setPlaying(current => !current);
  };
  const select = (selected: Navigation['selected']) => {
    setPlaying(false); setState(current => ({...current, selected}));
    announce(selected ? cellState(data, state, selected.team, selected.day).label : 'Détail fermé.');
  };
  const pool = (value: Navigation['pool']) => {
    setPlaying(false); setState(current => ({...current, pool: value, day: Math.max(0, data.lastPlayed), selected: null}));
    announce(`Poule ${value.toUpperCase()}, ${data.clubs[value].length} équipes.`);
  };
  const sort = (value: Navigation['sort']) => { setPlaying(false); setState(current => ({...current, sort: value})); };
  return {state, playing, announcement, navigate, togglePlay, select, pool, sort};
}
