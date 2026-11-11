import {useEffect, useState} from 'react';
import {clubLogos} from '../club-logos.js';
import {importClubImage, LOGOS_EVENT, LOGOS_KEY, readCustomLogos, saveCustomLogo} from '../custom-logos.js';
import {Button} from './ui/button';
import {NativeSelect} from './ui/primitives';

export function ClubLogoSettings() {
  const [id, setId] = useState(clubLogos[0].id);
  const [logos, setLogos] = useState(readCustomLogos);
  // undefined : aucun changement ; null : restauration en attente de validation.
  const [draft, setDraft] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const club = clubLogos.find(club => club.id === id)!;
  useEffect(() => {
    const update = () => setLogos(readCustomLogos());
    const storage = (event: StorageEvent) => { if (event.key === LOGOS_KEY || event.key === null) update(); };
    window.addEventListener(LOGOS_EVENT, update);
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener(LOGOS_EVENT, update); window.removeEventListener('storage', storage); };
  }, []);

  async function upload(file: File) {
    setBusy(true); setError(''); setMessage('Préparation de l’image…');
    try {
      const image = await importClubImage(file);
      setDraft(image);
      setMessage('Aperçu prêt. Enregistrez le logo pour l’appliquer dans toute l’application.');
    } catch (error) {
      setMessage(''); setError(error instanceof Error ? error.message : 'Import impossible.');
    } finally { setBusy(false); }
  }

  return <details className="od-logo-settings">
    <summary>Logos des clubs</summary>
    <p className="od-palette-hint" id="od-logo-help">Importez un PNG transparent, JPEG ou WebP (2 Mo maximum), puis validez avec « Enregistrer le logo ». Les logos restent dans ce navigateur et sont partagés par les équipes du même club.</p>
    <label htmlFor="od-logo-club">Club à personnaliser</label>
    <NativeSelect id="od-logo-club" value={id} disabled={busy} onChange={event => {
      setId(event.target.value); setDraft(undefined); setMessage(''); setError('');
    }}>{clubLogos.map(club => <option key={club.id} value={club.id}>{club.name.replace(/\s+\d+$/, '')}</option>)}</NativeSelect>
    <div className="od-logo-editor" aria-busy={busy}>
      <div className="od-logo-preview"><img src={(draft === undefined ? logos[id] : draft) ?? `./assets/clubs/BC${id}.jpg`} alt={`Aperçu du logo de ${club.name}`} /></div>
      <div className="od-logo-actions">
        <label htmlFor="od-logo-file">Importer une image</label>
        <input id="od-logo-file" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy}
          aria-describedby="od-logo-help" onChange={event => {
            const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
            if (file) void upload(file);
          }} />
        <Button variant="outline" disabled={busy || !logos[id]} onClick={() => {
          setError(''); setDraft(null);
          setMessage('Logo d’origine en aperçu. Enregistrez pour confirmer la restauration.');
        }}>Restaurer le logo d’origine</Button>
        <Button disabled={busy || draft === undefined} onClick={() => {
          if (draft === undefined) return;
          setError('');
          try {
            saveCustomLogo(id, draft); setDraft(undefined);
            setMessage(`Logo de ${club.name} enregistré et appliqué dans toute l’application.`);
          } catch (error) { setMessage(''); setError(error instanceof Error ? error.message : 'Enregistrement impossible.'); }
        }}>Enregistrer le logo</Button>
        {draft !== undefined && <Button variant="ghost" disabled={busy} onClick={() => {
          setDraft(undefined); setError(''); setMessage('Changement annulé. Le logo enregistré est conservé.');
        }}>Annuler le changement</Button>}
      </div>
    </div>
    <p role="status">{message}</p><p role="alert">{error}</p>
  </details>;
}
