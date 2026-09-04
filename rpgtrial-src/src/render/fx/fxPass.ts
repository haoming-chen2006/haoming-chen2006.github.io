// FxPass: renders everything on FX_LAYER (particles, trails, sprites) after AO, with the scene depth
// blitted into the target so hardware depth-testing works, and the stable depth texture exposed for soft particles.
import * as THREE from 'three';
import { Pass, type EffectComposer } from 'postprocessing';
import { FX_LAYER, SOFT } from './common.ts';

export class FxPass extends Pass {
  private depthTex: THREE.Texture | null = null;
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, private composer: EffectComposer) {
    super('FxPass', scene, camera);
    this.needsSwap = false;
    this.needsDepthTexture = true;
  }
  override setDepthTexture(depthTexture: THREE.Texture, _depthPacking?: number) {
    this.depthTex = depthTexture; SOFT.depth.value = depthTexture; SOFT.enabled.value = depthTexture ? 1 : 0;
  }
  override getDepthTexture() { return this.depthTex as any; }
  override render(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, _outputBuffer: THREE.WebGLRenderTarget) {
    const scene = this.scene, cam = this.camera as THREE.PerspectiveCamera;
    const target = this.renderToScreen ? null : inputBuffer;
    renderer.setRenderTarget(target);
    // copy the stable scene depth into our colour target's depth attachment so layer-1 objects are occluded properly
    const depthRT = (this.composer as any).depthRenderTarget as THREE.WebGLRenderTarget | null;
    if (target && depthRT) {
      const gl = renderer.getContext() as WebGL2RenderingContext; const props = renderer.properties;
      const src = (props.get(depthRT) as any).__webglFramebuffer, dst = (props.get(target) as any).__webglFramebuffer;
      if (src && dst) {
        // go through three's state cache so it stays coherent (a raw gl.bindFramebuffer would make the following
        // setRenderTarget a no-op and the layer would be drawn to the wrong framebuffer)
        const state = renderer.state;
        state.bindFramebuffer(gl.READ_FRAMEBUFFER, src); state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dst);
        gl.blitFramebuffer(0, 0, depthRT.width, depthRT.height, 0, 0, target.width, target.height, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
        state.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        state.bindFramebuffer(gl.FRAMEBUFFER, dst);
      }
    }
    SOFT.resolution.value.set(target ? target.width : renderer.domElement.width, target ? target.height : renderer.domElement.height);
    SOFT.nearFar.value.set(cam.near, cam.far);
    const mask = cam.layers.mask; cam.layers.set(FX_LAYER);
    const bg = scene.background; scene.background = null;
    const autoClear = renderer.autoClear; renderer.autoClear = false;
    const shadowAuto = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
    renderer.render(scene, cam);
    renderer.shadowMap.autoUpdate = shadowAuto; renderer.autoClear = autoClear; scene.background = bg; cam.layers.mask = mask;
  }
}
