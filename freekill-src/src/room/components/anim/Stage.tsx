/**
 * Where React's involvement in animation begins and ends.
 *
 * A stage is an empty, absolutely positioned div that renders once and is never
 * re-rendered with different content. `AnimBus` appends sprite nodes to it and
 * removes them when their CSS animation ends. That separation is the whole
 * point: the table re-renders five times a second on `refreshStatusSkills`, and
 * an effect must not care.
 */
import { createContext, useContext, useEffect, useRef } from 'react';
import type { AnimBus, StageKey } from './bus';

const Ctx = createContext<AnimBus | null>(null);

export const AnimProvider = Ctx.Provider;

/** Null outside a table that has a bus — the fixture harness, and unit tests. */
export function useAnimBus(): AnimBus | null {
  return useContext(Ctx);
}

export interface EffectStageProps {
  readonly stage: StageKey;
  /**
   * Which ancestor the CSS accents (hit shake, heal pulse, equip flash) are
   * applied to. The sprite layer must not be the host: it is `overflow:
   * visible` and unclipped so an effect can spill past the portrait, whereas a
   * shake wants to move the portrait itself.
   */
  readonly host?: string;
}

export function EffectStage({ stage, host = '.fk-photo' }: EffectStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const bus = useAnimBus();

  useEffect(() => {
    const el = ref.current;
    if (!bus || !el) return;
    bus.registerStage(stage, el, el.closest<HTMLElement>(host) ?? el.parentElement);
    return () => bus.registerStage(stage, null);
  }, [bus, stage, host]);

  return <div className="fk-anim-layer" ref={ref} aria-hidden />;
}
