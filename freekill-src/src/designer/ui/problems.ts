/**
 * Where the red goes.
 *
 * The canvas does not have a validator of its own. It runs `validateSpec` — the
 * same function the create endpoint runs before it compiles anything — and
 * indexes the result by path, so what a block is drawn with is exactly what the
 * server would say about it. A second, friendlier, front-end-only list of rules
 * is how a panel comes to say 「可以创建」 about a spec the server then rejects.
 *
 * The paths are `spec.ts`'s own (`skills[0].effects[1].actions[0].params.mark`),
 * so the lookups here are string equality, not parsing.
 */
import type { SpecError } from '../spec';
import { validateSpec } from '../spec';
import type { Lane } from './palette';

export class Problems {
  private readonly byPath = new Map<string, string[]>();

  constructor(readonly errors: SpecError[]) {
    for (const e of errors) {
      const list = this.byPath.get(e.path);
      if (list) list.push(e.message);
      else this.byPath.set(e.path, [e.message]);
    }
  }

  get ok(): boolean {
    return this.errors.length === 0;
  }

  at(path: string): string[] {
    return this.byPath.get(path) ?? [];
  }

  /** Everything at or below a path — what a collapsed skill shows a count of. */
  under(prefix: string): SpecError[] {
    return this.errors.filter((e) => e.path === prefix || e.path.startsWith(`${prefix}.`));
  }
}

export const problemsOf = (spec: unknown): Problems => new Problems(validateSpec(spec).errors);

/* The path vocabulary, in one place so a component never builds one by hand. */

export const skillPath = (skill: number): string => `skills[${skill}]`;

export const effectPath = (skill: number, effect: number): string =>
  `${skillPath(skill)}.effects[${effect}]`;

export const lanePath = (skill: number, effect: number, lane: Lane, index?: number): string => {
  const base = effectPath(skill, effect);
  if (lane === 'trigger') return `${base}.trigger`;
  return index === undefined ? `${base}.${lane}` : `${base}.${lane}[${index}]`;
};

export const paramPath = (block: string, name: string): string => `${block}.params.${name}`;
