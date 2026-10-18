import type { Register } from 'claude-code'

const MIN_MS = 15_000
const GAIN = 3
const CLIP = 'sounds/done.wav'

// Where the engine's own player (afplay) is missing, run one of these by argv, first that works.
const LINUX_PLAYERS = [
  ['paplay'],
  ['aplay', '-q'],
  ['ffplay', '-nodisp', '-autoexit', '-loglevel', 'quiet'],
]
const WINDOWS_PLAYER = [
  'powershell.exe',
  '-NoProfile',
  '-Command',
  '(New-Object Media.SoundPlayer $env:DONE_SOUND).PlaySync()',
]

type Platform = 'mac' | 'linux' | 'windows'

// `uname` answers on macOS and Linux; where it cannot start, this is Windows.
function detect($: any): Promise<Platform> {
  return $.process.run(['uname', '-s']).then(
    (r: { stdout: string }) => (r.stdout.trim() === 'Darwin' ? 'mac' : 'linux'),
    () => 'windows',
  )
}

async function tryRun($: any, argv: string[], env?: Record<string, string>): Promise<boolean> {
  const r = await $.process
    .run(argv, { timeoutMs: 10_000, ...(env ? { env } : {}) })
    .catch(() => undefined)
  return r?.exitCode === 0
}

async function chime($: any): Promise<void> {
  const where = await detect($)
  if (where === 'mac') {
    await $.audio.play({ asset: CLIP }, { gain: GAIN })
    return
  }
  const file = `${$.plugin.root}/${CLIP}`
  if (where === 'windows') {
    await tryRun($, WINDOWS_PLAYER, { DONE_SOUND: file.replace(/\//g, '\\') })
    return
  }
  for (const player of LINUX_PLAYERS) {
    if (await tryRun($, [...player, file])) return
  }
}

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    const ran = await next(e)
    const isLong = e.durationMs >= MIN_MS
    if (e.agentId === undefined && e.reason !== 'aborted' && isLong) {
      await chime($).catch(() => {})
    }
    return ran
  })
}
