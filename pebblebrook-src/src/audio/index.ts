// AGENT G owns this module. Keep the export names.
import type { AudioSystem } from '../core/app.ts';

export const audio: AudioSystem = {
  ready: false, enabled: true,
  init() { this.ready = true; }, setScene() {}, play() {}, update() {}, setVolume() {},
};
