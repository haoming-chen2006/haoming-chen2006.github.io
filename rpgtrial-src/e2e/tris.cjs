// Static scene cost: triangles per frame estimate (no rendering needed), per quality.
const { chromium } = require('/private/tmp/claude-501/-Users-haoming/27c8d279-b89e-49e5-8900-02115df0505c/scratchpad/node_modules/playwright');
(async () => {
  const q = process.argv[2] || 'high';
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--use-gl=angle'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.setDefaultTimeout(300000);
  await page.goto('http://127.0.0.1:5180/rpgtrial/?quality=' + q);
  await page.waitForFunction(() => !!window.__hm && window.__hm.ui, null, { timeout: 200000 }).catch(() => console.log('no __hm'));
  const r = await page.evaluate(() => {
    const out = []; let total = 0;
    window.__hm.scene.traverse((o) => {
      if (!o.isMesh && !o.isPoints) return;
      const g = o.geometry; if (!g) return;
      const n = g.index ? g.index.count / 3 : (g.attributes.position?.count || 0) / 3;
      const inst = o.isInstancedMesh ? o.count : 1;
      const t = n * inst; total += t;
      out.push({ name: o.name || o.parent?.name || o.type, tris: Math.round(t), inst, vis: o.visible });
    });
    out.sort((a, b) => b.tris - a.tris);
    return { total: Math.round(total), top: out.slice(0, 25) };
  });
  console.log('quality', q, 'TOTAL tris (all objects, no culling):', r.total.toLocaleString());
  for (const o of r.top) console.log(String(o.tris).padStart(11), 'x' + o.inst, o.vis ? '' : '(hidden)', o.name);
  await browser.close();
})();
