/**
 * The room lane's public surface.
 *
 * Lane 4 mounts `<RoomView>` from `src/main.tsx` against
 * `contract/views.ts#RoomViewProps`. Everything else in `src/room/` is internal
 * and may move; import from here.
 */
export { RoomView } from './RoomView';
export { LtkLua } from './ltk/LtkLua';
export { Assets } from './assets/assets';
export { RoomStore, applySceneChange } from './state/store';
export type { RoomState, SceneState, PlayerState, CardState } from './state/types';
