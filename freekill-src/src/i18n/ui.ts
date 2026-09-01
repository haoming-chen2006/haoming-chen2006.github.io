/**
 * The UI-chrome dictionary: everything the web app says in its own voice.
 *
 * These strings are NOT engine keys. `src/room/**` is disciplined about this —
 * its `i18n.test.ts` already forbids inventing keys, so every word the table
 * renders comes from the engine's own tables. `src/shell/**` is not: the lobby,
 * the waiting room, the boot screen, the error boundary and the overview page
 * are written in hardcoded Chinese, and none of it can be reached through
 * `Fk:translate`. So it gets its own dictionary, kept deliberately separate from
 * the engine-key overlay in `./engine/` — different provenance, different
 * reviewer, different reason to change.
 *
 * Keys are namespaced by the file that owns the string, so a reader can find the
 * call site from the key alone. Placeholders are `{name}` and are filled by
 * `t()` in `./translate.ts`; a `{name}` with no matching variable is left alone
 * rather than rendered as "undefined".
 *
 * Adoption is one line per string:
 *   const t = useT();          // from ./LanguageProvider
 *   <h2>{t('lobby.title')}</h2>
 */
import type { Language } from './types';

type Entry = { readonly [L in Language]: string };

export const UI = {
  /* ------------------------------------------------------------ boot screen */
  // index.html's #boot splash and src/main.tsx's <Boot>.
  'brand.name': { zh_CN: '狗卡杀', en_US: 'Dog Card Kill' },
  'brand.tagline': {
    zh_CN: '狗卡杀 · 打开链接就能玩的三国杀，无需安装、无需同步扩展包、无需服务器地址。',
    en_US: 'FreeKill — San Guo Sha you can play by opening a link. No install, no package sync, no server address.',
  },
  'boot.loading': { zh_CN: '正在载入', en_US: 'Loading' },
  'boot.step.start': { zh_CN: '启动', en_US: 'Starting' },
  'boot.step.assets': { zh_CN: '读取素材清单', en_US: 'Reading the asset manifest' },
  'boot.step.rules': { zh_CN: '读取规则清单', en_US: 'Reading the rules manifest' },
  'boot.step.data': { zh_CN: '读取武将与卡牌', en_US: 'Reading characters and cards' },
  'boot.step.connect': { zh_CN: '连接', en_US: 'Connecting' },
  'boot.step.ready': { zh_CN: '就绪', en_US: 'Ready' },
  'boot.step.retry': { zh_CN: '重试', en_US: 'Retrying' },
  'boot.failed.title': { zh_CN: '没能启动', en_US: 'Could not start' },
  'boot.failed.body': {
    zh_CN: '载入失败。这通常是部署不完整，或者被网络拦住了。',
    en_US: 'Loading failed. That usually means an incomplete deployment, or the network blocked it.',
  },
  'boot.retry': { zh_CN: '重试', en_US: 'Retry' },

  /* ------------------------------------------------------------ app header */
  // src/shell/App.tsx
  'nav.lobby': { zh_CN: '大厅', en_US: 'Lobby' },
  'nav.overview': { zh_CN: '资料', en_US: 'Reference' },
  'app.changeName': { zh_CN: '换个名字', en_US: 'Change name' },
  'app.join.title': { zh_CN: '正在加入 {code}', en_US: 'Joining {code}' },
  'app.join.wait': { zh_CN: '稍等…', en_US: 'One moment…' },
  'app.backToLobby': { zh_CN: '回到大厅', en_US: 'Back to lobby' },

  /* --------------------------------------------------------------- landing */
  // src/shell/pages/Landing.tsx, src/shell/session.tsx
  'landing.tagline.1': {
    zh_CN: '打开链接就能玩的三国杀。',
    en_US: 'San Guo Sha you can play by opening a link.',
  },
  'landing.tagline.2': {
    zh_CN: '不用装客户端，不用同步扩展包，不用填服务器地址。',
    en_US: 'No client to install, no packages to sync, no server address to type.',
  },
  'landing.namePlaceholder': { zh_CN: '取个名字', en_US: 'Pick a name' },
  'landing.nameLabel': { zh_CN: '显示名称', en_US: 'Display name' },
  'landing.avatarGroup': { zh_CN: '选择头像', en_US: 'Choose an avatar' },
  'landing.continue': { zh_CN: '继续', en_US: 'Continue' },
  'landing.enter': { zh_CN: '进入', en_US: 'Enter' },
  'session.anonymous': { zh_CN: '无名氏', en_US: 'Anonymous' },

  /* ----------------------------------------------------------------- lobby */
  // src/shell/pages/Lobby.tsx
  'lobby.title': { zh_CN: '房间', en_US: 'Rooms' },
  'lobby.lede': {
    zh_CN: '创建一个房间把链接发给朋友，或者用四位房号加入别人的。',
    en_US: 'Create a room and send the link to a friend, or join someone else’s with a four-letter code.',
  },
  'lobby.localNote': {
    zh_CN: ' 当前是本机模式：房间只在这台机器的浏览器之间可见。',
    en_US: ' Local mode: rooms are only visible between browsers on this machine.',
  },
  'lobby.roomName': { zh_CN: '房间名', en_US: 'Room name' },
  'lobby.defaultRoomName': { zh_CN: '{name}的房间', en_US: '{name}’s room' },
  'lobby.mode': { zh_CN: '模式', en_US: 'Mode' },
  'lobby.chooseMode': { zh_CN: '选个玩法', en_US: 'Choose a game' },
  'lobby.chooseModeHint': {
    zh_CN: '人数由玩法决定 —— 选了玩法，桌子就定了。',
    en_US: 'The game decides the table. Pick one and the seats are set.',
  },
  'lobby.moreOptions': { zh_CN: '更多设置', en_US: 'More options' },
  'lobby.fewerOptions': { zh_CN: '收起设置', en_US: 'Fewer options' },
  'lobby.generalNum': { zh_CN: '选将数', en_US: 'Characters offered' },
  // The engine has its own key for this ("Enable free assign" -> 自由选将), but
  // it lives in the Lua translation tables and the lobby has no client VM to
  // ask. The label matches the engine's wording so the room's own dialog and
  // the switch that opened it read the same.
  'lobby.freeAssign': { zh_CN: '自由选将', en_US: 'Free character choice' },
  'lobby.freeAssign.help': {
    zh_CN: '选将时可把任意武将换进候选，点武将牌左上角的 ⇄。开启后本局不计胜率。',
    en_US: 'Swap any character into the offer while choosing — the ⇄ badge on a character card. Games with it on do not count towards win rates.',
  },
  'lobby.create': { zh_CN: '创建房间', en_US: 'Create room' },
  'lobby.createIn': { zh_CN: '创建{mode}', en_US: 'Create a {mode} room' },
  'lobby.packs': { zh_CN: '扩展包', en_US: 'Packages' },
  'lobby.code': { zh_CN: '房号', en_US: 'Room code' },
  'lobby.join': { zh_CN: '加入', en_US: 'Join' },
  'lobby.spectate': { zh_CN: '旁观', en_US: 'Spectate' },
  'lobby.empty': { zh_CN: '还没有房间。创建一个吧。', en_US: 'No rooms yet. Create one.' },
  'lobby.host': { zh_CN: '房主 {name}', en_US: 'Host {name}' },
  'lobby.status.waiting': { zh_CN: '等待中', en_US: 'Waiting' },
  'lobby.status.playing': { zh_CN: '游戏中', en_US: 'In progress' },
  'lobby.status.finished': { zh_CN: '已结束', en_US: 'Finished' },

  /* ------------------------------------------------------------ game modes */
  // src/shell/ModePicker.tsx, keyed by `src/contract/modes.ts`'s ModeId.
  //
  // These are the app's own words for the five offers, not the engine's. The
  // engine has a name and a rules document for each mode it owns (`Fk:translate`
  // of `webmodes_dizhu` and `:webmodes_dizhu`), and the room shows those; what
  // the lobby needs is a sentence short enough to choose by.
  'mode.duel.name': { zh_CN: '单挑', en_US: 'Duel' },
  'mode.duel.tagline': {
    zh_CN: '两个人，没有身份，谁先倒下谁输。',
    en_US: 'Two players, no roles. Last one standing wins.',
  },
  'mode.team.name': { zh_CN: '2v2 对决', en_US: '2v2' },
  'mode.team.tagline': {
    zh_CN: '两人一队，队友坐你对面。没有主公，没有内奸，没有暗身份。',
    en_US: 'Two against two, your partner opposite you. No lord, no renegade, nothing hidden.',
  },
  'mode.dizhu.name': { zh_CN: '斗地主', en_US: 'Fight the Landlord' },
  'mode.dizhu.tagline': {
    zh_CN: '一个地主打两个农民。地主多两个选将、多一点体力，还有两个专属技能。',
    en_US: 'One landlord against two peasants. The landlord picks from two more characters, starts on one more HP, and holds two skills of their own.',
  },
  'mode.role5.name': { zh_CN: '五人身份', en_US: '5-player Roles' },
  'mode.role5.tagline': {
    zh_CN: '主公、忠臣、两名反贼、一名内奸。除主公外身份是暗的。',
    en_US: 'A lord, a loyalist, two rebels and a renegade. Everyone but the lord starts hidden.',
  },
  'mode.role8.name': { zh_CN: '八人身份', en_US: '8-player Roles' },
  'mode.role8.tagline': {
    zh_CN: '主公、两忠臣、四反贼、一内奸。最经典的一桌。',
    en_US: 'A lord, two loyalists, four rebels and a renegade. The classic table.',
  },

  'mode.seats': { zh_CN: '{n} 人', en_US: '{n} players' },
  'mode.roleCount': { zh_CN: '{role}×{n}', en_US: '{role} ×{n}' },
  'mode.hiddenRoles': { zh_CN: '暗身份', en_US: 'Hidden roles' },
  'mode.openRoles': { zh_CN: '明身份', en_US: 'Open roles' },
  'mode.unknown': { zh_CN: '未知玩法', en_US: 'Unknown game' },
  'mode.selected': { zh_CN: '已选', en_US: 'Selected' },

  // Role names as each mode says them. 斗地主 deals `lord` and `rebel` in the
  // engine — see `contract/modes.ts` for why — but calls them 地主 and 农民.
  'mode.role.lord': { zh_CN: '主公', en_US: 'Lord' },
  'mode.role.loyalist': { zh_CN: '忠臣', en_US: 'Loyalist' },
  'mode.role.rebel': { zh_CN: '反贼', en_US: 'Rebel' },
  'mode.role.renegade': { zh_CN: '内奸', en_US: 'Renegade' },
  'mode.role.landlord': { zh_CN: '地主', en_US: 'Landlord' },
  'mode.role.peasant': { zh_CN: '农民', en_US: 'Peasant' },
  'mode.side.yellow': { zh_CN: '黄队', en_US: 'Yellow' },
  'mode.side.green': { zh_CN: '绿队', en_US: 'Green' },

  /* ---------------------------------------------------------- waiting room */
  // src/shell/pages/WaitingRoom.tsx
  'waiting.title': { zh_CN: '等待中', en_US: 'Waiting' },
  'waiting.seated': { zh_CN: '{seated}/{capacity} 就座', en_US: '{seated}/{capacity} seated' },
  'waiting.fillTable': {
    zh_CN: '还差 {n} 个人。等朋友进来，或者补机器人。',
    en_US: '{n} seat(s) still empty. Wait for a friend, or fill them with bots.',
  },
  'waiting.fillWithBots': { zh_CN: '余下补机器人', en_US: 'Fill the rest with bots' },
  'waiting.startNeedsFull': {
    zh_CN: '开始游戏（人未满）',
    en_US: 'Start game (table not full)',
  },
  'waiting.composition': { zh_CN: '本局身份', en_US: 'This table deals' },
  'waiting.youAreHost': { zh_CN: ' · 你是房主', en_US: ' · you are the host' },
  'waiting.code': { zh_CN: '房号', en_US: 'Room code' },
  'waiting.copyCode': { zh_CN: '复制房号', en_US: 'Copy code' },
  'waiting.copyLink': { zh_CN: '复制链接', en_US: 'Copy link' },
  'waiting.copied': { zh_CN: '已复制', en_US: 'Copied' },
  'waiting.addBot': { zh_CN: '＋ 机器人', en_US: '+ Bot' },
  'waiting.emptySeat': { zh_CN: '空位 {seat}', en_US: 'Seat {seat} empty' },
  'waiting.badge.host': { zh_CN: '房主', en_US: 'Host' },
  'waiting.badge.bot': { zh_CN: '机器人', en_US: 'Bot' },
  'waiting.badge.ready': { zh_CN: '准备', en_US: 'Ready' },
  'waiting.badge.offline': { zh_CN: '离线', en_US: 'Offline' },
  'waiting.badge.you': { zh_CN: '你', en_US: 'You' },
  'waiting.remove': { zh_CN: '移除', en_US: 'Remove' },
  'waiting.leave': { zh_CN: '离开房间', en_US: 'Leave room' },
  'waiting.start': { zh_CN: '开始游戏', en_US: 'Start game' },
  'waiting.startNotReady': {
    zh_CN: '开始游戏（有人未准备）',
    en_US: 'Start game (not everyone is ready)',
  },
  'waiting.waitForHost': { zh_CN: '等房主开始', en_US: 'Waiting for the host to start' },
  'waiting.noChat': { zh_CN: '还没有人说话。', en_US: 'Nobody has said anything yet.' },
  'waiting.chatPlaceholder': { zh_CN: '说点什么', en_US: 'Say something' },
  'waiting.send': { zh_CN: '发送', en_US: 'Send' },

  /* ------------------------------------------------------------------ room */
  // src/shell/pages/RoomPage.tsx
  'room.loading': { zh_CN: '正在读取房间…', en_US: 'Loading the room…' },
  'room.gone.title': { zh_CN: '房间不在了', en_US: 'This room is gone' },
  'room.gone.body': {
    zh_CN: '这个房间已经解散，或者链接指向的是别人机器上的本机房间。',
    en_US: 'The room has been disbanded, or the link points at a local room on someone else’s machine.',
  },
  'room.preparing': { zh_CN: '正在准备牌桌…', en_US: 'Setting up the table…' },
  'room.boundaryName': { zh_CN: '牌桌', en_US: 'The table' },
  'room.observerName': { zh_CN: '观战', en_US: 'Observer' },
  'room.badge.local': { zh_CN: '本机模式', en_US: 'Local mode' },
  'room.badge.connected': { zh_CN: '已连接', en_US: 'Connected' },
  // `run(what, promise)` labels: the action name is substituted into the failure.
  'room.action.start': { zh_CN: '开始游戏', en_US: 'Start game' },
  'room.action.addBot': { zh_CN: '加机器人', en_US: 'Add a bot' },
  'room.action.removeSeat': { zh_CN: '移除座位', en_US: 'Remove a seat' },
  'room.action.changeSettings': { zh_CN: '修改设置', en_US: 'Change settings' },
  'room.action.sendChat': { zh_CN: '发送消息', en_US: 'Send a message' },
  'room.fault.action': { zh_CN: '{what}失败：{error}', en_US: '{what} failed: {error}' },
  'room.fault.engine': {
    zh_CN: '规则引擎没能启动，牌桌只能放录像：{error}',
    en_US: 'The rules engine failed to start, so the table can only replay a recording: {error}',
  },
  'room.fault.table': { zh_CN: '牌桌没能连上：{error}', en_US: 'The table failed to connect: {error}' },
  // The curtain over the table while the game is being dealt.
  'room.curtain.preparing': { zh_CN: '牌局准备中', en_US: 'Dealing the game' },
  'room.curtain.failed': { zh_CN: '这局开不起来', en_US: 'This game cannot start' },
  'room.banner.dismiss': { zh_CN: '知道了', en_US: 'Got it' },
  // The engine failing to load is not a table with a problem, it is no table.
  'room.engineDown.title': { zh_CN: '规则引擎没能启动', en_US: 'The rules engine did not start' },
  'room.engineDown.body': {
    zh_CN: '没有规则引擎就没有牌局，所以这里不会给你一张假牌桌。刷新一次通常就好；如果一直这样，多半是这次部署缺了文件。',
    en_US: 'Without the rules engine there is no game, so this will not show you a table that is not one. A reload usually fixes it; if it keeps happening, this deployment is probably missing a file.',
  },
  'room.engineDown.retry': { zh_CN: '重新载入', en_US: 'Reload' },

  /* --------------------------------------------------- live table (host/guest) */
  // src/shell/liveTable.ts — phase notes and warnings shown on the curtain.
  'table.starting': { zh_CN: '正在启动牌局…', en_US: 'Starting the game…' },
  'table.waitingForHost': { zh_CN: '正在等待房主发牌…', en_US: 'Waiting for the host to deal…' },
  'table.dealing': { zh_CN: '正在发牌…', en_US: 'Dealing…' },
  'table.warn.batch': {
    zh_CN: '有一批对局数据没能读进来：{error}',
    en_US: 'A batch of game data could not be read: {error}',
  },
  'table.warn.play': { zh_CN: '出牌没发出去：{error}', en_US: 'Your move was not sent: {error}' },
  'table.warn.channel': {
    zh_CN: '实时频道没连上，可能收不到牌局：{error}',
    en_US: 'The realtime channel did not connect; the game may not reach you: {error}',
  },
  'table.warn.resync': {
    zh_CN: '向房主要牌局状态失败：{error}',
    en_US: 'Asking the host for the game state failed: {error}',
  },
  'table.error.hostNoSeat': { zh_CN: '房主没有座位，无法开局', en_US: 'The host has no seat, so the game cannot start' },
  'table.error.start': { zh_CN: '开不了局：{error}', en_US: 'The game could not start: {error}' },
  'table.error.hostSilent': {
    zh_CN: '房主一直没有发来牌局。请让房主确认他的页面还开着。',
    en_US: 'The host never sent the game. Ask them to check their page is still open.',
  },

  /* --------------------------------------------------------------- host runner */
  // src/shell/hostRunner.ts — the host-side engine, and why it refused to start.
  'host.error.missingWorker': {
    zh_CN: '引擎主机模块缺失（src/worker）',
    en_US: 'The engine host module is missing (src/worker)',
  },
  'host.error.noExport': {
    zh_CN: 'src/worker 没有导出 startHostWorker',
    en_US: 'src/worker does not export startHostWorker',
  },
  'host.error.noSeed': {
    zh_CN: '读不到房间种子：本机不是这个房间的房主，或者房间已经不在了',
    en_US: 'Cannot read the room seed: this machine is not the host, or the room is gone',
  },
  'host.error.tooFewSeats': {
    zh_CN: '开局至少要两个人，现在只有 {n} 个',
    en_US: 'A game needs at least two players; there are only {n}',
  },
  'host.error.allBots': {
    zh_CN: '全是机器人的房间会被引擎立刻判定结束',
    en_US: 'A room of nothing but bots is ended by the engine immediately',
  },
  'host.fault.send': { zh_CN: '发送对局数据失败：{error}', en_US: 'Sending game data failed: {error}' },
  'host.fault.log': {
    zh_CN: '对局日志写入失败（不影响本局继续）：{error}',
    en_US: 'Writing the game log failed (the game carries on): {error}',
  },
  'host.fault.channel': {
    zh_CN: '实时频道没连上，其他玩家可能收不到牌局：{error}',
    en_US: 'The realtime channel did not connect; other players may not receive the game: {error}',
  },
  'host.fault.engine': { zh_CN: '对局引擎出错：{error}', en_US: 'The game engine failed: {error}' },
  'host.fault.resyncSeat': {
    zh_CN: '没能把牌局同步给 {seat} 号位：{error}',
    en_US: 'Could not resync the game to seat {seat}: {error}',
  },
  'host.playerName': { zh_CN: '玩家{seat}', en_US: 'Player {seat}' },

  /* ------------------------------------------------------- room view (stub) */
  // src/shell/RoomViewStub.tsx
  'stub.title': { zh_CN: '牌桌（占位）', en_US: 'Table (placeholder)' },
  'stub.lede.1': {
    zh_CN: '真正的牌桌由房间视图提供，接口是 ',
    en_US: 'The real table comes from the room view; its interface is ',
  },
  'stub.lede.2': {
    zh_CN: ' 的 RoomViewProps。这里显示的是这间房实际收到的 notifyUI 命令流。',
    en_US: '’s RoomViewProps. What is shown here is the notifyUI stream this room actually received.',
  },
  'stub.leave': { zh_CN: '离开', en_US: 'Leave' },
  'stub.seat': { zh_CN: '座位 {seat}', en_US: 'Seat {seat}' },
  'stub.noCommands': {
    zh_CN: '（还没有命令。引擎接上之后这里会滚动。）',
    en_US: '(No commands yet. This will scroll once the engine is attached.)',
  },
  'stub.chatPlaceholder': { zh_CN: '聊天', en_US: 'Chat' },
  'stub.send': { zh_CN: '发送', en_US: 'Send' },

  /* -------------------------------------------------------- error boundary */
  // src/shell/ErrorBoundary.tsx
  'error.title': { zh_CN: '{where}出错了', en_US: '{where} hit an error' },
  'error.lede': {
    zh_CN: '这一部分崩了，其余部分还能用。',
    en_US: 'This part crashed; the rest of the page still works.',
  },
  'error.retry': { zh_CN: '重试', en_US: 'Retry' },
  'error.backToLobby': { zh_CN: '回到大厅', en_US: 'Back to lobby' },

  /* -------------------------------------------------------------- overview */
  // src/shell/pages/Overview.tsx
  'overview.title': { zh_CN: '资料', en_US: 'Reference' },
  'overview.lede': {
    zh_CN: '标准包、标准卡牌包、军争包 —— 与游戏里跑的是同一份数据。',
    en_US: 'Standard, Standard Cards and Maneuvering — the same data the game itself runs on.',
  },
  'overview.tab.generals': { zh_CN: '武将', en_US: 'Characters' },
  'overview.tab.cards': { zh_CN: '卡牌', en_US: 'Cards' },
  'overview.tab.modes': { zh_CN: '模式', en_US: 'Modes' },
  'overview.tab.skills': { zh_CN: '技能', en_US: 'Skills' },
  'overview.searchPlaceholder': {
    zh_CN: '搜索名称、称号、技能…',
    en_US: 'Search names, titles, skills…',
  },
  'overview.search': { zh_CN: '搜索', en_US: 'Search' },
  'overview.kingdomLabel': { zh_CN: '势力', en_US: 'Kingdom' },
  'overview.allKingdoms': { zh_CN: '全部势力', en_US: 'All kingdoms' },
  'overview.typeLabel': { zh_CN: '类别', en_US: 'Type' },
  'overview.allTypes': { zh_CN: '全部类别', en_US: 'All types' },
  'overview.countGenerals': {
    zh_CN: '{shown} / {total} 名武将',
    en_US: '{shown} / {total} characters',
  },
  'overview.countCards': { zh_CN: '{shown} / {total} 种牌', en_US: '{shown} / {total} cards' },
  'overview.countSkills': { zh_CN: '{shown} / {total} 个技能', en_US: '{shown} / {total} skills' },
  'overview.playerRange': { zh_CN: '{min}–{max} 人', en_US: '{min}–{max} players' },
  'overview.copies': { zh_CN: '{n} 张', en_US: '×{n}' },
  'overview.illustrator': { zh_CN: '画师', en_US: 'Illustrator' },
  'overview.close': { zh_CN: '关闭', en_US: 'Close' },

  /* Kingdom badges. The engine key (`wei`) renders long ("Wei"); the badge wants
   * one glyph in Chinese and the short name in English. */
  'kingdom.wei': { zh_CN: '魏', en_US: 'Wei' },
  'kingdom.shu': { zh_CN: '蜀', en_US: 'Shu' },
  'kingdom.wu': { zh_CN: '吴', en_US: 'Wu' },
  'kingdom.qun': { zh_CN: '群', en_US: 'Neutral' },
  'kingdom.jin': { zh_CN: '晋', en_US: 'Jin' },
  'kingdom.god': { zh_CN: '神', en_US: 'God' },
  'kingdom.unknown': { zh_CN: '未知', en_US: 'Unknown' },

  /* Card type filter. Matches upstream's own wording in the `:card` blurbs. */
  'cardType.basic': { zh_CN: '基本牌', en_US: 'Basic card' },
  'cardType.trick': { zh_CN: '锦囊牌', en_US: 'Trick card' },
  'cardType.equip': { zh_CN: '装备牌', en_US: 'Equip card' },
  'suit.nosuit': { zh_CN: '无', en_US: 'None' },

  /* ------------------------------------------------------------ lobby api */
  // src/shell/api/local.ts — thrown errors and generated bot names.
  'api.error.roomFull': { zh_CN: '房间已满', en_US: 'The room is full' },
  'api.error.createFailed': { zh_CN: '房间创建失败', en_US: 'The room could not be created' },
  'api.error.roomNotFound': {
    zh_CN: '没有找到房间 {code}',
    en_US: 'No room found with code {code}',
  },
  'api.botName': { zh_CN: '机器人 {seat}', en_US: 'Bot {seat}' },

  /** The separator between a speaker's name and what they said. */
  'punct.nameSep': { zh_CN: '：', en_US: ': ' },
  /** Between items in an inline list (which characters carry a skill). */
  'punct.listSep': { zh_CN: '、', en_US: ', ' },

  /* ---------------------------------------------------------- the toggle */
  'language.label': { zh_CN: '语言', en_US: 'Language' },
} as const satisfies Record<string, Entry>;

export type UiKey = keyof typeof UI;

export const UI_KEYS = Object.keys(UI) as UiKey[];
