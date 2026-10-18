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
    on('audio.play', (_$, e) => { clips.push(e); return { value: undefined } })
    on('turn.complete', (_$, e) => ({ text: e.answer }))

    await $.turn.complete(complete())

    expect(clips.length).toBe(1)
    expect(clips[0]!.gain).toBe(3)
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
})
