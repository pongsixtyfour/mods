import { describe, expect, test } from 'claude-code/testing'

const complete = (over: Record<string, unknown> = {}) => ({
  answer: 'ok',
  durationMs: 20_000,
  isAborted: false,
  turnId: 't1',
  reason: 'answer' as const,
  ...over,
})

describe('done-sound', () => {
  test('plays after a long turn', async ($, on) => {
    const clips: { clip: unknown; gain?: number }[] = []
    on('process.run', () => ({ value: { exitCode: 0, stdout: 'Darwin\n', stderr: '' } }) as any)
    on('audio.play', (_$, e) => { clips.push(e); return { value: undefined } })
    on('turn.complete', (_$, e) => ({ text: e.answer }))

    await $.turn.complete(complete())

    expect(clips.length).toBe(1)
    expect(clips[0]!.gain).toBe(3)
  })

  test('uses the configured volume', { options: { gain: 2 } }, async ($, on) => {
    const clips: { clip: unknown; gain?: number }[] = []
    on('process.run', () => ({ value: { exitCode: 0, stdout: 'Darwin\n', stderr: '' } }) as any)
    on('audio.play', (_$, e) => { clips.push(e); return { value: undefined } })
    on('turn.complete', (_$, e) => ({ text: e.answer }))

    await $.turn.complete(complete())

    expect(clips[0]!.gain).toBe(2)
  })

  test('stays silent after a short turn', async ($, on) => {
    const clips: unknown[] = []
    on('audio.play', (_$, e) => { clips.push(e); return { value: undefined } })
    on('turn.complete', (_$, e) => ({ text: e.answer }))

    await $.turn.complete(complete({ durationMs: 5_000 }))

    expect(clips.length).toBe(0)
  })

  test('stays silent after an interrupted turn', async ($, on) => {
    const clips: unknown[] = []
    on('audio.play', (_$, e) => { clips.push(e); return { value: undefined } })
    on('turn.complete', (_$, e) => ({ text: e.answer }))

    await $.turn.complete(complete({ reason: 'aborted', isAborted: true }))

    expect(clips.length).toBe(0)
  })

  test('stays silent for a subagent turn', async ($, on) => {
    const clips: unknown[] = []
    on('audio.play', (_$, e) => { clips.push(e); return { value: undefined } })
    on('turn.complete', (_$, e) => ({ text: e.answer }))

    await $.turn.complete(complete({ agentId: 'a1' }))

    expect(clips.length).toBe(0)
  })

  describe('other systems', () => {
    const ok = { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }

    test('macOS uses the engine player and runs nothing else', async ($, on) => {
      const argvs: string[][] = []
      let clips = 0
      on('process.run', (_$, e) => { argvs.push([...e.argv]); return { value: { ...ok, stdout: 'Darwin\n' } } })
      on('audio.play', () => { clips++; return { value: undefined } })
      on('turn.complete', (_$, e) => ({ text: e.answer }))

      await $.turn.complete(complete())

      expect(clips).toBe(1)
      expect(argvs.length).toBe(1)
    })

    test('Linux tries the next player when one is missing', async ($, on) => {
      const argvs: string[][] = []
      let clips = 0
      on('process.run', (_$, e) => {
        argvs.push([...e.argv])
        if (e.argv[0] === 'uname') return { value: { ...ok, stdout: 'Linux\n' } }
        return { value: e.argv[0] === 'paplay' ? { ...ok, exitCode: 127 } : ok }
      })
      on('audio.play', () => { clips++; return { value: undefined } })
      on('turn.complete', (_$, e) => ({ text: e.answer }))

      await $.turn.complete(complete())

      expect(clips).toBe(0)
      expect(argvs.map(a => a[0])).toEqual(['uname', 'paplay', 'aplay'])
    })

    test('Linux with no player stays silent without failing', async ($, on) => {
      on('process.run', (_$, e) =>
        ({ value: e.argv[0] === 'uname' ? { ...ok, stdout: 'Linux\n' } : { ...ok, exitCode: 127 } }))
      on('turn.complete', (_$, e) => ({ text: e.answer }))

      await $.turn.complete(complete())
    })

    test('Windows runs PowerShell with the clip path in the environment', async ($, on) => {
      const runs: { argv: string[]; env?: Record<string, string> }[] = []
      on('process.run', (_$, e) => {
        runs.push({ argv: [...e.argv], env: e.init?.env })
        if (e.argv[0] === 'uname') throw new Error('spawn uname ENOENT')
        return { value: ok }
      })
      on('turn.complete', (_$, e) => ({ text: e.answer }))

      await $.turn.complete(complete())

      expect(runs.map(r => r.argv[0])).toEqual(['uname', 'powershell.exe'])
      expect(runs[1]!.env?.DONE_SOUND?.endsWith('sounds\\done.wav')).toBe(true)
    })

    test('Linux stays silent after a short turn', async ($, on) => {
      const argvs: string[][] = []
      on('process.run', (_$, e) => { argvs.push([...e.argv]); return { value: ok } })
      on('turn.complete', (_$, e) => ({ text: e.answer }))

      await $.turn.complete(complete({ durationMs: 5_000 }))

      expect(argvs.length).toBe(0)
    })
  })
})
