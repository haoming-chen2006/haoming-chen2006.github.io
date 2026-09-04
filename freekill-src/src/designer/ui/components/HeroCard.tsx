/**
 * The general's card, drawn the way the game draws one.
 *
 * Not a form with an image field beside it: a 3:4 portrait with the title above
 * the name, the kingdom badge in the corner and the health beads down the side,
 * because that is what the player is going to see in 选将 and the only honest
 * preview of it is the thing itself. `.general-card img` in `shell/shell.css`
 * is `aspect-ratio: 3 / 4` and this matches it, so a portrait that looks right
 * here is not re-cropped later.
 *
 * The upload is a drop zone and a file picker over one hidden `<input>`, and
 * the file becomes base64 immediately — the create endpoint takes
 * `{mime, base64}`, and holding a `File` instead would mean the portrait could
 * not survive the reload that `localStorage` exists to survive.
 */
import { useRef, useState } from 'react';
import type { Gender, HeroSpec, Kingdom } from '../../spec';
import { KINGDOMS } from '../../spec';
import { imageUrl, readImage } from '../api';
import { GENDER_OPTIONS } from '../labels';
import type { Action, DesignerState } from '../state';
import { KINGDOM_NAMES } from '../state';
import type { Problems } from '../problems';

const HP_MIN = 1;
const HP_MAX = 12;

export interface HeroCardProps {
  state: DesignerState;
  problems: Problems;
  dispatch: (action: Action) => void;
}

export function HeroCard({ state, problems, dispatch }: HeroCardProps) {
  const { spec, image } = state;
  const file = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const patch = (p: Partial<HeroSpec>) => dispatch({ type: 'hero', patch: p });
  const bad = (path: string) => (problems.at(path).length ? ' fk-hd-bad' : '');

  const take = async (picked: File | null | undefined) => {
    if (!picked) return;
    setImageError(null);
    if (!picked.type.startsWith('image/')) {
      setImageError('请选一张图片');
      return;
    }
    try {
      dispatch({ type: 'image', image: await readImage(picked) });
    } catch (cause) {
      setImageError(cause instanceof Error ? cause.message : '读取图片失败');
    }
  };

  return (
    <div className="fk-hd-hero">
      <div
        className={`fk-hd-portrait${over ? ' fk-hd-portrait--over' : ''}`}
        data-kingdom={spec.kingdom}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(e.dataTransfer.files?.[0]);
        }}
      >
        {image ? (
          <img className="fk-hd-portrait__art" src={imageUrl(image)} alt={spec.name || '武将立绘'} />
        ) : (
          <div className="fk-hd-portrait__none">
            <span className="fk-hd-portrait__glyph">將</span>
            <span>把立绘拖到这里</span>
          </div>
        )}

        <div className="fk-hd-portrait__kingdom" data-kingdom={spec.kingdom}>
          {KINGDOM_NAMES[spec.kingdom] ?? '？'}
        </div>

        <div className="fk-hd-portrait__hp" aria-label={`体力 ${spec.hp}`}>
          {Array.from({ length: Math.max(0, Math.min(spec.maxHp ?? spec.hp, HP_MAX)) }, (_, i) => (
            <i key={i} className={i < spec.hp ? 'on' : ''} />
          ))}
        </div>

        <div className="fk-hd-portrait__plate">
          <div className="fk-hd-portrait__title">{spec.title || '未命名称号'}</div>
          <div className="fk-hd-portrait__name">{spec.name || '无名武将'}</div>
        </div>
      </div>

      <div className="fk-hd-portrait__acts">
        <button type="button" className="fk-hd-btn fk-hd-btn--wide" onClick={() => file.current?.click()}>
          {image ? '换一张立绘' : '选择立绘'}
        </button>
        {image ? (
          <button type="button" className="fk-hd-x" onClick={() => dispatch({ type: 'image', image: null })}>
            移除
          </button>
        ) : null}
        <input
          ref={file}
          type="file"
          accept="image/*"
          hidden
          aria-label="武将立绘"
          onChange={(e) => {
            void take(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {imageError ? <p className="fk-hd-err">{imageError}</p> : null}

      <label className="fk-hd-field">
        <span>武将名</span>
        <input
          className={bad('name')}
          value={spec.name}
          placeholder="例如 张春华"
          onChange={(e) => patch({ name: e.target.value })}
        />
      </label>

      <label className="fk-hd-field">
        <span>称号</span>
        <input
          className={bad('title')}
          value={spec.title}
          placeholder="例如 德威兼济"
          onChange={(e) => patch({ title: e.target.value })}
        />
      </label>

      <label className="fk-hd-field">
        <span>编号（英文小写，引擎用）</span>
        <input
          className={bad('id')}
          value={spec.id}
          placeholder="zhang_chunhua"
          onChange={(e) => patch({ id: e.target.value })}
        />
      </label>

      <div className="fk-hd-field">
        <span>势力</span>
        <div className={`fk-hd-kingdoms${bad('kingdom')}`} role="radiogroup" aria-label="势力">
          {KINGDOMS.map((k: Kingdom) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={spec.kingdom === k}
              className="fk-hd-kingdom"
              data-kingdom={k}
              onClick={() => patch({ kingdom: k })}
            >
              {KINGDOM_NAMES[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="fk-hd-field">
        <span>体力</span>
        <div className={`fk-hd-stepper${bad('hp')}`}>
          <button
            type="button"
            aria-label="减少体力"
            disabled={spec.hp <= HP_MIN}
            onClick={() => patch({ hp: Math.max(HP_MIN, spec.hp - 1), maxHp: undefined })}
          >
            −
          </button>
          <output aria-label="体力">{spec.hp}</output>
          <button
            type="button"
            aria-label="增加体力"
            disabled={spec.hp >= HP_MAX}
            onClick={() => patch({ hp: Math.min(HP_MAX, spec.hp + 1), maxHp: undefined })}
          >
            ＋
          </button>
        </div>
      </div>

      <div className="fk-hd-field">
        <span>性别</span>
        <div className="fk-hd-kingdoms" role="radiogroup" aria-label="性别">
          {GENDER_OPTIONS.map((g) => (
            <button
              key={g.value}
              type="button"
              role="radio"
              aria-checked={spec.gender === g.value}
              className="fk-hd-chip"
              onClick={() => patch({ gender: g.value as Gender })}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
