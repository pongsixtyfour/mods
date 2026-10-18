import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const spawn = (over: Record<string, unknown> = {}) =>
  ({
    tool_use_id: 'tu1',
    prompt: 'p',
    description: 'find the readme',
    subagentType: 'Explore',
    parentModel: 'm',
    background: false,
    fork: false,
    ...over,
  }) as never

const finish = (agentId: string, over: Record<string, unknown> = {}) =>
  ({
    answer: 'ok',
    durationMs: 1500,
    isAborted: false,
    turnId: 't',
    reason: 'answer',
    agentId,
    ...over,
  }) as never

const pane = ($: Engine) =>
  $.ui.mount({
    plugin: 'session-notes',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'session-notes',
    props: { title: 'Session notes', isFocused: false } as never,
    viewport: { columns: 80, rows: 60 } as never,
  })

type Pane = Awaited<ReturnType<typeof pane>>

const count = async (ui: Pane, text: string | RegExp) =>
  (await ui.findAll({ type: 'Text', text })).length

describe('session-notes agents', () => {
  test('records a call made inside a subagent', async ($, on) => {
    on('tool.call', () => ({ result: '', text: 'ok', isError: false }) as never)

    await $.tool.call({
      tool: 'Write',
      file_path: '/p/agent.ts',
      content: '',
      agentId: 'a1',
    } as never)

    const ui = await pane($)
    expect((await ui.find({ key: 'file:/p/agent.ts', text: '+' })) !== undefined).toBe(true)
  })

  test('shows a started agent as running', async ($, on) => {
    on('agent.spawn', () => ({ model: 'm', agentId: 'a1' }) as never)

    await $.agent.spawn(spawn())

    const ui = await pane($)
    expect(await count(ui, 'Explore')).toBe(1)
    expect(await count(ui, '●')).toBe(1)
    expect(await count(ui, '1 agent')).toBe(1)
  })

  test('shows the model the agent runs on', async ($, on) => {
    on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'a1' }) as never)

    await $.agent.spawn(spawn({ model: 'haiku' }))

    const ui = await pane($)
    expect(await count(ui, 'haiku-5-5')).toBe(1)
  })

  test('shows a finished agent as done with its time', async ($, on) => {
    on('agent.spawn', () => ({ model: 'm', agentId: 'a1' }) as never)
    on('turn.complete', () => ({ text: 'ok' }))

    await $.agent.spawn(spawn())
    await $.turn.complete(finish('a1'))

    const ui = await pane($)
    expect(await count(ui, '✓')).toBe(1)
    expect(await count(ui, '1.5s')).toBe(1)
    expect(await count(ui, '●')).toBe(0)
  })

  test('marks an interrupted agent stopped and an errored one failed', async ($, on) => {
    let started = 0
    on('agent.spawn', () => ({ model: 'm', agentId: `a${++started}` }) as never)
    on('turn.complete', () => ({ text: 'ok' }))

    await $.agent.spawn(spawn({ description: 'a1' }))
    await $.agent.spawn(spawn({ description: 'a2' }))
    await $.turn.complete(finish('a1', { reason: 'aborted', isAborted: true }))
    await $.turn.complete(finish('a2', { reason: 'error' }))

    const ui = await pane($)
    expect(await count(ui, '■')).toBe(1)
    expect(await count(ui, '✗')).toBe(1)
    expect(await count(ui, '1 failed')).toBe(1)
  })

  test('keeps an agent that ends before its spawn call returns', async ($, on) => {
    on('turn.complete', () => ({ text: 'ok' }))
    on('agent.spawn', async () => {
      await $.turn.complete(finish('a9'))

      return { model: 'm', agentId: 'a9' } as never
    })

    await $.agent.spawn(spawn())

    const ui = await pane($)
    expect(await count(ui, '✓')).toBe(1)
    expect(await count(ui, '●')).toBe(0)
  })

  test('drops an agent whose spawn was refused', async ($, on) => {
    on('agent.spawn', () => ({ deny: 'no' }) as never)

    await $.agent.spawn(spawn())

    const ui = await pane($)
    expect(await count(ui, 'Explore')).toBe(0)
    expect(await count(ui, 'None started.')).toBe(1)
  })
})
