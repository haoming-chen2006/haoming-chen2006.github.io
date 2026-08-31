/**
 * Live integration test against the hosted Supabase project.
 *
 * It is deliberately one long story rather than a dozen isolated cases: the
 * thing worth proving is a *sequence* — two anonymous strangers meet in a room,
 * the host logs decisions, the host vanishes, someone else takes over — and the
 * privacy property only means anything at specific points inside it.
 *
 * Everything it creates, it deletes. It never truncates.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLobbyApi, createRoomTransport, promoteHost, heartbeat } from '../index';
import { createFkClient } from '../client';
import type { LobbyApi, RoomDetail } from '../../shell/api/types';
import type { Envelope } from '../../contract/protocol';
import type { SupabaseClient } from '@supabase/supabase-js';

const TIMEOUT = 60_000;

/** One simulated browser: one Supabase client, one anonymous session. */
function seat(tag: string) {
  const store = new Map<string, string>();
  const storage = {
    get length() { return store.size; },
    clear: () => store.clear(),
    getItem: (k: string) => store.get(k) ?? null,
    key: (i: number) => [...store.keys()][i] ?? null,
    removeItem: (k: string) => { store.delete(k); },
    setItem: (k: string, v: string) => { store.set(k, v); },
  } as Storage;
  const sb: SupabaseClient = createFkClient({ storage, storageKey: `fk-test-${tag}` });
  return { api: createLobbyApi({ client: sb }) as LobbyApi, sb };
}

const until = async <T>(fn: () => T | Promise<T>, ok: (v: T) => boolean, ms = 15_000): Promise<T> => {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (ok(v)) return v;
    if (Date.now() - t0 > ms) return v;
    await new Promise((r) => setTimeout(r, 250));
  }
};

describe('supabase backplane', () => {
  const host = seat('host');
  const guest = seat('guest');
  let room: RoomDetail;
  let hostId = '';
  let guestId = '';
  const created: string[] = [];

  beforeAll(async () => {
    const h = await host.api.signIn('主机', 'caocao');
    const g = await guest.api.signIn('客人', 'liubei');
    hostId = h.userId;
    guestId = g.userId;
  }, TIMEOUT);

  afterAll(async () => {
    for (const id of created) {
      await guest.sb.from('fk_rooms').delete().eq('id', id);
      await host.sb.from('fk_rooms').delete().eq('id', id);
    }
  }, TIMEOUT);

  it('signs in anonymously and reports kind: supabase', async () => {
    expect(host.api.kind).toBe('supabase');
    expect(hostId).toMatch(/^[0-9a-f-]{36}$/);
    expect(guestId).not.toBe(hostId);
    const me = await host.api.currentIdentity();
    expect(me).toEqual({ userId: hostId, displayName: '主机', avatar: 'caocao' });
  }, TIMEOUT);

  it('creates a room and seats the host at seat 1', async () => {
    room = await host.api.createRoom({
      name: '测试房间', capacity: 8, bundleSha: 'test-sha',
      settings: { generalTimeout: 30, gameMode: 'aaa_role_mode' },
    });
    created.push(room.summary.id);
    expect(room.summary.code).toMatch(/^[A-Z2-9]{4}$/);
    expect(room.hostId).toBe(hostId);
    expect(room.members).toHaveLength(1);
    expect(room.members[0]).toMatchObject({ seat: 1, displayName: '主机', isBot: false });
    expect(room.summary.settings.generalTimeout).toBe(30);
  }, TIMEOUT);

  it('a second client joins by code and both see two seats', async () => {
    const joined = await guest.api.joinByCode(room.summary.code.toLowerCase());
    expect(joined.summary.id).toBe(room.summary.id);
    expect(joined.members.map((m) => m.seat)).toEqual([1, 2]);

    const fromHost = await host.api.getRoom(room.summary.id);
    expect(fromHost!.members.map((m) => m.displayName)).toEqual(['主机', '客人']);
    expect(fromHost!.summary.seated).toBe(2);
  }, TIMEOUT);

  it('watchRoom pushes a live update when the host adds a bot', async () => {
    let latest: RoomDetail | null = null;
    const off = guest.api.watchRoom(room.summary.id, (d) => { latest = d; });
    await until(() => latest, (v) => v !== null);

    await host.api.addBot(room.summary.id, 3);
    const seen = await until(() => latest, (v) => (v?.members.length ?? 0) === 3);
    off();
    expect(seen!.members.map((m) => m.seat)).toEqual([1, 2, 3]);
    expect(seen!.members[2].isBot).toBe(true);
  }, TIMEOUT);

  it('streams a batched Envelope from host to guest over Realtime', async () => {
    const hostTx = createRoomTransport(room.summary.id, host.sb);
    const guestTx = createRoomTransport(room.summary.id, guest.sb);
    const got: Envelope[] = [];
    const off = guestTx.onEnvelope(2, (e) => got.push(e));
    await new Promise((r) => setTimeout(r, 1500)); // let the subscribe land

    const publicEnv: Envelope = {
      roomId: room.summary.id, batch: 1, to: null,
      messages: [
        { seq: 1, kind: 'notify', command: 'StartGame', bytes: 4 },
        { seq: 2, kind: 'notify', command: 'ArrangeSeats', data: [1, 2, 3], bytes: 12 },
      ],
    };
    const privateEnv: Envelope = {
      roomId: room.summary.id, batch: 2, to: 2,
      messages: [{ seq: 3, kind: 'request', command: 'AskForGeneral', data: { n: 3 }, bytes: 40 }],
    };
    await hostTx.publish(publicEnv);
    await hostTx.publish(privateEnv);

    await until(() => got, (v) => v.length >= 2);
    off();
    await hostTx.close();
    await guestTx.close();

    expect(got.map((e) => e.batch).sort()).toEqual([1, 2]);
    const pub = got.find((e) => e.to === null)!;
    expect(pub.messages).toHaveLength(2);
    expect(pub.messages[1].command).toBe('ArrangeSeats');
    expect(got.find((e) => e.to === 2)!.messages[0].command).toBe('AskForGeneral');
  }, TIMEOUT);

  it('PRIVACY: the host writes the log; a seated non-host reads zero rows', async () => {
    const hostTx = createRoomTransport(room.summary.id, host.sb);
    const guestTx = createRoomTransport(room.summary.id, guest.sb);

    await hostTx.appendCommands([
      { playerId: 1, command: 'AskForGeneral', reply: ['caocao', 'xiahoudun'], digest: 'a1'.repeat(8) },
      { playerId: 2, command: 'PlayCard', reply: { card: 7, targets: [1] }, digest: 'b2'.repeat(8) },
      { playerId: 1, command: 'AskForSkillInvoke', reply: true, digest: 'c3'.repeat(8) },
    ]);

    const hostLog = await hostTx.readLog();
    expect(hostLog.map((r) => r.seq)).toEqual([1, 2, 3]);
    expect(hostLog[1].reply).toEqual({ card: 7, targets: [1] });

    const hostSeed = await hostTx.readSeed();
    expect(typeof hostSeed).toBe('number');

    // The whole point. The guest is a seated member of this very room.
    const guestLog = await guestTx.readLog();
    const guestSeed = await guestTx.readSeed();
    console.log('[privacy] host log rows =', hostLog.length, '| guest log rows =', guestLog.length);
    console.log('[privacy] host seed =', hostSeed, '| guest seed =', guestSeed);
    expect(guestLog).toEqual([]);
    expect(guestSeed).toBeNull();

    // And writing is refused, not silently dropped.
    await expect(guestTx.appendCommands([
      { playerId: 2, command: 'PlayCard', reply: 'forged', digest: 'ff'.repeat(8) },
    ])).rejects.toThrow();

    await hostTx.close();
    await guestTx.close();
  }, TIMEOUT);

  it('rejects a gapped or out-of-order command insert', async () => {
    const { error } = await host.sb.from('fk_commands').insert({
      room_id: room.summary.id, seq: 9, player_id: 1,
      command: 'PlayCard', reply: null, digest: 'de'.repeat(8),
    });
    console.log('[gap] insert seq=9 ->', error?.message);
    expect(error?.message).toMatch(/out of order/);
  }, TIMEOUT);

  it('refuses to promote a new host while the old one is still alive', async () => {
    await heartbeat(room.summary.id, 'online', host.sb);
    const r = await promoteHost(room.summary.id, hostId, guest.sb);
    console.log('[promote:refused]', JSON.stringify(r));
    expect(r.ok).toBe(false);
    expect(r.host_id).toBe(hostId);
    expect(r.seed).toBeNull();
  }, TIMEOUT);

  it('promotes the survivor once the host is observably gone, and moves the secrets with it', async () => {
    await heartbeat(room.summary.id, 'offline', host.sb);

    const r = await promoteHost(room.summary.id, hostId, guest.sb);
    console.log('[promote:ok]', JSON.stringify(r));
    expect(r.ok).toBe(true);
    expect(r.host_id).toBe(guestId);
    expect(typeof r.seed).toBe('number');
    expect(r.last_seq).toBe(3);

    const hostTx = createRoomTransport(room.summary.id, host.sb);
    const guestTx = createRoomTransport(room.summary.id, guest.sb);
    const nowGuest = await guestTx.readLog();
    const nowOldHost = await hostTx.readLog();
    const seedGuest = await guestTx.readSeed();
    const seedOldHost = await hostTx.readSeed();
    console.log('[privacy:after] new host log rows =', nowGuest.length,
      '| demoted host log rows =', nowOldHost.length);
    console.log('[privacy:after] new host seed =', seedGuest, '| demoted host seed =', seedOldHost);

    // The gate follows the role, not the person: it swung both ways.
    expect(nowGuest.map((x) => x.seq)).toEqual([1, 2, 3]);
    expect(seedGuest).toBe(r.seed);
    expect(nowOldHost).toEqual([]);
    expect(seedOldHost).toBeNull();

    // The demoted host has also lost the right to write.
    await expect(hostTx.appendCommands([
      { playerId: 1, command: 'PlayCard', reply: 'stale', digest: 'ee'.repeat(8) },
    ])).rejects.toThrow();

    await hostTx.close();
    await guestTx.close();
  }, TIMEOUT);

  it('a non-member sees the lobby listing but none of the room contents', async () => {
    const stranger = seat('stranger');
    await stranger.api.signIn('路人', '');
    const rooms = await stranger.api.listRooms();
    const mine = rooms.find((x) => x.id === room.summary.id)!;
    expect(mine.name).toBe('测试房间');
    expect(mine.seated).toBe(3);
    expect(mine.hostName).toBe('客人'); // host_name followed the promotion

    const detail = await stranger.api.getRoom(room.summary.id);
    const tx = createRoomTransport(room.summary.id, stranger.sb);
    console.log('[stranger] members =', detail!.members.length,
      '| chat =', detail!.chat.length,
      '| log =', (await tx.readLog()).length,
      '| seed =', await tx.readSeed());
    expect(detail!.members).toEqual([]);
    expect(detail!.chat).toEqual([]);
    await tx.close();
    await stranger.api.signOut();
  }, TIMEOUT);

  it('carries chat between members and abandons the room when everyone leaves', async () => {
    await guest.api.sendChat(room.summary.id, '你好');
    await host.api.sendChat(room.summary.id, '开始吧');
    const d = await guest.api.getRoom(room.summary.id);
    expect(d!.chat.map((c) => c.text)).toEqual(['你好', '开始吧']);
    expect(d!.chat[0].displayName).toBe('客人');

    await host.api.leaveRoom(room.summary.id);
    await guest.api.leaveRoom(room.summary.id);
    const gone = await guest.api.getRoom(room.summary.id);
    console.log('[abandon] status =', gone?.summary.status);
    expect(gone!.summary.status).toBe('abandoned');
    expect((await guest.api.listRooms()).some((x) => x.id === room.summary.id)).toBe(false);
  }, TIMEOUT);
});
