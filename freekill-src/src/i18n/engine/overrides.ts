/**
 * The handful of upstream `en_US` entries that are broken rather than merely odd.
 *
 * Upstream is canonical and is inherited verbatim everywhere else. An entry only
 * belongs here when the upstream value would put something in front of an
 * English-speaking player that is *not English* — Chinese text, a "there should
 * be some text here" stub, or Markdown emphasis the renderer does not strip.
 * Every one is listed with the upstream value it replaces so the change is
 * reviewable in isolation, and so dropping this file returns the exact upstream
 * behaviour.
 *
 * Three groups, 57 entries:
 *
 *  1. `$fastchat_*` (46) — the quick-chat menu. Upstream's `en_US` copies the
 *     Chinese lines verbatim, so the key "resolves" while still showing Chinese.
 *  2. `about_*_description` (6) — the credits pages. Same problem.
 *  3. `:aaa_role_mode` (1) — upstream ships the literal placeholder
 *     "There should be some text to introduce rule of role mode, buy currently
 *     have nothing." in place of the mode's 2,600-character rules document.
 *  4. `wei` / `shu` / `wu` / `qun` (4) — upstream wraps these in Markdown
 *     asterisks (`*Wei*`). Neither `renderMarkup` nor the room strips them, so
 *     they show literally. The word is upstream's; only the asterisks are gone.
 */
import type { TranslationTable } from '../types';

/** upstream value -> ours, for review. Not used at runtime. */
export const OVERRIDE_REASONS: Readonly<Record<string, string>> = {
  $fastchat: 'upstream en_US repeats the Chinese line verbatim',
  about: 'upstream en_US repeats the Chinese paragraph verbatim',
  ':aaa_role_mode': 'upstream en_US is a "there should be some text here" placeholder',
  kingdom: 'upstream wraps the word in Markdown asterisks the renderer does not strip',
};

export const OVERRIDE_EN_US: TranslationTable = {
  /* --- 1. Quick chat. Same 23 lines in a male and a female voice. --------- */
  $fastchat_f1: 'Could you hurry up? Speed is the soul of war.',
  $fastchat_f2: 'My lord, hold your fire — I’m on your side!',
  $fastchat_f3: 'If the Renegade never comes out, how is the rest of this supposed to work?',
  $fastchat_f4: 'Mmm~ have you no heart? Are you really going to leave me a bystander?',
  $fastchat_f5: 'Did I... did I do something to you?',
  $fastchat_f6: 'Miss, you are a real tough guy.',
  $fastchat_f7: 'Of the thirty-six stratagems, running is best — I’ll be right back.',
  $fastchat_f8: 'Morale has collapsed; this team is impossible to lead.',
  $fastchat_f9: 'What a fool of a lord! What a fool!',
  $fastchat_f10: 'The wind blows the eggshell away — lose the cards, lose the worry.',
  $fastchat_f11: 'Easy there, Renegade, take it slow.',
  $fastchat_f12: 'Sorry, I just lagged out.',
  $fastchat_f13: 'Could you possibly play any worse?',
  $fastchat_f14: 'Come on, pull your weight.',
  $fastchat_f15: 'Hey there, let’s be friends.',
  $fastchat_f16: 'Hey there, miss, let’s be friends.',
  $fastchat_f17: 'Never in my life have I seen anyone so shameless!',
  $fastchat_f18: 'Slash all you like — if I can’t Dodge it, I lose.',
  $fastchat_f19: 'Worth it.',
  $fastchat_f20: 'Take my knees — I bow to you.',
  $fastchat_f21: 'Why don’t you fly up to heaven while you’re at it?',
  $fastchat_f22: 'Leave my teammate alone — come at me.',
  $fastchat_f23: 'Now is the moment to witness a miracle.',
  $fastchat_m1: 'Could you hurry up? Speed is the soul of war.',
  $fastchat_m2: 'My lord, hold your fire — I’m on your side!',
  $fastchat_m3: 'If the Renegade never comes out, how is the rest of this supposed to work?',
  $fastchat_m4: 'Have you no heart? Are you really going to leave me a bystander?',
  $fastchat_m5: 'Did I... did I do something to you!?',
  $fastchat_m6: 'Miss, you are a real tough guy.',
  $fastchat_m7: 'Of the thirty-six stratagems, running is best — I’ll be right back.',
  $fastchat_m8: 'Morale has collapsed; this team is impossible to lead.',
  $fastchat_m9: 'What a fool of a lord! What a fool!',
  $fastchat_m10: 'The wind blows the eggshell away — lose the cards, lose the worry.',
  $fastchat_m11: 'Easy there, Renegade, take it slow.',
  $fastchat_m12: 'Ah, sorry, I just lagged out.',
  $fastchat_m13: 'Could you possibly play any worse?',
  $fastchat_m14: 'Come on, pull your weight.',
  $fastchat_m15: 'Hey there, big brother, let’s be friends.',
  $fastchat_m16: 'Hey there, miss, let’s be friends.',
  $fastchat_m17: 'Never in my life have I seen anyone so shameless!',
  $fastchat_m18: 'Slash all you like — if I can’t Dodge it, I lose.',
  $fastchat_m19: 'Worth it.',
  $fastchat_m20: 'Take my knees — I bow to you.',
  $fastchat_m21: 'Why don’t you fly up to heaven while you’re at it?',
  $fastchat_m22: 'Leave my teammate alone — come at me.',
  $fastchat_m23: 'Now is the moment to witness a miracle.',

  /* --- 2. Credits pages. -------------------------------------------------- */
  about_qt_description:
    '<b>About Qt</b><br/>Qt is a C++ framework for building graphical applications, with strong '
    + 'cross-platform support and an easy-to-use API.<br/><br/>This program uses Qt 6.2+: the UI is '
    + 'built mainly with QtQuick, and the server uses Qt’s networking library.<br/><br/>'
    + 'Website: https://www.qt.io',
  about_lua_description:
    '<b>About Lua</b><br/>Lua is a small, flexible, efficient scripting language, widely used in '
    + 'game development.<br/><br/>This program uses Lua 5.4, and the whole of the game logic is '
    + 'implemented in it.<br/><br/>Website: https://www.lua.org',
  about_sqlite_description:
    '<b>About SQLite</b><br/>SQLite is a lightweight database: cheap on resources, fast, and easy '
    + 'to embed.<br/><br/>FreeKill uses sqlite3 to store all user information on the server.<br/><br/>'
    + 'Website: https://www.sqlite.org',
  about_git2_description:
    '<b>About Libgit2</b><br/>Libgit2 is a lightweight, cross-platform, pure-C library that supports '
    + 'most of Git’s core operations and binds to almost any language that can call C.<br/><br/>'
    + 'FreeKill uses libgit2’s C API, and uses Git itself to download, update and manage extension '
    + 'packages.<br/><br/>Website: https://libgit2.org',
  about_ossl_description:
    '<b>About OpenSSL</b><br/>OpenSSL is an open-source package providing secure communication and '
    + 'a wide range of cryptography.<br/><br/>This program currently uses the crypto library, for RSA '
    + 'support.<br/><br/>Website: https://www.openssl.org',
  about_gplv3_description:
    '<b>About GPLv3</b><br/>The GNU General Public License (GPL) is a widely used free-software '
    + 'licence that guarantees users the freedom to run, study, share and modify the software.'
    + '<br/><br/>Qt is released under GPLv3, the readline library this program uses is GPLv3 as well, '
    + 'and QSanguosha — from which a good deal of code and thinking was borrowed — is also GPLv3, so '
    + 'this project is released under GPLv3 too.<br/><br/>Website: https://gplv3.fsf.org',

  /* --- 3. The role-mode rules document. ----------------------------------- *
   * Rendered by `renderMarkdown` (src/shell/markup.tsx): headings, `___` rules,
   * bullet lists, one table, `*emphasis*` is NOT supported so it is avoided.
   * The Chinese ends with a source URL; it is kept.
   * ---------------------------------------------------------------------- */
  ':aaa_role_mode': [
    '# Introduction to Role Mode',
    '',
    '___',
    '',
    'You are about to learn a multiplayer card game that combines role-play, combat and deception. '
    + 'By taking on the part of a familiar figure from the Three Kingdoms, you get to play out a '
    + 'tangled, thrilling contest on a stage where history can be overturned. It is a game of reading '
    + 'other players, and the best company an evening can have: this is San Guo Sha.',
    '',
    '___',
    '',
    '## Components',
    '',
    'The game uses four kinds of card: role cards, HP cards, character cards and game cards.',
    '',
    '8 role cards: 1 Lord, 2 Loyalists, 4 Rebels, 1 Renegade; 25 character cards; 104 game cards '
    + 'plus 4 EX game cards; 8 HP cards.',
    '',
    '___',
    '',
    '## Objective',
    '',
    'Your objective is set by the role card you draw. Each role wins on its own terms:',
    '',
    '- Lord: destroy every Rebel and the Renegade, and bring peace to the realm.',
    '- Loyalist: protect the Lord at any cost. Wins exactly when the Lord wins.',
    '- Rebel: kill the Lord and overthrow his rule.',
    '- Renegade: eliminate everyone but yourself and be the last one standing.',
    '',
    '___',
    '',
    '## Dealing roles',
    '',
    'Take as many role cards as there are players, following this table:',
    '',
    '| Players | Lord | Loyalist | Rebel | Renegade |',
    '| ------- | ---- | -------- | ----- | -------- |',
    '| 2       | 1    | 0        | 1     | 0        |',
    '| 3       | 1    | 0        | 1     | 1        |',
    '| 4       | 1    | 1        | 1     | 1        |',
    '| 5       | 1    | 1        | 2     | 1        |',
    '| 6       | 1    | 1        | 3     | 1        |',
    '| 7       | 1    | 2        | 3     | 1        |',
    '| 8       | 1    | 2        | 4     | 1        |',
    '',
    'Deal one role card to each player at random. Whoever draws the Lord reveals it at once (place '
    + 'the Lord card face up in front of you); everyone else keeps their role card hidden.',
    '',
    '___',
    '',
    '## Choosing characters',
    '',
    'Character cards and their special abilities are where the variety and the fun of the game come '
    + 'from, but they also make it more complicated. If this is your first game, leave the character '
    + 'cards out — skip this section and go on to "Dealing HP". Once you have the gist of the game, '
    + 'add characters in and choose them as follows.',
    '',
    'First give the player with the Lord role (the "Lord player") Cao Cao, Liu Bei and Sun Quan, plus '
    + '2 more character cards drawn at random: 5 cards in all. The Lord player picks one character to '
    + 'play and shows the chosen card to everyone.',
    '',
    'Shuffle the remaining 24 character cards and deal 3 to each of the other players (2 each in a '
    + '10-player game). Each player picks one and places it face down in front of them; once everyone '
    + 'has chosen, all reveal at the same time. Shuffle the unchosen character cards and set them '
    + 'aside face down.',
    '',
    '___',
    '',
    '## Dealing HP',
    '',
    'Take the HP card matching your character’s max HP (count the yin-yang fish) and cover its left '
    + 'side with the character card.',
    '',
    'The Lord gets 1 extra max HP on top of the character’s own (not in a 4-player game).',
    '',
    'So a 3-HP character played as the Lord has a max HP of 4, and uses the 4-HP card.',
    '',
    'Place the HP card under the character card so that the current HP shows. When you lose HP, slide '
    + 'the character card right to cover the HP you have lost.',
    '',
    '___',
    '',
    '## The turn',
    '',
    'Shuffle the game cards and deal 4 at random to each player as their opening hand (hand cards: '
    + 'the cards you hold).',
    '',
    'Put the rest in the middle of the table as the draw pile. Cards players discard go to one side '
    + 'and form the discard pile, which is always kept face up.',
    '',
    'Play begins with the Lord and proceeds anticlockwise, in turns.',
    '',
    'That is: each player has a turn of their own, and when one player’s turn ends, the turn of the '
    + 'player to their right begins, and so on around the table.',
    '',
    'Each player’s turn has six phases:',
    '',
    '1. Prepare phase',
    '',
    '2. Judge phase',
    '',
    '3. Draw phase',
    '',
    '4. Action phase',
    '',
    '5. Discard phase',
    '',
    '6. Finish phase',
    '',
    'Each phase in turn:',
    '',
    '### Prepare phase',
    '',
    'Usually skipped. Some characters have skills that trigger in this phase.',
    '',
    '### Judge phase',
    '',
    'If there are delayed trick cards in front of you, you must perform a judgement for each of them '
    + 'in order.',
    '',
    'If two or more delayed tricks are in front of you, judge the one placed on you last first (the '
    + 'one placed earliest is judged last).',
    '',
    '### Draw phase',
    '',
    'Draw 2 cards from the top of the draw pile.',
    '',
    'Unless stated otherwise, "draw N cards" always means from the top of the draw pile.',
    '',
    'If you need to draw, or something is about to affect the draw pile, and the draw pile is empty, '
    + 'shuffle the discard pile at once to form a new draw pile.',
    '',
    '### Action phase',
    '',
    'You may use any number of cards, from none upwards, to strengthen yourself or attack others, '
    + 'subject to two rules:',
    '',
    '1. You may only use one Slash per action phase.',
    '',
    '2. No player may have two cards of the same name in their judgement area or their equip area.',
    '',
    'Each card takes effect as you use it; see "The game cards in detail". Unless stated otherwise, '
    + 'a game card goes to the discard pile after it is used.',
    '',
    '### Discard phase',
    '',
    'When you do not want to, or cannot, play any more cards, you enter the discard phase. Check '
    + 'whether you hold more hand cards than your current HP (your hand limit equals your current HP); '
    + 'discard one hand card for each card over the limit.',
    '',
    '### Finish phase',
    '',
    'Usually skipped. Some characters have skills that trigger in this phase.',
    '',
    '___',
    '',
    '## Notes',
    '',
    '1. Unless stated otherwise, drawing always means drawing from the top of the draw pile.',
    '',
    '2. Game cards that players use, play or discard go to one side and form the discard pile, which '
    + 'is always kept face up.',
    '',
    '3. When the draw pile is empty, shuffle the discard pile at once to form a new draw pile.',
    '',
    '4. Max HP and current HP are not the same thing; keep the difference in mind.',
    '',
    '___',
    '',
    '## Death',
    '',
    'When a character’s HP falls to 0 or below they are dying. Unless they or somebody else saves '
    + 'them with a Peach at that moment, the character dies. On death, discard all of that '
    + 'character’s cards and the cards in their judgement area, and reveal their role card.',
    '',
    'Anyone who kills a Rebel — including a Rebel who kills another Rebel — immediately draws 3 cards.',
    '',
    'If the Lord kills a Loyalist, the Lord must immediately discard every hand card and every '
    + 'equipped card.',
    '',
    '___',
    '',
    '## End of the game',
    '',
    'The game ends the moment either of these happens:',
    '',
    '1. The Lord is killed. If the Renegade is then the only surviving player (exactly one Renegade '
    + 'alive), the Renegade wins; in every other case the Rebels win, alive or dead.',
    '',
    '2. Every Rebel and the Renegade are dead: the Lord and the Loyalists win, alive or dead.',
    '',
    '(Source: https://sgs.52pk.com/zl/201205/5299813.shtml )',
  ].join('\n'),

  /* --- 4. Kingdom names, with upstream's Markdown asterisks removed. ------- */
  wei: 'Wei',
  shu: 'Shu',
  wu: 'Wu',
  qun: 'Neutral',
};
