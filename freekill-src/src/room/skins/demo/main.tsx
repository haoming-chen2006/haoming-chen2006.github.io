/**
 * The review page for skins. Dev-only: it is not in `vite.config.ts`'s build
 * inputs, so it never ships.
 *
 *     npm run dev   ->   /src/room/skins/demo/index.html
 *
 * It exists to look at a lot of the catalogue at once, which the table cannot
 * do: eight seats show eight generals, and the interesting questions -- how much
 * of the catalogue actually resolves, what a host outage costs, how the tiers
 * differ -- are questions about a hundred of them. It renders real seats --
 * the real `.fk-photo` markup and `room.css`, the real portraits out of
 * `asset-manifest.json` -- with `<SkinLayer>` over them, exactly as `Photo.tsx`
 * would. Switching the mode switches what the seats load, live.
 */
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Assets } from '../../assets/assets.ts';
import { AssetManifestSchema } from '../../../contract/manifest.ts';
import { SkinLayer } from '../SkinLayer.tsx';
import { SKIN_CATALOG, SKIN_HOSTS } from '../catalog.generated.ts';
import { skinHealthSnapshot, skinsFor } from '../loader.ts';
import { SKIN_MODES, type SkinMode } from '../types.ts';
import '../../room.css';

const BASE = import.meta.env.BASE_URL;

function Seat({ general, assets, mode }: { general: string; assets: Assets; mode: SkinMode }) {
  const art = assets.generalPortrait(general, 'mobile') ?? assets.generalPortrait(general, 'standard');
  const skins = skinsFor(general);
  return (
    <figure style={{ margin: 0, width: 150 }}>
      <div className="fk-photo" style={{ position: 'relative', width: 150, height: 200 }}>
        {art ? (
          <img className="fk-photo__art" src={art} alt="" draggable={false} />
        ) : (
          <div className="fk-photo__art fk-photo__art--none">{general.slice(0, 1)}</div>
        )}
        {/* The entire integration, in one element. */}
        <SkinLayer general={general} mode={mode} className="fk-photo__art" />
        <div className="fk-photo__scrim" />
      </div>
      <figcaption style={{ fontSize: 12, color: '#8b8073', paddingTop: 4 }}>
        {general}
        <br />
        {skins.filter((s) => s.kind === 'image').length} still · {skins.filter((s) => s.kind === 'video').length} video
      </figcaption>
    </figure>
  );
}

function App() {
  const [assets, setAssets] = useState<Assets | undefined>();
  const [mode, setMode] = useState<SkinMode>('all');
  const [health, setHealth] = useState(skinHealthSnapshot());

  useEffect(() => {
    fetch(`${BASE}asset-manifest.json`)
      .then((r) => r.json())
      .then((j) => setAssets(new Assets(AssetManifestSchema.parse(j))))
      .catch((e) => console.error('no asset manifest — run `npm run build:assets`', e));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setHealth(skinHealthSnapshot()), 1000);
    return () => clearInterval(t);
  }, []);

  /**
   * Video-first, so the animated tier is what you see first, and capped by
   * default.
   *
   * The cap is not cosmetic. A real table is at most eight seats; rendering all
   * 110 at once puts ~220 requests behind the browser's six-connections-per-host
   * limit, and what you then measure is the queue rather than the feature. That
   * stress case is worth having -- it is how the circuit-breaker false positive
   * was found -- but it is not the default view. `?n=all` for the full wall.
   */
  const generals = useMemo(() => {
    const names = Object.keys(SKIN_CATALOG);
    const video = names.filter((g) => SKIN_CATALOG[g].some((s) => s.url.endsWith('.mp4')));
    const still = names.filter((g) => SKIN_CATALOG[g].every((s) => s.url.endsWith('.jpg')));
    const ordered = [...video, ...still];
    const n = new URLSearchParams(location.search).get('n');
    if (n === 'all') return ordered;
    return ordered.slice(0, Number(n) || 8);
  }, []);

  if (!assets) return <p style={{ padding: 24 }}>loading asset manifest…</p>;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 500 }}>Skins — review page</h1>
      <p style={{ color: '#8b8073', maxWidth: 720 }}>
        Showing {generals.length} of {Object.keys(SKIN_CATALOG).length} generals that carry alternate artwork, from{' '}
        {SKIN_HOSTS.join(' and ')} (<code>?n=all</code> for every one, <code>?n=24</code> for a count). Every seat
        draws its normal portrait first; the skin is an overlay that fades in only once it has decoded, so a slow or
        dead host leaves the default portrait exactly as it is.
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '16px 0' }}>
        {SKIN_MODES.map((m) => (
          <label key={m} style={{ cursor: 'pointer' }}>
            <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} /> {m}
          </label>
        ))}
        <span style={{ color: '#8b8073', marginLeft: 16 }}>
          failed URLs: {health.deadUrls} · host failures:{' '}
          {Object.entries(health.hosts).map(([h, n]) => `${h}=${n}`).join(', ') || 'none'} · proven:{' '}
          {health.proven.join(', ') || 'none'}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {generals.map((g) => (
          <Seat key={g} general={g} assets={assets} mode={mode} />
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
