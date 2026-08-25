import { MODES } from './engine/card'

export function App() {
  return (
    <main>
      <h1>Draft</h1>
      <ul>
        {Object.values(MODES).map((m) => (
          <li key={m.id}>
            {m.label} — {m.slots.length} slots
          </li>
        ))}
      </ul>
    </main>
  )
}
