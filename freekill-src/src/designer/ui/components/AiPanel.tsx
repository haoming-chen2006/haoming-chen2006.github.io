/**
 * 「AI 设计」 — describe the general, and watch the agent try.
 *
 * Two decisions matter here.
 *
 * FIRST: a spec that comes back is LOADED INTO THE CANVAS, not held here. The
 * blocks stay the single source of truth, so what the player sees after the
 * agent replies is the same editable stack they would have built by hand, and
 * the next 创建武将 sends what is on screen. A panel that kept its own copy
 * would have two drafts and a "which one is real" question that a player should
 * never have to ask — and every AI-then-tweak flow would silently discard the
 * tweak.
 *
 * SECOND: the attempts are shown, in full. The agent revises itself — a spec,
 * the validator's complaints, the game's own test log, then another spec — and
 * a spinner that hides that turns a legible process into a black box. Seeing
 * 「第 2 次：`ask-discard` 缺少 min」 followed by a fixed block is how a player
 * learns what the blocks mean; it is also the only way to tell a model that
 * gave up from one that is still working.
 */
import { useRef, useState } from 'react';
import type { HeroSpec } from '../../spec';
import { chat, type ChatAttempt, type ChatMessage, type ChatResponse } from '../api';

const STATUS_LABEL: Record<ChatResponse['status'], string> = {
  draft: '草稿已生成',
  created: '已创建并通过测试',
  failed: '没能做出可用的武将',
};

function Attempt({ attempt, index, onLoad }: { attempt: ChatAttempt; index: number; onLoad: (s: HeroSpec) => void }) {
  const [open, setOpen] = useState(false);
  const errors = attempt.errors ?? [];
  const ok = errors.length === 0 && !attempt.testLog?.includes('FAIL');
  return (
    <div className="fk-hd-attempt">
      <button type="button" className="fk-hd-attempt__head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className={`fk-hd-dot${ok ? ' fk-hd-dot--ok' : ' fk-hd-dot--bad'}`} />
        第 {index + 1} 次尝试
        <span className="fk-hd-attempt__sum">
          {errors.length ? `${errors.length} 处不合法` : attempt.testLog ? '进入试跑' : '已提交'}
        </span>
        <span className="fk-hd-attempt__caret">{open ? '收起' : '展开'}</span>
      </button>
      {open ? (
        <div className="fk-hd-attempt__body">
          {errors.length ? (
            <ul className="fk-hd-errlist">
              {errors.map((e, i) => (
                <li key={i}>
                  <code>{e.path}</code> {e.message}
                </li>
              ))}
            </ul>
          ) : null}
          {attempt.testLog ? <pre className="fk-hd-log">{attempt.testLog}</pre> : null}
          {attempt.spec ? (
            <>
              <button type="button" className="fk-hd-btn" onClick={() => onLoad(attempt.spec as HeroSpec)}>
                把这一版载入积木
              </button>
              <pre className="fk-hd-log">{JSON.stringify(attempt.spec, null, 2)}</pre>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export interface AiPanelProps {
  /** The spec on the canvas now, sent along so the agent revises rather than restarts. */
  spec: HeroSpec;
  onSpec: (spec: HeroSpec) => void;
}

export function AiPanel({ spec, onSpec }: AiPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<ChatResponse | null>(null);
  const log = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    setError(null);
    try {
      const reply = await chat(next, spec);
      setMessages([...next, { role: 'assistant', content: reply.reply }]);
      setLast(reply);
      // The canvas takes ownership the moment a spec exists — see the header.
      if (reply.spec) onSpec(reply.spec);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setMessages(next);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => log.current?.scrollTo({ top: log.current.scrollHeight }));
    }
  };

  return (
    <div className="fk-hd-ai">
      <p className="fk-hd-note">
        用一句话说你想要的武将，例如「一个吴势力女将，受到伤害后可以弃一张牌，然后摸两张」。
        AI 写好后会直接摆进中间的积木里，你还可以接着改。
      </p>

      <div className="fk-hd-ai__log" ref={log}>
        {messages.length === 0 ? <p className="fk-hd-note">还没有对话。</p> : null}
        {messages.map((m, i) => (
          <div key={i} className={`fk-hd-msg fk-hd-msg--${m.role}`}>
            <span className="fk-hd-msg__who">{m.role === 'user' ? '你' : 'AI'}</span>
            <div className="fk-hd-msg__body">{m.content}</div>
          </div>
        ))}
        {busy ? <div className="fk-hd-msg fk-hd-msg--assistant">
          <span className="fk-hd-msg__who">AI</span>
          <div className="fk-hd-msg__body fk-hd-msg__body--busy">正在设计……</div>
        </div> : null}
      </div>

      {error ? <p className="fk-hd-err">{error}</p> : null}

      {last ? (
        <div className="fk-hd-ai__status">
          <span className={`fk-hd-status fk-hd-status--${last.status}`}>{STATUS_LABEL[last.status]}</span>
          {last.spec ? <span className="fk-hd-note">已载入到中间的积木</span> : null}
        </div>
      ) : null}

      {last?.attempts?.length ? (
        <div className="fk-hd-ai__attempts">
          <h4>它改了 {last.attempts.length} 次</h4>
          {last.attempts.map((a, i) => (
            <Attempt key={i} attempt={a} index={i} onLoad={onSpec} />
          ))}
        </div>
      ) : null}

      <div className="fk-hd-ai__compose">
        <textarea
          value={draft}
          rows={3}
          placeholder="描述你想要的武将……"
          aria-label="给 AI 的描述"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send();
          }}
        />
        <button type="button" className="fk-hd-btn fk-hd-btn--primary" disabled={busy || !draft.trim()} onClick={() => void send()}>
          {busy ? '设计中…' : '发送'}
        </button>
      </div>
    </div>
  );
}
