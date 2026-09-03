/**
 * The waiting room, against `contract/views.ts`'s `WaitingRoomViewProps`.
 *
 * Host-only actions arrive as undefined callbacks for non-hosts, and the rule
 * here is hide, not disable: a control a player can never use is noise, and a
 * disabled Start button invites them to keep clicking it.
 *
 * WHAT THE TABLE SAYS ABOUT ROLES, AND WHAT IT DOES NOT. The composition strip
 * names every allegiance this mode deals, in its colours. It does *not* tint the
 * seats, and that is a correctness point rather than a design one:
 * `GameLogic:run` shuffles `room.players` before it deals, so the chair someone
 * picks here has no relation to the seat — or the role — they get. Colouring
 * this grid would be inventing information. The ring in the lobby's mode picker
 * shows the in-game seating, which is real; this shows the deal, which is also
 * real; neither claims to know who gets what.
 */
import { useState } from 'react';
import type { WaitingRoomViewProps } from '../../contract/views';
import { engineTr, useLanguage, useT } from '../../i18n';
import { useSession } from '../session';
import { generalAvatar } from '../boot';
import { modeOfRoom } from '../../contract/modes';
import { RoleStrip, SeatRing, modeNameKey } from '../ModePicker';

/** `lua/lunarltk/init.lua:22` — `SpinRow { from = 0, to = 8 }`. Not our range. */
export const LUCK_TIME_CHOICES = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

/** What the room's settings say, clamped to what the engine will accept. */
export function luckTimeOf(settings: Readonly<Record<string, unknown>>): number {
  const raw = Number(settings.luckTime);
  if (!Number.isFinite(raw)) return 0;
  return Math.min(8, Math.max(0, Math.round(raw)));
}

export function WaitingRoomView(props: WaitingRoomViewProps) {
  const {
    joinCode, joinUrl, seats, capacity, settings, meId, isHost,
    onStart, onAddBot, onRemoveSeat, onChangeSettings, onLeave, onChat, chat,
  } = props;
  const t = useT();
  const lang = useLanguage();
  const { loaded } = useSession();
  const mode = modeOfRoom(settings, capacity);
  // A room on a mode this build does not offer still has to render: fall back
  // to the engine's own name for it rather than to a wrong guess.
  const modeTitle = mode
    ? t(modeNameKey(mode.id))
    : engineTr(String(settings.gameMode ?? ''), lang, (k) => loaded.overview.translations[k] ?? k);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [draft, setDraft] = useState('');
  const luckTime = luckTimeOf(settings);

  const bySeat = new Map(seats.map((s) => [s.seat, s]));
  const humans = seats.filter((s) => !s.isBot);
  const everyoneReady = humans.every((s) => s.ready || s.playerId === meId);
  const empty = Math.max(0, capacity - seats.length);
  const full = empty === 0;

  async function copy(what: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(what === 'code' ? joinCode : joinUrl);
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    } catch { /* clipboard blocked — the text is on screen anyway */ }
  }

  function fillWithBots() {
    if (!onAddBot) return;
    for (let seat = 1; seat <= capacity; seat++) {
      if (!bySeat.has(seat)) onAddBot(seat);
    }
  }

  return (
    <div className="page">
      <div className="waiting-head">
        {mode ? <SeatRing mode={mode} size={64} /> : null}
        <div>
          <h2 style={{ margin: 0 }}>{modeTitle}</h2>
          <p className="lede" style={{ margin: '4px 0 0' }}>
            {t('waiting.seated', { seated: seats.length, capacity })}
            {isHost ? t('waiting.youAreHost') : ''}
          </p>
        </div>
      </div>

      {/*
        FREE ASSIGN, IN THE ROOM.
        
        This setting existed only in the create-room dialog, and the lobby's
        quick-create buttons ("创建八人身份" and friends) open a room without ever
        showing that dialog — which is how most rooms are actually made. So the
        switch was, in practice, unreachable: the player looked for it in the
        room they were sitting in, which is also where they would look for it.

        `onChangeSettings` was already passed to this view by `RoomPage` and
        never destructured. It patches the room's settings row, the room
        broadcasts it, and every seat's choose-general dialog reads
        `enableFreeAssign` off `EnterRoom` — so this is a wiring gap, not a
        feature. Non-hosts see the state and cannot change it, because it is the
        host's room.
      */}
      <div className="waiting-composition" style={{ gap: 10 }}>
        <span className="waiting-composition__label">{t('waiting.freeAssign')}</span>
        {onChangeSettings ? (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.enableFreeAssign === true}
              onChange={(e) => onChangeSettings({ enableFreeAssign: e.target.checked })}
            />
            <span style={{ fontSize: 13 }}>{t('waiting.freeAssign.on')}</span>
          </label>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--paper-faint)' }}>
            {settings.enableFreeAssign === true ? t('waiting.freeAssign.yes') : t('waiting.freeAssign.no')}
          </span>
        )}
      </div>

      {/*
        手气卡, in the room, for exactly the reason free assign is.

        `luckTime` is an upstream room setting (`lua/lunarltk/init.lua:22`, a
        0-8 spin row) that this build shipped pinned to 0, so the engine never
        offered the redraw and no player could reach it. It is a per-room
        decision — some tables want it, some think it is cheating — so it
        belongs where the host is looking at the table, not behind the lobby's
        "more options", which the quick-create buttons skip entirely.

        The ceiling is the engine's own: `lua/lunarltk/init.lua` declares
        `from = 0, to = 8`, and the panel offers exactly that range rather than
        a number we picked.
      */}
      <div className="waiting-composition" style={{ gap: 10 }}>
        <span className="waiting-composition__label">{t('waiting.luckTime')}</span>
        {onChangeSettings ? (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={luckTime}
              onChange={(e) => onChangeSettings({ luckTime: Number(e.target.value) })}
            >
              {LUCK_TIME_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? t('waiting.luckTime.off') : t('waiting.luckTime.times', { n })}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 13 }}>{t('waiting.luckTime.help')}</span>
          </label>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--paper-faint)' }}>
            {luckTime > 0 ? t('waiting.luckTime.value', { n: luckTime }) : t('waiting.luckTime.none')}
          </span>
        )}
      </div>

      {mode ? (
        <div className="waiting-composition">
          <span className="waiting-composition__label">{t('waiting.composition')}</span>
          <RoleStrip mode={mode} />
        </div>
      ) : null}

      <div className="sharebar">
        <span style={{ color: 'var(--paper-faint)', fontSize: 13 }}>{t('waiting.code')}</span>
        <code className="code-big">{joinCode}</code>
        <button className="btn small ghost" onClick={() => copy('code')}>
          {copied === 'code' ? t('waiting.copied') : t('waiting.copyCode')}
        </button>
        <code style={{ flex: 1 }}>{joinUrl}</code>
        <button className="btn small" onClick={() => copy('link')}>
          {copied === 'link' ? t('waiting.copied') : t('waiting.copyLink')}
        </button>
      </div>

      <div className="seats">
        {Array.from({ length: capacity }, (_, i) => i + 1).map((seat) => {
          const s = bySeat.get(seat);
          if (!s) {
            return (
              <div className="seat empty-seat" key={seat}>
                {onAddBot
                  ? <button className="btn small ghost" onClick={() => onAddBot(seat)}>{t('waiting.addBot')}</button>
                  : <span>{t('waiting.emptySeat', { seat })}</span>}
              </div>
            );
          }
          const src = generalAvatar(loaded, s.avatar || 'guojia');
          return (
            <div className={`seat${s.connection === 'online' ? '' : ' offline'}`} key={seat}>
              {src ? <img className="avatar" src={src} alt="" /> : <div className="avatar" />}
              <div style={{ minWidth: 0 }}>
                <div className="who-name">{s.displayName}</div>
                <div className="badges">
                  {s.isHost ? <span className="badge host">{t('waiting.badge.host')}</span> : null}
                  {s.isBot ? <span className="badge bot">{t('waiting.badge.bot')}</span> : null}
                  {s.ready && !s.isBot ? <span className="badge ready">{t('waiting.badge.ready')}</span> : null}
                  {s.connection === 'offline' ? <span className="badge">{t('waiting.badge.offline')}</span> : null}
                </div>
              </div>
              {onRemoveSeat && s.playerId !== meId
                ? <button className="btn small ghost" style={{ marginLeft: 'auto' }} onClick={() => onRemoveSeat(seat)}>{t('waiting.remove')}</button>
                : null}
            </div>
          );
        })}
      </div>

      {!full ? (
        <p className="lede" style={{ margin: '14px 0 0' }}>{t('waiting.fillTable', { n: empty })}</p>
      ) : null}

      <div className="row" style={{ marginTop: 22 }}>
        <button className="btn ghost" onClick={onLeave}>{t('waiting.leave')}</button>
        {onAddBot && !full
          ? <button className="btn" onClick={fillWithBots}>{t('waiting.fillWithBots')}</button>
          : null}
        {onStart
          ? (
            /* The mode fixes the seat count, so a short table is not a game this
               build knows how to deal — `webmodes_dizhu` is 3 seats in the
               engine too, and starting it with 2 would be refused there. Saying
               so on the button is better than letting the engine say it. */
            <button className="btn primary" onClick={onStart} disabled={!full}>
              {!full ? t('waiting.startNeedsFull')
                : everyoneReady ? t('waiting.start') : t('waiting.startNotReady')}
            </button>
          )
          : <span style={{ color: 'var(--paper-faint)', fontSize: 13 }}>{t('waiting.waitForHost')}</span>}
      </div>

      <div className="card" style={{ marginTop: 26 }}>
        <div style={{ maxHeight: 180, overflow: 'auto', marginBottom: 10, fontSize: 13, lineHeight: 1.9 }}>
          {chat.length === 0
            ? <span style={{ color: 'var(--paper-faint)' }}>{t('waiting.noChat')}</span>
            : chat.map((c) => (
              <div key={c.id}>
                <span style={{ color: 'var(--gold)' }}>{c.displayName}</span>
                <span style={{ color: 'var(--paper-faint)' }}>{t('punct.nameSep')}</span>
                {c.text}
              </div>
            ))}
        </div>
        <form
          className="row"
          onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onChat(draft.trim()); setDraft(''); } }}
        >
          <input
            type="text"
            style={{ flex: 1 }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('waiting.chatPlaceholder')}
            maxLength={120}
          />
          <button className="btn small" type="submit">{t('waiting.send')}</button>
        </form>
      </div>
    </div>
  );
}
