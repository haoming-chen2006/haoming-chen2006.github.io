#!/usr/bin/env node
// Hollowmere audio pipeline (audio agent). Downloads CC0 / CC-BY sources, cuts + processes them with
// ffmpeg into public/assets/audio/{music,amb,sfx}/*.mp3, and generates:
//   - public/assets/audio/CREDITS.txt      (every source, author, license, URL)
//   - src/audio/manifest.generated.ts      (id -> file, duration, loop length)
//
// Usage: node scripts/fetch-audio.mjs [--force] [--only=<substr>] [--no-download]
//   AUDIO_SRC_DIR=<dir>   where raw downloads are cached (default: <os tmp>/hollowmere-audio-src)
// Needs: curl, unzip, ffmpeg, ffprobe on PATH (or FFMPEG=/path/to/ffmpeg).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/assets/audio');
const CACHE = process.env.AUDIO_SRC_DIR || path.join(os.tmpdir(), 'hollowmere-audio-src');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || (process.env.FFMPEG ? path.join(path.dirname(process.env.FFMPEG), 'ffprobe') : 'ffprobe');
const FORCE = process.argv.includes('--force');
const NO_DL = process.argv.includes('--no-download');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);

// ---------------------------------------------------------------------------------------------
// Sources. license: 'CC0' | 'CC-BY 3.0' | 'CC-BY 4.0'. zip: true => members addressed by path inside.
// ---------------------------------------------------------------------------------------------
const OGA = 'https://opengameart.org/sites/default/files/';
const INC = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/';
const SOURCES = {
  kenney_rpg: { url: 'https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip', zip: true, title: 'RPG Audio', author: 'Kenney (kenney.nl)', license: 'CC0', page: 'https://kenney.nl/assets/rpg-audio' },
  kenney_impact: { url: 'https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip', zip: true, title: 'Impact Sounds', author: 'Kenney (kenney.nl)', license: 'CC0', page: 'https://kenney.nl/assets/impact-sounds' },
  kenney_interface: { url: 'https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip', zip: true, title: 'Interface Sounds', author: 'Kenney (kenney.nl)', license: 'CC0', page: 'https://kenney.nl/assets/interface-sounds' },
  kenney_ui: { url: 'https://kenney.nl/media/pages/assets/ui-audio/490d233f68-1677590494/kenney_ui-audio.zip', zip: true, title: 'UI Audio', author: 'Kenney (kenney.nl)', license: 'CC0', page: 'https://kenney.nl/assets/ui-audio' },
  rd80: { url: OGA + '80-CC0-RPG-SFX_0.zip', zip: true, title: '80 CC0 RPG SFX', author: 'rubberduck', license: 'CC0', page: 'https://opengameart.org/content/80-cc0-rpg-sfx' },
  rd100: { url: OGA + 'sfx_100_v2.zip', zip: true, title: '100 CC0 SFX #2', author: 'rubberduck', license: 'CC0', page: 'https://opengameart.org/content/100-cc0-sfx-2' },
  rpgpack: { url: OGA + 'rpg_sound_pack.zip', zip: true, title: 'RPG Sound Pack', author: 'artisticdude', license: 'CC0', page: 'https://opengameart.org/content/rpg-sound-pack' },
  swishes: { url: OGA + 'swishes.zip', zip: true, title: 'Swishes Sound Pack', author: 'artisticdude', license: 'CC0', page: 'https://opengameart.org/content/swishes-sound-pack' },
  freeze: { url: OGA + 'freeze.wav', title: 'Freeze Spell', author: 'artisticdude', license: 'CC0', page: 'https://opengameart.org/content/freeze-spell-0' },
  sword: { url: OGA + 'sword_-_starninjas_1.zip', zip: true, title: '20 Sword Sound Effects (Attacks and Clashes)', author: 'StarNinjas', license: 'CC0', page: 'https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes' },
  swordclash: { url: OGA + 'sword_clash_-_starninjas_0.zip', zip: true, title: '20 Sword Sound Effects (Attacks and Clashes)', author: 'StarNinjas', license: 'CC0', page: 'https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes' },
  monsters: { url: OGA + 'monster_-_starninjas.zip', zip: true, title: '16 Monster Growls', author: 'StarNinjas', license: 'CC0', page: 'https://opengameart.org/content/16-monster-growls' },
  bones: { url: OGA + 'bones_rattle.zip', zip: true, title: 'Bones rattle', author: 'congusbongus', license: 'CC0', page: 'https://opengameart.org/content/bones-rattle' },
  bones2: { url: OGA + 'bones-2.wav', title: 'Bones 2', author: 'AntumDeluge', license: 'CC0', page: 'https://opengameart.org/content/bones-2' },
  fire1: { url: OGA + 'fire-1.wav', title: 'Fire Crackling', author: 'AntumDeluge', license: 'CC0', page: 'https://opengameart.org/content/fire-crackling' },
  skel1: { url: OGA + 'skeleton1sfx_0.wav', title: 'SkeletonSFXShortPack', author: 'Colodical', license: 'CC0', page: 'https://opengameart.org/content/skeletonsfxshortpack' },
  skel2: { url: OGA + 'skeleton2sfx_0.wav', title: 'SkeletonSFXShortPack', author: 'Colodical', license: 'CC0', page: 'https://opengameart.org/content/skeletonsfxshortpack' },
  magical1: { url: OGA + 'magical_1_0.ogg', title: 'Magic Spell SFX', author: 'JaggedStone', license: 'CC0', page: 'https://opengameart.org/content/magic-spell-sfx' },
  magical2: { url: OGA + 'magical_2.ogg', title: 'Magic Spell SFX', author: 'JaggedStone', license: 'CC0', page: 'https://opengameart.org/content/magic-spell-sfx' },
  magical3: { url: OGA + 'magical_3.ogg', title: 'Magic Spell SFX', author: 'JaggedStone', license: 'CC0', page: 'https://opengameart.org/content/magic-spell-sfx' },
  magical4: { url: OGA + 'magical_4.ogg', title: 'Magic Spell SFX', author: 'JaggedStone', license: 'CC0', page: 'https://opengameart.org/content/magic-spell-sfx' },
  magical5: { url: OGA + 'magical_5.ogg', title: 'Magic Spell SFX', author: 'JaggedStone', license: 'CC0', page: 'https://opengameart.org/content/magic-spell-sfx' },
  magical6: { url: OGA + 'magical_6_0.ogg', title: 'Magic Spell SFX', author: 'JaggedStone', license: 'CC0', page: 'https://opengameart.org/content/magic-spell-sfx' },
  dungeon: { url: OGA + 'dungeon_ambient_1_0.ogg', title: 'Loopable Dungeon Ambience', author: 'JaggedStone', license: 'CC0', page: 'https://opengameart.org/content/loopable-dungeon-ambience' },
  ghostmoans: { url: OGA + 'qubodup-GhostMoans.zip', zip: true, title: 'Ghost Monster Voice Moaning & Growling', author: 'qubodup', license: 'CC0', page: 'https://opengameart.org/content/ghost-monster-voice-moaning-growling' },
  ghostbreath: { url: OGA + 'ghostbreath.flac', title: 'Ghost breath', author: 'qubodup', license: 'CC0', page: 'https://opengameart.org/content/ghost-breath' },
  yelling: { url: OGA + 'yelling%20sounds.zip', zip: true, title: 'Male Grunt/Yelling sounds', author: 'HaelDB', license: 'CC0', page: 'https://opengameart.org/content/male-gruntyelling-sounds' },
  grunts: { url: OGA + 'death%20pain%20grunts.wav', title: 'grunts of male death and pain', author: 'thebardofblasphemy', license: 'CC0', page: 'https://opengameart.org/content/grunts-male-death-and-pain' },
  heartbeat: { url: OGA + 'heartbeat_slow_0.wav', title: 'Heartbeat sounds', author: 'bart', license: 'CC0', page: 'https://opengameart.org/content/heartbeat-sounds' },
  drips: { url: OGA + 'atmosbasement.mp3_.flac', title: 'Dripping water loop', author: 'Independent.nu', license: 'CC0', page: 'https://opengameart.org/content/dripping-water-loop' },
  fire: { url: OGA + 'fire.wav', title: 'Fireplace Sound loop', author: 'PagDev', license: 'CC0', page: 'https://opengameart.org/content/fireplace-sound-loop' },
  crickets: { url: OGA + 'crickets_1.mp3', title: 'Crickets Ambient Noise - loopable', author: 'Wolfgang_', license: 'CC0', page: 'https://opengameart.org/content/crickets-ambient-noise-loopable' },
  birds: { url: OGA + 'birds-isaiah658_0.ogg', title: 'Ambient Bird Sounds', author: 'isaiah658', license: 'CC0', page: 'https://opengameart.org/content/ambient-bird-sounds' },
  birdsCrickets: { url: OGA + 'birdsCrickets.zip', zip: true, title: 'Bird, cricket, frog and mosquito sounds', author: 'Aj_', license: 'CC0', page: 'https://opengameart.org/content/birdcricketfrog-and-mosquito-sounds' },
  vistula: { url: OGA + 'VistulaShort_0.mp3', title: 'Sea and river wave sounds (Vistula, short)', author: 'RandomMind', license: 'CC0', page: 'https://opengameart.org/content/sea-and-river-wave-sounds' },
  wind3: { url: OGA + 'wind3.wav', title: 'wind1 (wind3.wav)', author: 'Luke.RUSTLTD', license: 'CC0', page: 'https://opengameart.org/content/wind1' },
  cavern: { url: OGA + 'dark_cavern_ambient_001.ogg', title: 'Dark Cavern Ambient', author: 'Paul Wortmann', license: 'CC0', page: 'https://opengameart.org/content/dark-cavern-ambient' },
  dice1: { url: OGA + 'Holzw%C3%BCrfel_auf_Holztisch_1.flac', title: 'Wooden dice on wooden table roll', author: 'Wuzzy', license: 'CC0', page: 'https://opengameart.org/content/wooden-dice-on-wodden-table-roll' },
  dice2: { url: OGA + 'Holzw%C3%BCrfel_auf_Holztisch_2.flac', title: 'Wooden dice on wooden table roll', author: 'Wuzzy', license: 'CC0', page: 'https://opengameart.org/content/wooden-dice-on-wodden-table-roll' },
  dice3: { url: OGA + 'Holzw%C3%BCrfel_auf_Holztisch_3.flac', title: 'Wooden dice on wooden table roll', author: 'Wuzzy', license: 'CC0', page: 'https://opengameart.org/content/wooden-dice-on-wodden-table-roll' },
  dice4: { url: OGA + 'Holzw%C3%BCrfel_auf_Holztisch_4.flac', title: 'Wooden dice on wooden table roll', author: 'Wuzzy', license: 'CC0', page: 'https://opengameart.org/content/wooden-dice-on-wodden-table-roll' },
  joth: { url: OGA + 'UISoundEffects.zip', zip: true, title: '7 Assorted Sound Effects (Menu, Level Up)', author: 'Joth', license: 'CC0', page: 'https://opengameart.org/content/7-assorted-sound-effects-menu-level-up' },
  victory: { url: OGA + 'Victory.wav', title: 'Victory', author: 'celestialghost8', license: 'CC0', page: 'https://opengameart.org/content/victory' },
  fanfare: { url: OGA + 'Heavy_ConceptB.wav', title: 'Victory Fanfare Short', author: 'cynicmusic (cynicmusic.com / pixelsphere.org)', license: 'CC0', page: 'https://opengameart.org/content/victory-fanfare-short' },
  thunder: { url: OGA + 'gregor_quendel_-_free_thunder_ambience_-_mp3_0.mp3', title: 'Thunder / Lightning Ambience - Field Recording', author: 'Gregor Quendel', license: 'CC-BY 4.0', page: 'https://opengameart.org/content/thunder-lightning-ambience-field-recording' },
  // Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 4.0
  km_lost_frontier: { url: INC + 'Lost%20Frontier.mp3', title: 'Lost Frontier', author: 'Kevin MacLeod (incompetech.com)', license: 'CC-BY 4.0', page: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100227' },
  km_angevin: { url: INC + 'Angevin.mp3', title: 'Angevin', author: 'Kevin MacLeod (incompetech.com)', license: 'CC-BY 4.0', page: 'https://incompetech.com/music/royalty-free/music.html' },
  km_midnight_tale: { url: INC + 'Midnight%20Tale.mp3', title: 'Midnight Tale', author: 'Kevin MacLeod (incompetech.com)', license: 'CC-BY 4.0', page: 'https://incompetech.com/music/royalty-free/music.html' },
  km_long_note_three: { url: INC + 'Long%20Note%20Three.mp3', title: 'Long Note Three', author: 'Kevin MacLeod (incompetech.com)', license: 'CC-BY 4.0', page: 'https://incompetech.com/music/royalty-free/music.html' },
  km_ossuary1: { url: INC + 'Ossuary%201%20-%20A%20Beginning.mp3', title: 'Ossuary 1 - A Beginning', author: 'Kevin MacLeod (incompetech.com)', license: 'CC-BY 4.0', page: 'https://incompetech.com/music/royalty-free/music.html' },
  km_ossuary6: { url: INC + 'Ossuary%206%20-%20Air.mp3', title: 'Ossuary 6 - Air', author: 'Kevin MacLeod (incompetech.com)', license: 'CC-BY 4.0', page: 'https://incompetech.com/music/royalty-free/music.html' },
  km_volatile: { url: INC + 'Volatile%20Reaction.mp3', title: 'Volatile Reaction', author: 'Kevin MacLeod (incompetech.com)', license: 'CC-BY 4.0', page: 'https://incompetech.com/music/royalty-free/music.html' },
  km_truth: { url: INC + 'Truth%20of%20the%20Legend.mp3', title: 'Truth of the Legend', author: 'Kevin MacLeod (incompetech.com)', license: 'CC-BY 4.0', page: 'https://incompetech.com/music/royalty-free/music.html' },
  km_long_road: { url: INC + 'Long%20Road%20Ahead.mp3', title: 'Long Road Ahead', author: 'Kevin MacLeod (incompetech.com)', license: 'CC-BY 4.0', page: 'https://incompetech.com/music/royalty-free/music.html' },
  km_private: { url: INC + 'Private%20Reflection.mp3', title: 'Private Reflection', author: 'Kevin MacLeod (incompetech.com)', license: 'CC-BY 4.0', page: 'https://incompetech.com/music/royalty-free/music.html' },
  km_bighit1: { url: INC + 'Danse%20Macabre%20-%20Big%20Hit%201.mp3', title: 'Danse Macabre - Big Hit 1', author: 'Kevin MacLeod (incompetech.com)', license: 'CC-BY 4.0', page: 'https://incompetech.com/music/royalty-free/music.html' },
  km_bighit2: { url: INC + 'Danse%20Macabre%20-%20Big%20Hit%202.mp3', title: 'Danse Macabre - Big Hit 2', author: 'Kevin MacLeod (incompetech.com)', license: 'CC-BY 4.0', page: 'https://incompetech.com/music/royalty-free/music.html' },
};

// ---------------------------------------------------------------------------------------------
// Outputs. Fields: out (relative to public/assets/audio, without .mp3), src, m (zip member),
// ss/t (trim seconds), loop (crossfade seconds -> seamless loop of length t), hp/lp (Hz),
// pitch (semitones), stereo (default mono), q (LAME VBR 0-9), peak (target dBFS), fadeOut/fadeIn (s)
// ---------------------------------------------------------------------------------------------
const K = (n) => 'Audio/' + n + '.ogg';
const O = [];
const add = (out, src, extra = {}) => O.push({ out, src, ...extra });
const seq = (prefix, src, names, extra = {}) => names.forEach((n, i) => add(`${prefix}_${i + 1}`, src, { m: n, ...extra }));

// ---- music (stereo) ----
const MUSIC = { stereo: true, q: 7, peak: -1.0, lp: 16000 };
add('music/menu', 'km_lost_frontier', { ...MUSIC, q: 8, ss: 0, t: 132, loop: 6 });
add('music/explore', 'km_angevin', { ...MUSIC, ss: 0, t: 140, loop: 5 });
add('music/camp', 'km_midnight_tale', { ...MUSIC, q: 8, ss: 0, t: 150, loop: 4 });
add('music/tension', 'km_long_note_three', { ...MUSIC, q: 8, ss: 0, t: 96, loop: 6 });
add('music/crypt_explore', 'km_ossuary1', { ...MUSIC, q: 8, ss: 0, t: 120, loop: 6 });
add('music/crypt_tension', 'km_ossuary6', { ...MUSIC, q: 8, ss: 0, t: 120, loop: 6 });
add('music/combat', 'km_volatile', { ...MUSIC, ss: 0, t: 150, loop: 2.7 });
add('music/boss', 'km_truth', { ...MUSIC, ss: 0, t: 90, loop: 3.6 });
add('music/ending', 'km_long_road', { ...MUSIC, ss: 0, t: 147 });
add('music/death', 'km_private', { ...MUSIC, q: 8, ss: 0, t: 42, fadeOut: 6 });
add('music/sting_bighit_1', 'km_bighit1', { ...MUSIC, q: 6 });
add('music/sting_bighit_2', 'km_bighit2', { ...MUSIC, q: 6 });
add('music/sting_victory', 'fanfare', { ...MUSIC, q: 6, ss: 0, t: 9, fadeOut: 2.5 });
add('music/sting_victory_short', 'victory', { ...MUSIC, q: 6 });
add('music/sting_levelup', 'joth', { ...MUSIC, q: 6, m: 'Level Up.mp3' });
add('music/sting_learn', 'joth', { ...MUSIC, q: 6, m: 'Ability Learn.mp3' });

// ---- ambience loops (mono) ----
const AMB = { q: 7, peak: -3.0 };
add('amb/lake_water', 'vistula', { ...AMB, ss: 60, t: 48, loop: 4, hp: 60 });
add('amb/wind_pines', 'wind3', { ...AMB, ss: 2, t: 45, loop: 4 });
add('amb/birds_day', 'birds', { ...AMB, ss: 0, t: 30, loop: 1.5 });
add('amb/crickets', 'crickets', { ...AMB, ss: 0, t: 11, loop: 0.8 });
add('amb/campfire', 'fire', { ...AMB, ss: 0.5, t: 27, loop: 2, hp: 70 });
add('amb/torch', 'fire', { ...AMB, ss: 8, t: 14, loop: 1.5, hp: 400, pitch: 3 });
add('amb/crypt_drone', 'cavern', { ...AMB, ss: 0, t: 60, loop: 6, lp: 4000 });
add('amb/crypt_texture', 'dungeon', { ...AMB, ss: 0, t: 60, loop: 6 });
add('amb/crypt_drips', 'drips', { ...AMB, ss: 0, t: 19.5, loop: 1 });
add('amb/heartbeat', 'heartbeat', { ...AMB, peak: -1, lp: 600 });
add('amb/thunder_far_1', 'thunder', { ...AMB, ss: 639, t: 12, fadeIn: 0.3, fadeOut: 3, lp: 900 });
add('amb/thunder_far_2', 'thunder', { ...AMB, ss: 294, t: 9, fadeIn: 0.3, fadeOut: 2.5, lp: 900 });
add('amb/thunder_far_3', 'thunder', { ...AMB, ss: 133, t: 12, fadeIn: 0.3, fadeOut: 3, lp: 900 });
add('amb/thunder_near', 'rd100', { ...AMB, m: 'sfx100v2_thunder_01.ogg', peak: -1 });
add('amb/ghost_moan_1', 'ghostmoans', { ...AMB, m: 'qubodup-GhostMoans/wav/qubodup-GhostMoan01.wav', pitch: -4, peak: -4 });
add('amb/ghost_moan_2', 'ghostmoans', { ...AMB, m: 'qubodup-GhostMoans/wav/qubodup-GhostMoan05.wav', pitch: -3, peak: -4 });
add('amb/ghost_moan_3', 'ghostmoans', { ...AMB, m: 'qubodup-GhostMoans/wav/qubodup-GhostMoan04.wav', pitch: -5, peak: -4 });
add('amb/ghost_breath', 'ghostbreath', { ...AMB, peak: -4 });

// ---- sfx (mono unless noted) ----
const SFX = { q: 4, peak: -1.0 };
// footsteps
seq('sfx/step_grass', 'kenney_impact', [0, 1, 2, 3, 4].map((i) => K(`footstep_grass_00${i}`)), SFX);
seq('sfx/step_stone', 'kenney_impact', [0, 1, 2, 3, 4].map((i) => K(`footstep_concrete_00${i}`)), SFX);
seq('sfx/step_wood', 'kenney_impact', [0, 1, 2, 3, 4].map((i) => K(`footstep_wood_00${i}`)), SFX);
seq('sfx/step_dirt', 'kenney_rpg', ['00', '01', '02', '03', '04', '05'].map((i) => K(`footstep${i}`)), SFX);
seq('sfx/step_water', 'rd100', [1, 2, 3].map((i) => `sfx100v2_footstep_wet_0${i}.ogg`), SFX);
// swings / whooshes
seq('sfx/whoosh_light', 'swishes', [1, 3, 4, 6, 7, 9].map((i) => `swishes/swish-${i}.wav`), SFX);
seq('sfx/blade_swish', 'rd80', [1, 2, 3].map((i) => `blade_0${i}.ogg`), SFX);
// StarNinjas swings have 0.1-0.26 s of pre-roll before the swish; trim so the whoosh lands on the swing frame
[[3, 0.14], [4, 0.085], [7, 0.12], [8, 0.195], [1, 0.16]].forEach(([i, ss], k) => add(`sfx/sword_swing_${k + 1}`, 'sword', { ...SFX, m: `sword - StarNinjas/sword.${i}.ogg`, ss }));
// impacts
seq('sfx/hit_flesh', 'kenney_impact', [0, 1, 2, 3].map((i) => K(`impactPunch_heavy_00${i}`)), SFX);
seq('sfx/hit_flesh_light', 'kenney_impact', [0, 1, 2].map((i) => K(`impactPunch_medium_00${i}`)), SFX);
seq('sfx/hit_slash', 'kenney_impact', [0, 1, 2].map((i) => K(`impactMetal_light_00${i}`)), SFX);
add('sfx/hit_slash_4', 'rd100', { ...SFX, m: 'sfx100v2_hit_03.ogg' });
add('sfx/hit_slash_5', 'rd100', { ...SFX, m: 'sfx100v2_metal_hit_02.ogg' });
seq('sfx/hit_metal', 'kenney_impact', [0, 1, 2, 3].map((i) => K(`impactMetal_heavy_00${i}`)), SFX);
seq('sfx/hit_plate', 'kenney_impact', [0, 1, 2].map((i) => K(`impactPlate_medium_00${i}`)), SFX);
seq('sfx/shield_wood', 'kenney_impact', [0, 1, 2].map((i) => K(`impactWood_heavy_00${i}`)), SFX);
seq('sfx/parry', 'swordclash', [2, 3, 5, 10].map((i) => `sword_clash.${i}.ogg`), SFX);
add('sfx/metal_ring', 'rpgpack', { ...SFX, m: 'RPG Sound Pack/inventory/metal-ringing.wav' });
seq('sfx/bone', 'bones', [0, 1, 2, 3, 5, 6].map((i) => `${i}.ogg`), SFX);
add('sfx/bone_pile', 'bones2', SFX);
add('sfx/skeleton_rise', 'skel1', SFX);
add('sfx/skeleton_hit', 'skel2', SFX);
seq('sfx/body_fall', 'kenney_impact', [0, 1, 2].map((i) => K(`impactSoft_heavy_00${i}`)), SFX);
seq('sfx/cloth', 'kenney_rpg', [1, 2, 3, 4].map((i) => K(`cloth${i}`)), SFX);
// voice (player, male)
seq('sfx/grunt_effort', 'yelling', [3, 4, 5].map((i) => `yelling sounds/3grunt${i}.wav`), SFX);
add('sfx/grunt_hurt_1', 'grunts', { ...SFX, ss: 6.94, t: 0.42, fadeOut: 0.08 });
add('sfx/grunt_hurt_2', 'grunts', { ...SFX, ss: 8.36, t: 0.79, fadeOut: 0.1 });
add('sfx/grunt_hurt_3', 'grunts', { ...SFX, ss: 29.87, t: 0.44, fadeOut: 0.08 });
add('sfx/grunt_hurt_4', 'grunts', { ...SFX, ss: 27.59, t: 0.88, fadeOut: 0.1 });
add('sfx/grunt_death_1', 'grunts', { ...SFX, ss: 3.96, t: 2.12, fadeOut: 0.3 });
add('sfx/grunt_death_2', 'grunts', { ...SFX, ss: 35.98, t: 1.32, fadeOut: 0.2 });
add('sfx/breath_exhausted', 'yelling', { ...SFX, m: 'yelling sounds/3grunt6.wav', peak: -6 });
// creatures
seq('sfx/roar', 'rd80', [1, 2, 3].map((i) => `creature_roar_0${i}.ogg`), SFX);
seq('sfx/creature_hurt', 'rd80', [1, 2].map((i) => `creature_hurt_0${i}.ogg`), SFX);
add('sfx/creature_die', 'rd80', { ...SFX, m: 'creature_die_01.ogg' });
seq('sfx/growl', 'monsters', [2, 4, 6].map((i) => `monster.${i}.ogg`), SFX);
// spells
seq('sfx/spell_fire', 'rd80', [1, 2, 6, 7].map((i) => `spell_fire_0${i}.ogg`), SFX);
add('sfx/spell_fire_big', 'rd80', { ...SFX, m: 'spell_fire_03.ogg' });
seq('sfx/spell_generic', 'rd80', [1, 2].map((i) => `spell_0${i}.ogg`), SFX);
[1, 2, 3, 4, 5, 6].forEach((i) => add(`sfx/magic_${i}`, `magical${i}`, SFX));
add('sfx/spell_frost', 'freeze', SFX);
add('sfx/spell_cast', 'rpgpack', { ...SFX, m: 'RPG Sound Pack/battle/magic1.wav' });
add('sfx/spell_long', 'rpgpack', { ...SFX, m: 'RPG Sound Pack/battle/spell.wav' });
// items / inventory
seq('sfx/coins', 'rd80', [1, 2, 3].map((i) => `item_coins_0${i}.ogg`), SFX);
seq('sfx/coins_handle', 'kenney_rpg', ['handleCoins', 'handleCoins2'].map(K), SFX);
seq('sfx/leather', 'kenney_rpg', ['dropLeather', 'handleSmallLeather', 'handleSmallLeather2'].map(K), SFX);
seq('sfx/cloth_belt', 'kenney_rpg', ['clothBelt', 'clothBelt2', 'beltHandle1'].map(K), SFX);
seq('sfx/metal_click', 'kenney_rpg', ['metalClick', 'metalLatch'].map(K), SFX);
seq('sfx/chainmail', 'rpgpack', [1, 2].map((i) => `RPG Sound Pack/inventory/chainmail${i}.wav`), SFX);
add('sfx/armor_light', 'rpgpack', { ...SFX, m: 'RPG Sound Pack/inventory/armor-light.wav' });
seq('sfx/sword_draw', 'rpgpack', [1, 2].map((i) => `RPG Sound Pack/battle/sword-unsheathe${i === 1 ? '' : i}.wav`), SFX);
add('sfx/bottle', 'rpgpack', { ...SFX, m: 'RPG Sound Pack/inventory/bottle.wav' });
seq('sfx/bubble', 'rpgpack', ['bubble', 'bubble2', 'bubble3'].map((n) => `RPG Sound Pack/inventory/${n}.wav`), SFX);
seq('sfx/gem', 'rd80', [1, 2, 3].map((i) => `item_gem_0${i}.ogg`), SFX);
seq('sfx/item_misc', 'rd80', [1, 2, 3].map((i) => `item_misc_0${i}.ogg`), SFX);
seq('sfx/book_flip', 'kenney_rpg', ['bookFlip1', 'bookFlip2', 'bookFlip3'].map(K), SFX);
add('sfx/book_open', 'kenney_rpg', { ...SFX, m: K('bookOpen') });
add('sfx/book_close', 'kenney_rpg', { ...SFX, m: K('bookClose') });
seq('sfx/book_place', 'kenney_rpg', ['bookPlace1', 'bookPlace2'].map(K), SFX);
// world / props
seq('sfx/door_open', 'kenney_rpg', ['doorOpen_1', 'doorOpen_2'].map(K), SFX);
seq('sfx/door_close', 'kenney_rpg', ['doorClose_1', 'doorClose_2', 'doorClose_4'].map(K), SFX);
seq('sfx/creak', 'kenney_rpg', ['creak1', 'creak2', 'creak3'].map(K), SFX);
seq('sfx/lock', 'rd80', [1, 2, 3].map((i) => `lock_0${i}.ogg`), SFX);
add('sfx/lock_open', 'rd100', { ...SFX, m: 'sfx100v2_lock_open_01.ogg' });
seq('sfx/stones', 'rd80', [1, 2, 3].map((i) => `stones_0${i}.ogg`), SFX);
seq('sfx/stone_heavy', 'rd100', [1, 2, 3].map((i) => `sfx100v2_stones_0${i}.ogg`), SFX);
seq('sfx/chain', 'rd80', [1, 2, 3].map((i) => `chain_0${i}.ogg`), SFX);
add('sfx/air_whoosh', 'rd100', { ...SFX, m: 'sfx100v2_air_01.ogg' });
add('sfx/air_whoosh_short', 'rd100', { ...SFX, m: 'sfx100v2_air_02.ogg' });
add('sfx/fire_flare', 'fire1', SFX);
seq('sfx/wood_hit', 'rd100', [1, 2].map((i) => `sfx100v2_wood_hit_0${i}.ogg`), SFX);
seq('sfx/metal_hit', 'rd100', [1, 2].map((i) => `sfx100v2_metal_hit_0${i}.ogg`), SFX);
seq('sfx/hit_generic', 'rd100', [1, 2, 3].map((i) => `sfx100v2_hit_0${i}.ogg`), SFX);
// dice
[1, 2, 3, 4].forEach((i) => add(`sfx/dice_${i}`, `dice${i}`, SFX));
// nature one-shots
add('sfx/bird_1', 'birdsCrickets', { ...SFX, m: 'birdsCrickets/bird.wav', peak: -6 });
add('sfx/bird_2', 'birdsCrickets', { ...SFX, m: 'birdsCrickets/bird2.wav', peak: -6 });
add('sfx/bird_night', 'birdsCrickets', { ...SFX, m: 'birdsCrickets/birdNight.wav', peak: -8 });
add('sfx/frog', 'birdsCrickets', { ...SFX, m: 'birdsCrickets/frog.wav', peak: -8 });
// ui (Kenney)
const KI = (n) => 'Audio/' + n + '.ogg';
const UI = { ...SFX, peak: -3 };
seq('sfx/ui_click', 'kenney_interface', ['click_001', 'click_002', 'click_003'].map(KI), UI);
seq('sfx/ui_hover', 'kenney_ui', ['rollover1', 'rollover2', 'rollover3'].map(KI), { ...UI, peak: -9 });
seq('sfx/ui_select', 'kenney_interface', ['select_001', 'select_002'].map(KI), UI);
add('sfx/ui_open', 'kenney_interface', { ...UI, m: KI('open_001') });
add('sfx/ui_close', 'kenney_interface', { ...UI, m: KI('close_001') });
add('sfx/ui_back', 'kenney_interface', { ...UI, m: KI('back_001') });
seq('sfx/ui_confirm', 'kenney_interface', ['confirmation_001', 'confirmation_002'].map(KI), UI);
seq('sfx/ui_error', 'kenney_interface', ['error_004', 'error_006'].map(KI), UI);
seq('sfx/ui_glass', 'kenney_interface', ['glass_001', 'glass_002', 'glass_004'].map(KI), UI);
add('sfx/ui_bong', 'kenney_interface', { ...UI, m: KI('bong_001') });
seq('sfx/ui_tick', 'kenney_interface', ['tick_001', 'tick_002'].map(KI), { ...UI, peak: -6 });
seq('sfx/ui_toggle', 'kenney_interface', ['toggle_001', 'toggle_002'].map(KI), UI);
seq('sfx/ui_pluck', 'kenney_interface', ['pluck_001', 'pluck_002'].map(KI), UI);
seq('sfx/ui_drop', 'kenney_interface', ['drop_001', 'drop_002'].map(KI), UI);
add('sfx/ui_question', 'kenney_interface', { ...UI, m: KI('question_001') });
add('sfx/ui_scroll', 'kenney_interface', { ...UI, m: KI('scroll_001') });

// ---------------------------------------------------------------------------------------------
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0 && !opts.allowFail) throw new Error(`${cmd} ${args.join(' ')}\n${r.stderr || r.stdout}`);
  return r;
}
function download(id, s) {
  const dir = path.join(CACHE, id); fs.mkdirSync(dir, { recursive: true });
  const name = decodeURIComponent(path.basename(new URL(s.url).pathname));
  const file = path.join(dir, name);
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
    if (NO_DL) throw new Error(`missing source ${id} (${file}) and --no-download given`);
    console.log(`  ↓ ${id}: ${s.url}`);
    run('curl', ['-sSL', '-A', 'Mozilla/5.0 (hollowmere audio pipeline)', '--retry', '3', '-o', file, s.url]);
  }
  const head = fs.readFileSync(file).subarray(0, 512).toString('latin1');
  if (/<!doctype|<html/i.test(head)) { fs.unlinkSync(file); throw new Error(`${id}: downloaded an HTML page, not audio (${s.url})`); }
  if (s.zip) {
    const stamp = path.join(dir, '.unzipped');
    if (!fs.existsSync(stamp)) { run('unzip', ['-qo', file, '-d', path.join(dir, 'x')]); fs.writeFileSync(stamp, 'ok'); }
    return path.join(dir, 'x');
  }
  return file;
}
function probe(file) {
  const r = run(FFPROBE, ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels,sample_rate:format=duration', '-of', 'json', file], { allowFail: true });
  try { const j = JSON.parse(r.stdout); return { dur: parseFloat(j.format?.duration ?? '0'), ch: j.streams?.[0]?.channels ?? 0, sr: j.streams?.[0]?.sample_rate }; } catch { return null; }
}
function findMember(root, m) {
  const direct = path.join(root, m); if (fs.existsSync(direct)) return direct;
  // search (zips often have a top-level folder)
  const stack = [root];
  while (stack.length) {
    const d = stack.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!e.name.startsWith('__MACOSX')) stack.push(p); }
      else if (p.endsWith(m) || p.endsWith(path.sep + path.basename(m))) return p;
    }
  }
  throw new Error(`member not found: ${m} under ${root}`);
}
function processOne(o, inputPath) {
  const outFile = path.join(OUT, o.out + '.mp3');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  if (fs.existsSync(outFile) && !FORCE) return { skipped: true, outFile };
  const tmp = path.join(CACHE, '_tmp', o.out.replace(/\//g, '__') + '.wav'); fs.mkdirSync(path.dirname(tmp), { recursive: true });
  const ch = o.stereo ? 'stereo' : 'mono';
  const pre = [`aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=${ch}`];
  if (o.hp) pre.push(`highpass=f=${o.hp}:poles=2`);
  if (o.lp) pre.push(`lowpass=f=${o.lp}:poles=2`);
  if (o.pitch) { const r = Math.pow(2, o.pitch / 12); pre.push(`asetrate=${Math.round(44100 * r)}`, 'aresample=44100'); }
  let graph;
  const inArgs = [];
  // pitch shifting (asetrate) changes the duration, so read enough input that the *output* is t (+ crossfade) long
  const pitchRatio = o.pitch ? Math.pow(2, o.pitch / 12) : 1;
  if (o.ss != null) inArgs.push('-ss', String(o.ss));
  if (o.t != null) inArgs.push('-t', String((o.t + (o.loop ? o.loop : 0)) * pitchRatio));
  if (o.loop) {
    const L = o.t, xf = o.loop;
    graph = `[0:a]${pre.join(',')},asplit=3[a][b][c];` +
      `[a]atrim=0:${xf},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${xf}:curve=qsin[head];` +
      `[b]atrim=${L}:${L + xf},asetpts=PTS-STARTPTS,afade=t=out:st=0:d=${xf}:curve=qsin[tail];` +
      `[head][tail]amix=inputs=2:normalize=0[x];` +
      `[c]atrim=${xf}:${L},asetpts=PTS-STARTPTS[body];` +
      `[x][body]concat=n=2:v=0:a=1[out]`;
  } else {
    const post = [];
    if (o.fadeIn) post.push(`afade=t=in:st=0:d=${o.fadeIn}`);
    graph = `[0:a]${[...pre, ...post].join(',')}[out]`;
  }
  run(FFMPEG, ['-v', 'error', '-y', ...inArgs, '-i', inputPath, '-filter_complex', graph, '-map', '[out]', tmp]);
  // fade-out needs the real duration (after pitch/trim)
  const p = probe(tmp);
  let gainGraph = '';
  if (o.fadeOut && p) gainGraph += `afade=t=out:st=${Math.max(0, p.dur - o.fadeOut)}:d=${o.fadeOut},`;
  // peak normalize
  const vd = run(FFMPEG, ['-v', 'info', '-i', tmp, '-af', 'volumedetect', '-f', 'null', '-'], { allowFail: true });
  const m = /max_volume:\s*(-?[\d.]+) dB/.exec(vd.stderr || '');
  const maxDb = m ? parseFloat(m[1]) : 0;
  const gain = (o.peak ?? -1) - maxDb;
  gainGraph += `volume=${gain.toFixed(2)}dB`;
  run(FFMPEG, ['-v', 'error', '-y', '-i', tmp, '-af', gainGraph, '-codec:a', 'libmp3lame', '-q:a', String(o.q ?? 4), '-write_xing', '1', outFile]);
  fs.unlinkSync(tmp);
  return { outFile, gain };
}

// ---------------------------------------------------------------------------------------------
console.log(`cache: ${CACHE}\nout:   ${OUT}`);
fs.mkdirSync(OUT, { recursive: true });
const used = new Set();
let made = 0, skipped = 0, failed = 0;
const jobs = O.filter((o) => !ONLY || o.out.includes(ONLY));
for (const o of jobs) {
  const s = SOURCES[o.src]; if (!s) { console.error(`unknown source ${o.src} for ${o.out}`); failed++; continue; }
  try {
    const outFile = path.join(OUT, o.out + '.mp3');
    used.add(o.src);
    if (fs.existsSync(outFile) && !FORCE) { skipped++; continue; }
    const root = download(o.src, s);
    const input = s.zip ? findMember(root, o.m) : root;
    const r = processOne(o, input);
    made++;
    const p = probe(r.outFile);
    console.log(`  ✓ ${o.out}.mp3  ${(fs.statSync(r.outFile).size / 1024).toFixed(0)} KB  ${p?.dur.toFixed(2)}s  gain ${r.gain?.toFixed(1)} dB`);
  } catch (e) { failed++; console.error(`  ✗ ${o.out}: ${e.message.split('\n')[0]}`); }
}
console.log(`\nmade ${made}, skipped ${skipped} (exist), failed ${failed}`);

// ---- manifest + credits (always regenerated from what exists on disk) ----
const entries = [];
for (const o of O) {
  const f = path.join(OUT, o.out + '.mp3'); if (!fs.existsSync(f)) continue;
  const p = probe(f); const id = o.out.split('/').pop();
  entries.push({ id, group: o.out.split('/')[0], file: o.out + '.mp3', dur: +(p?.dur ?? 0).toFixed(3), loop: o.loop ? o.t : undefined, bytes: fs.statSync(f).size, src: o.src });
}
if (!ONLY) {
  const ts = ['// GENERATED by scripts/fetch-audio.mjs — do not edit. id -> file under public/assets/audio.',
    'export interface AudioFileEntry { id: string; group: "music" | "amb" | "sfx"; file: string; dur: number; loop?: number; bytes: number }',
    'export const AUDIO_FILES: AudioFileEntry[] = ['];
  for (const e of entries) ts.push(`  { id: '${e.id}', group: '${e.group}', file: '${e.file}', dur: ${e.dur}${e.loop != null ? `, loop: ${e.loop}` : ''}, bytes: ${e.bytes} },`);
  ts.push('];', `export const AUDIO_TOTAL_BYTES = ${entries.reduce((a, e) => a + e.bytes, 0)};`, '');
  fs.writeFileSync(path.join(ROOT, 'src/audio/manifest.generated.ts'), ts.join('\n'));

  const bySrc = new Map();
  for (const e of entries) { if (!bySrc.has(e.src)) bySrc.set(e.src, []); bySrc.get(e.src).push(e.file); }
  const lines = ['Hollowmere — audio credits', '='.repeat(60), '',
    'All audio in this folder is used under Creative Commons licenses. Files were trimmed, looped,',
    'filtered and re-encoded (MP3) by scripts/fetch-audio.mjs; edits are noted per file in that script.', '',
    'CC0 1.0:    https://creativecommons.org/publicdomain/zero/1.0/',
    'CC BY 4.0:  https://creativecommons.org/licenses/by/4.0/', ''];
  const groups = { 'CC-BY 4.0': [], 'CC-BY 3.0': [], CC0: [] };
  for (const [id, files] of bySrc) { const s = SOURCES[id]; (groups[s.license] ??= []).push({ s, files }); }
  for (const lic of Object.keys(groups)) {
    if (!groups[lic].length) continue;
    lines.push(`--- ${lic} ---`, '');
    for (const { s, files } of groups[lic]) {
      lines.push(`"${s.title}" by ${s.author}`, `  ${s.page}`, `  license: ${lic}`, `  used as: ${files.join(', ')}`, '');
    }
  }
  lines.push('Attribution line for Kevin MacLeod tracks (required by CC BY 4.0):',
    '  Music by Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0',
    '  https://creativecommons.org/licenses/by/4.0/', '');
  fs.writeFileSync(path.join(OUT, 'CREDITS.txt'), lines.join('\n'));
  const total = entries.reduce((a, e) => a + e.bytes, 0);
  console.log(`manifest: ${entries.length} files, ${(total / 1048576).toFixed(2)} MB total → src/audio/manifest.generated.ts, CREDITS.txt`);
}
