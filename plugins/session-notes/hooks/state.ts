import type { SessionNotes } from '../types'

// Bump when the shape of SessionNotes changes: notes saved under another version are dropped.
export const VERSION = 2

export const empty = (): SessionNotes => ({
  version: VERSION,
  files: [],
  commands: [],
  agents: [],
  ended: [],
})

export const whole = (state: Partial<SessionNotes> | undefined): SessionNotes =>
  state?.version === VERSION ? { ...empty(), ...state } : empty()
