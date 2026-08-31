// The parts of the journey both smoke walks need, written once.
//
// Everything here drives the app the way a person does — real mouse input, real
// Chinese labels, no reaching into React — so a step that passes here means the
// same step works for a player.

/**
 * Type a name on the landing page and end up in the lobby.
 *
 * A browser reusing a profile is already signed in — the identity surviving a
 * reload is a feature the app has — so the landing page is skipped rather than
 * waited for. Anything asserting the first-run experience should use a fresh
 * profile and drive the landing page itself.
 */
export async function signIn(page, base, name) {
  await page.goto(base);
  await page.waitFor(
    `!!document.querySelector('.landing input[type=text]') || location.hash.startsWith('#/lobby')`,
    60000);
  if (await page.evaluate(`!!document.querySelector('.landing input[type=text]')`)) {
    await page.setInput('.landing input[type=text]', name);
    await page.click('.landing button.primary');
  }
  await page.waitFor(`location.hash.startsWith('#/lobby')`, 60000);
  await page.waitFor(`!!document.querySelector('.rooms')`, 60000);
}

/** Create a room from the lobby and return its join URL. */
export async function createRoom(page) {
  await page.waitFor(`!!document.querySelector('.card .btn.primary')`, 30000);
  await page.click('.card .btn.primary');
  await page.waitFor(`location.hash.startsWith('#/room/')`, 60000);
  await page.waitFor(`!!document.querySelector('.sharebar .code-big')`, 30000);
  return page.evaluate(`document.querySelector('.sharebar code:not(.code-big)').textContent`);
}

/** Fill empty seats with bots until `total` seats are taken. */
export async function fillWithBots(page, total) {
  for (let i = 0; i < 12; i++) {
    const seated = await page.evaluate(`document.querySelectorAll('.seat:not(.empty-seat)').length`);
    if (seated >= total) return seated;
    await page.click('.seat.empty-seat .btn', { text: '机器人' });
    await page.waitFor(
      `document.querySelectorAll('.seat:not(.empty-seat)').length > ${seated}`, 20000);
  }
  return page.evaluate(`document.querySelectorAll('.seat:not(.empty-seat)').length`);
}

/**
 * Answer the opening 选将 dialog. This is a real request from a real engine —
 * the game does not deal a card until every seat has a general — so a smoke
 * test that wants to see a hand has to play this hand.
 */
export async function chooseGeneral(page, timeoutMs = 120000) {
  await page.waitFor(`document.querySelectorAll('.fk-general').length > 0`, timeoutMs);

  const picked = () => page.evaluate(`!!document.querySelector('.fk-general--on')`);

  // Everything here tolerates the dialog vanishing mid-answer, because that is
  // a legitimate outcome and not a fault: the engine gives a seat a fixed time
  // to reply and hands the question to the AI when it runs out. A walk that
  // treats "the question I was answering is gone" as a failure is testing its
  // own reaction time. What the caller asserts instead is the outcome — every
  // machine ends up holding cards.
  const count = await page.evaluate(`document.querySelectorAll('.fk-general').length`);
  for (let i = 0; i < count && !(await picked()); i++) {
    if (!(await hasGeneralDialog(page))) return false;
    // Selection is a toggle, and `ChooseGeneralFilter` can refuse a card, so
    // clicking the first one and hoping is not enough.
    try {
      await page.click('.fk-general', { nth: i, timeoutMs: 3000 });
    } catch { return false; }
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!(await picked())) return false;

  try {
    await page.waitFor(
      `!!document.querySelector('.fk-dialog__actions .fk-btn--primary:not([disabled])')`, 20000);
    await page.click('.fk-dialog__actions .fk-btn--primary', { timeoutMs: 5000 });
  } catch { return false; }

  // The dialog stays up until the server accepts the answer, so a caller that
  // loops must not read "still showing" as "still unanswered".
  await page.waitFor(`document.querySelectorAll('.fk-general').length === 0`, 40000)
    .catch(() => {});
  return true;
}

export const hasGeneralDialog = (page) =>
  page.evaluate(`document.querySelectorAll('.fk-general').length > 0`);

/**
 * Play forward until `subject` is the one holding an unanswered 选将 dialog.
 *
 * Who is asked first is not fixed: 主公 chooses alone from a wider list, and
 * only once they have chosen does everyone else choose together. So a walk that
 * assumes an order deadlocks one time in eight — which is exactly what a
 * flaky-looking 180-second timeout turned out to be. This answers whoever is
 * blocking instead of assuming it is not the subject.
 */
/**
 * Play the opening out on every machine at once.
 *
 * Nothing here assumes an order. 主公 chooses alone and first, then everyone
 * else chooses together, and which seat drew 主公 is random — so a walk that
 * decides in advance who will be asked when deadlocks one run in eight. And the
 * engine is on its own clock: a seat that is not answered within its request
 * timeout gets answered by the AI, so "the dialog is gone" is a normal outcome,
 * not a failure. This answers whatever is on screen, wherever it is, until
 * every machine is holding cards.
 */
export async function answerOpenings(pages, timeoutMs = 180000) {
  const start = Date.now();
  for (;;) {
    let answered = false;
    for (const page of pages) {
      if (await hasGeneralDialog(page)) { await chooseGeneral(page, 30000); answered = true; }
    }
    const hands = await Promise.all(pages.map((p) =>
      p.evaluate(`document.querySelectorAll('.fk-hand .fk-card').length`)));
    if (hands.every((h) => h > 0)) return;
    if (Date.now() - start > timeoutMs) {
      const states = await Promise.all(pages.map(tableState));
      throw new Error(`opening never finished after ${Math.round((Date.now() - start) / 1000)}s: `
        + states.map((x) => JSON.stringify(x)).join(' / '));
    }
    if (!answered) await new Promise((r) => setTimeout(r, 250));
  }
}

/** Answer a 选将 dialog if one turns up. Not every seat is asked twice. */
export async function chooseGeneralIfAsked(page, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await hasGeneralDialog(page)) { await chooseGeneral(page, 20000); return true; }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/** What the player can actually see at the table. */
export function tableState(page) {
  return page.evaluate(`(() => {
    const n = (s) => document.querySelectorAll(s).length;
    const num = (s) => {
      const el = document.querySelector(s);
      return el ? Number(el.textContent.trim()) : null;
    };
    return {
      mounted: !!document.querySelector('.fk-room'),
      photos: n('.fk-photo'),
      handCards: n('.fk-hand .fk-card'),
      logLines: n('.fk-log p'),
      drawPile: num('.fk-piles span:nth-child(1) b'),
      discard: num('.fk-piles span:nth-child(2) b'),
      dialogs: n('.fk-dialog'),
      dialog: document.querySelector('.fk-dialog__title')?.textContent ?? null,
      prompt: document.querySelector('.fk-prompt')?.textContent ?? null,
      // The room's own curtain: present while the table has no game in it,
      // and carrying the reason when there is not going to be one.
      curtain: document.querySelector('.fk-curtain')?.dataset.phase
        ?? document.querySelector('.page h2')?.textContent ?? null,
      note: document.querySelector('.fk-curtain .lede')?.textContent
        ?? document.querySelector('.page .lede')?.textContent ?? null,

      // Geometry, because counting elements is what let a collapsed board ship:
      // eight photos existed in the DOM while .fk-seats was 0px tall and the
      // whole table was clipped to a strip under the topbar.
      roomH: Math.round(document.querySelector('.fk-room')?.getBoundingClientRect().height ?? 0),
      seatsH: Math.round(document.querySelector('.fk-seats')?.getBoundingClientRect().height ?? 0),
      photosOnScreen: [...document.querySelectorAll('.fk-photo')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
      }).length,
    };
  })()`);
}

/**
 * Wait for a table that is actually holding a game.
 *
 * The old smoke waited for the container div, which an empty black rectangle
 * satisfies — that is precisely how a completely broken game shipped green. So
 * this waits for the four things a player would check, and reports what it saw
 * when it gives up.
 */
export async function waitForRealGame(page, { seats = 8, timeoutMs = 180000, requireLog = true } = {}) {
  const start = Date.now();
  let last = null;
  for (;;) {
    last = await tableState(page);
    // `requireLog` is off after a reload on purpose: a resync is the engine's
    // room *snapshot*, and a snapshot has no transcript in it. The reloaded tab
    // gets its seats, its hand and the deck back immediately, and starts
    // collecting battle log from the next thing that happens.
    // A seat that exists but is clipped off-screen is not a seat a player can
    // click, so the geometry is part of "real game", not a nicety.
    if (last.photos >= seats && last.handCards > 0 && last.drawPile > 0
        && last.seatsH >= 240 && last.photosOnScreen >= seats
        && (!requireLog || last.logLines > 0)) {
      return last;
    }
    // The room reports its own failure rather than sitting there looking fine.
    if (last.curtain === 'failed') throw new Error(`the room refused to start: ${last.note}`);
    if (Date.now() - start > timeoutMs) {
      throw new Error(`no real game after ${Math.round((Date.now() - start) / 1000)}s: ${JSON.stringify(last)}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}
