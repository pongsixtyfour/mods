import type { Register } from 'claude-code'

const MIN_MS = 15_000
const GAIN = 3

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    const ran = await next(e)
    const isLong = e.durationMs >= MIN_MS

    if (e.agentId === undefined && e.reason !== 'aborted' && isLong) {
      await $.audio.play({ asset: 'sounds/done.wav' }, { gain: GAIN }).catch(() => {})
    }

    return ran
  })
}
