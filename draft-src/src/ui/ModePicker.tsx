import type { ModeId } from '../engine/card'
import { bankSource, modeList } from '../modes'

export function ModePicker({ onPick }: { onPick: (id: ModeId) => void }) {
  return (
    <section className="picker">
      <h1>Draft</h1>
      <p className="sub">
        A name, a year, a picture. No numbers until it is over. Bid what you remember.
      </p>

      <div className="modes">
        {modeList.map((mode) => (
          <button key={mode.id} className="mode" onClick={() => onPick(mode.id)}>
            <b>{mode.label}</b>
            <span className="shape">{mode.slots.join(' · ')}</span>
            <span className="note">
              {mode.hasHidden ? 'stats hidden until the reveal' : 'full information — pure draft'}
              {bankSource(mode.id) === 'fixtures' ? ' · stand-in cards' : ''}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
