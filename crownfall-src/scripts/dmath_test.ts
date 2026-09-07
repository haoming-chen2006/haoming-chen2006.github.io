// Accuracy of src/engine/dmath.ts against Math.*. Run: node scripts/dmath_test.ts
declare const process: { exitCode?: number };
import { datan, datan2, dcos, dexp, dhypot, dpowi, dsin } from '../src/engine/dmath.ts';
import { Rng } from '../src/engine/rng.ts';

const N = 200_000;
const rng = new Rng(0xc0ffee);
let failures = 0;
const fail = (msg: string): void => { failures++; if (failures <= 25) console.log('FAIL ' + msg); };

type Fn = (...a: number[]) => number;
interface Case { name: string; mine: Fn; ref: Fn; bound: number; relative: boolean; gen: () => number[]; edges: number[][] }

/** Error of `a` vs reference `b`: NaN/±0/±Infinity must match exactly, otherwise abs or relative distance. */
function errorOf(a: number, b: number, relative: boolean): number {
  if (b !== b) return a !== a ? 0 : Infinity;
  if (b === 0 || !Number.isFinite(b)) return Object.is(a, b) ? 0 : Infinity;
  const e = Math.abs(a - b);
  return relative ? e / Math.abs(b) : e;
}

function run(c: Case): void {
  let maxErr = 0, worst: number[] = [], worstVals = [0, 0];
  const inputs: number[][] = [...c.edges];
  for (let i = 0; i < N; i++) inputs.push(c.gen());
  for (const args of inputs) {
    const a = c.mine(...args), b = c.ref(...args);
    const e = errorOf(a, b, c.relative);
    if (e > maxErr) { maxErr = e; worst = args; worstVals = [a, b]; }
    if (!(e < c.bound)) fail(`${c.name}(${args.join(', ')}) = ${a}, expected ${b} (${c.relative ? 'rel' : 'abs'} err ${e})`);
  }
  const tag = c.relative ? 'rel' : 'abs';
  console.log(`${c.name.padEnd(7)} max ${tag} err ${maxErr.toExponential(3)} (bound ${c.bound}) at (${worst.join(', ')}) -> ${worstVals[0]} vs ${worstVals[1]}  [${inputs.length} inputs]`);
}

const u = (lo: number, hi: number): number => rng.range(lo, hi);
const angle = (): number[] => { const r = rng.next(); return [r < 0.4 ? u(-10, 10) : r < 0.8 ? u(-1000, 1000) : u(-1e5, 1e5)]; };
const angleEdges: number[][] = [0, -0, Math.PI, -Math.PI, Math.PI / 2, -Math.PI / 2, Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4,
  Math.PI * 2, -Math.PI * 2, 12345.678, -12345.678, 1e-12, -1e-12, 1e5, -1e5, 99999.9, -99999.9, 1e-300, NaN, Infinity, -Infinity].map((x) => [x]);
const SPECIAL = [0, -0, 1, -1, 0.5, -0.5, 2, -2, 1e300, -1e300, 1e-300, -1e-300, Infinity, -Infinity, NaN];
const pairs: number[][] = [];
for (const y of SPECIAL) for (const x of SPECIAL) pairs.push([y, x]);
const mag = (): number => { const r = rng.next(); return r < 0.5 ? u(-10, 10) : r < 0.8 ? u(-1e6, 1e6) : u(-1e-3, 1e-3); };

const cases: Case[] = [
  { name: 'dsin', mine: dsin, ref: Math.sin, bound: 1e-9, relative: false, gen: angle, edges: angleEdges },
  { name: 'dcos', mine: dcos, ref: Math.cos, bound: 1e-9, relative: false, gen: angle, edges: angleEdges },
  { name: 'datan', mine: datan, ref: Math.atan, bound: 1e-9, relative: false, gen: () => [mag()], edges: [...SPECIAL, 0.4375, 0.6875, 1.1875, 2.4375, 7.378697629483821e19, 1e-12].map((x) => [x]) },
  { name: 'datan2', mine: datan2, ref: Math.atan2, bound: 1e-9, relative: false, gen: () => [mag(), mag()], edges: pairs },
  { name: 'dexp', mine: dexp, ref: Math.exp, bound: 1e-9, relative: true, gen: () => [u(-60, 60)],
    edges: [0, -0, 1e-12, -1e-12, 1e-9, 0.3465735902799726, -0.3465735902799726, 0.6931471805599453, -0.6931471805599453, 1, -1, 60, -60, 700, -700, 709, 709.78, -745, 710, -746, NaN, Infinity, -Infinity].map((x) => [x]) },
  { name: 'dhypot', mine: dhypot, ref: Math.hypot, bound: 1e-12, relative: true, gen: () => [u(-1000, 1000), u(-1000, 1000)], edges: [[0, 0], [3, 4], [-3, 4], [0, 5], [1e-3, 0]] },
  { name: 'dpowi', mine: dpowi, ref: Math.pow, bound: 1e-12, relative: true, gen: () => [u(-2, 2), rng.int(0, 16)], edges: [[0, 0], [0, 3], [-1, 3], [-1, 4], [1.5, 0], [2, 10], [0.5, 16]] },
];
for (const c of cases) run(c);

const sanity: [string, boolean][] = [
  ['dexp(710) === Infinity', dexp(710) === Infinity],
  ['dexp(-746) === 0', dexp(-746) === 0],
  ['dexp(-745) > 0', dexp(-745) > 0],
  ['dexp(709.78) finite', Number.isFinite(dexp(709.78))],
  ['dexp(-740) ~ Math.exp(-740)', Math.abs(dexp(-740) / Math.exp(-740) - 1) < 1e-6],
  ['dsin(-0) is -0', Object.is(dsin(-0), -0)],
  ['datan2(-0, 1) is -0', Object.is(datan2(-0, 1), -0)],
  ['datan2(0, -0) is PI', datan2(0, -0) === Math.PI],
  ['datan2(-0, -0) is -PI', datan2(-0, -0) === -Math.PI],
];
for (const [name, ok] of sanity) if (!ok) fail(name);

console.log(failures ? `${failures} failure(s)` : 'dmath: all checks passed');
process.exitCode = failures ? 1 : 0;
