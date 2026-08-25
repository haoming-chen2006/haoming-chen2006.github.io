import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { modeList } from './modes'

// Effects do not run in a server render, so this is the first paint: the shell
// with its banks still loading. Enough to catch a broken import or bad JSX.
describe('the page', () => {
  it('mounts and offers all three modes', () => {
    const html = renderToString(<App />)

    expect(html).toContain('<h1>Draft</h1>')
    for (const mode of modeList) expect(html).toContain(mode.label)
    expect(html).toContain('Loading')
  })
})
