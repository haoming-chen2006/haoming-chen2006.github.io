/**
 * The designer's entry point. `designer.html` mounts this into `#root`.
 *
 * Deliberately thin: everything is in `App`, so a component test can render the
 * whole panel without a DOM root and the browser test can drive the real thing.
 * The `#boot` splash — if the host page paints one, the way `index.html` does —
 * is removed on mount rather than being left to a CSS rule, because a designer
 * that throws before its first paint should leave the splash on screen and not
 * a blank page.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './designer.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  document.getElementById('boot')?.remove();
}
