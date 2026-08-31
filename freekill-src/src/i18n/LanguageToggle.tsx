/**
 * The 中文 / English switch.
 *
 * Self-contained on purpose: it carries its own styles in a `<style>` tag keyed
 * to a unique class prefix, so dropping it into `src/shell/App.tsx`'s header is
 * a one-line change and needs no edit to `shell.css`. It reads and writes the
 * module store in `./LanguageProvider`, so nothing has to thread a prop.
 *
 *   import { LanguageToggle } from '../i18n';
 *   <header className="topbar"> … <LanguageToggle /> </header>
 *
 * `position="fixed"` parks it in the top-right corner of the viewport instead,
 * for surfaces with no header of their own — the boot screen, the room.
 *
 * The colours are the shell's own custom properties with a literal fallback, so
 * it looks native inside the app and still legible on a bare page.
 */
import { LANGUAGES, LANGUAGE_LABELS, type Language } from './types';
import { useLanguageState } from './LanguageProvider';

const CSS = `
.fk-lang {
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  border: 1px solid var(--line, #3a332c);
  border-radius: 999px;
  overflow: hidden;
  background: var(--ink-2, #1c1815);
  font-size: 12px;
  line-height: 1;
  user-select: none;
}
.fk-lang--fixed {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 60;
}
.fk-lang__btn {
  appearance: none;
  border: 0;
  margin: 0;
  padding: 6px 12px;
  background: transparent;
  color: var(--paper-faint, #8b8073);
  font: inherit;
  font-family: inherit;
  letter-spacing: 1px;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}
.fk-lang__btn:hover { color: var(--paper, #e8e0d4); }
.fk-lang__btn[aria-pressed='true'] {
  background: var(--gold, #d9c9a3);
  color: var(--ink, #14110f);
}
.fk-lang__btn:focus-visible {
  outline: 2px solid var(--gold, #d9c9a3);
  outline-offset: -2px;
}
@media (max-width: 480px) {
  .fk-lang__btn { padding: 6px 9px; }
}
`;

export interface LanguageToggleProps {
  /** `inline` sits in a header row; `fixed` parks in the viewport's top corner. */
  readonly position?: 'inline' | 'fixed';
  readonly className?: string;
}

export function LanguageToggle({ position = 'inline', className }: LanguageToggleProps) {
  const [lang, setLang] = useLanguageState();
  const classes = ['fk-lang', position === 'fixed' ? 'fk-lang--fixed' : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {/* React 19 hoists a keyed <style> into <head> and dedupes it, so two
          toggles on one page (header + fixed) do not ship the CSS twice. */}
      <style href="fk-language-toggle" precedence="default">{CSS}</style>
      <div className={classes} role="group" aria-label="Language / 语言">
        {LANGUAGES.map((l: Language) => (
          <button
            key={l}
            type="button"
            className="fk-lang__btn"
            lang={LANGUAGE_LABELS[l].htmlLang}
            aria-pressed={lang === l}
            onClick={() => setLang(l)}
          >
            {LANGUAGE_LABELS[l].native}
          </button>
        ))}
      </div>
    </>
  );
}
