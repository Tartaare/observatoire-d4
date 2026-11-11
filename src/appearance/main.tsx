import {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Check, Monitor, Moon, RotateCcw, Settings2, Sun} from 'lucide-react';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose} from './ui/dialog';
import {applyAppearance, DEFAULT_APPEARANCE, normalizeHex, paletteError, readAppearance,
  resolveTheme, saveAppearance, STORAGE_KEY} from './theme.js';
import type {Appearance, Palette, ThemeMode} from './theme.js';
import {ClubLogoSettings} from './club-logo-settings';

const colorFields: {key: keyof Palette; label: string; description: string}[] = [
  {key: 'dark', label: 'Couleur sombre', description: 'Fonds sombres et textes du mode clair'},
  {key: 'light', label: 'Couleur claire', description: 'Fonds clairs et textes du mode sombre'},
  {key: 'accent', label: 'Couleur d’accent', description: 'Actions, sélections et nuances de la matrice'},
];
const modes: {value: ThemeMode; label: string; icon: typeof Sun}[] = [
  {value: 'light', label: 'Clair', icon: Sun},
  {value: 'dark', label: 'Sombre', icon: Moon},
  {value: 'system', label: 'Système', icon: Monitor},
];

function AppearanceControls() {
  const [appearance, setAppearance] = useState<Appearance>(readAppearance);
  const [draft, setDraft] = useState<Palette>(appearance.palette);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const [notice, setNotice] = useState('Les modifications sont appliquées immédiatement.');
  const [saved, setSaved] = useState(true);
  const error = paletteError(draft);
  const resolved = resolveTheme(appearance.theme, systemDark);

  useEffect(() => { applyAppearance(appearance); }, [appearance, systemDark]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const followSystem = () => setSystemDark(media.matches);
    const followStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const next = readAppearance();
      setAppearance(next);
      setDraft(next.palette);
      setSaved(true);
      setNotice('Préférences actualisées depuis un autre onglet.');
    };
    media.addEventListener('change', followSystem);
    window.addEventListener('storage', followStorage);
    return () => {
      media.removeEventListener('change', followSystem);
      window.removeEventListener('storage', followStorage);
    };
  }, []);

  function update(next: Appearance) {
    setAppearance(next);
    const persisted = saveAppearance(next);
    setSaved(persisted);
    setNotice(persisted ? 'Préférences enregistrées dans ce navigateur !'
      : 'Appliqué pour cette session. Le stockage du navigateur est indisponible.');
  }

  function updateColor(key: keyof Palette, value: string) {
    const next = {...draft, [key]: value};
    setDraft(next);
    if (paletteError(next)) return;
    const palette = Object.fromEntries(Object.entries(next).map(([name, hex]) => [name, normalizeHex(hex)!])) as Palette;
    update({...appearance, palette});
  }

  function reset() {
    const defaults = structuredClone(DEFAULT_APPEARANCE);
    setDraft(defaults.palette);
    update(defaults);
  }

  return <div className="od-appearance od-appearance-controls">
    <Button variant="ghost" size="icon" className="od-theme-toggle" aria-pressed={resolved === 'dark'}
      aria-label={resolved === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
      title={resolved === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
      onClick={() => update({...appearance, theme: resolved === 'dark' ? 'light' : 'dark'})}>
      {resolved === 'dark' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
    </Button>
    <Dialog onOpenChange={open => { if (open) setDraft(appearance.palette); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="od-settings-trigger" aria-label="Paramètres d’apparence">
          <Settings2 aria-hidden="true" /><span className="od-settings-label">Paramètres</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <span className="od-settings-kicker">VOTRE ESPACE DE LECTURE</span>
          <DialogTitle>Apparence</DialogTitle>
          <DialogDescription>Une base sobre. Un accent à votre image.</DialogDescription>
        </DialogHeader>
        <fieldset className="od-theme-fieldset">
          <legend>Mode d’affichage</legend>
          <div className="od-theme-options">
            {modes.map(({value, label, icon: Icon}) => <label key={value} className="od-theme-choice">
              <input type="radio" name="appearance-theme" value={value} checked={appearance.theme === value}
                onChange={() => update({...appearance, theme: value})} />
              <span><Icon aria-hidden="true" />{label}</span>
            </label>)}
          </div>
        </fieldset>
        <form className="od-palette-form" noValidate onSubmit={event => event.preventDefault()}>
          <fieldset>
            <legend>Palette personnelle</legend>
            <p className="od-palette-hint">Trois couleurs, toutes les nuances. Les textes s’ajustent pour rester lisibles.</p>
            <div className="od-color-fields">
              {colorFields.map(({key, label, description}) => {
                const invalid = !normalizeHex(draft[key]) || !!error && key !== 'accent';
                return <div className="od-color-row" key={key}>
                  <div className="od-color-description">
                    <label htmlFor={`od-color-${key}`}>{label}</label>
                    <p id={`od-color-${key}-description`}>{description}</p>
                  </div>
                  <div className="od-color-inputs">
                    <Input type="color" className="od-color-picker" value={normalizeHex(draft[key]) ?? appearance.palette[key]}
                      aria-label={`Choisir : ${label.toLocaleLowerCase('fr')}`} aria-describedby={`od-color-${key}-description`}
                      onChange={event => updateColor(key, event.target.value)} />
                    <Input id={`od-color-${key}`} className="od-hex-input" value={draft[key]} maxLength={7}
                      autoComplete="off" spellCheck={false} aria-invalid={invalid}
                      aria-describedby={`od-color-${key}-description${invalid ? ' od-palette-error' : ''}`}
                      onChange={event => updateColor(key, event.target.value)}
                      onBlur={() => {
                        const normalized = normalizeHex(draft[key]);
                        if (normalized) setDraft(current => ({...current, [key]: normalized}));
                      }} />
                  </div>
                </div>;
              })}
            </div>
          </fieldset>
          <p id="od-palette-error" className="od-palette-error" role="alert">{error && `${error} La dernière palette valide reste appliquée.`}</p>
        </form>
        <div className="od-palette-preview" aria-label="Aperçu des nuances de repérage">
          <span>Repérages</span>
          <div>{[0, 1, 2, 3, 4, 5].map(tone => <b key={tone} data-tone={tone}>{tone === 5 ? '5+' : tone}</b>)}</div>
        </div>
        <div className="od-settings-feedback" role="status">
          {saved && <Check aria-hidden="true" />}<span>{notice}</span>
        </div>
        <ClubLogoSettings />
        <div className="od-settings-footer">
          <Button variant="ghost" onClick={reset}><RotateCcw aria-hidden="true" />Réinitialiser</Button>
          <DialogClose asChild><Button>Terminé</Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}

const mount = document.querySelector('[data-appearance-root]');
if (mount) createRoot(mount).render(<AppearanceControls />);
