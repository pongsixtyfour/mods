import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const answer = (isError = false) =>
  ({ result: '', text: isError ? 'boom' : 'ok', isError }) as never

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

const has = async (ui: Pane, text: string) => (await ui.find({ type: 'Text', text })) !== undefined

const row = async (ui: Pane, key: string, text: string) =>
  (await ui.find({ key, text })) !== undefined

describe('session-notes', () => {
  test('marks files read, edited or created, keeping the strongest', async ($, on) => {
    on('tool.call', () => answer())

    await $.tool.call({ tool: 'Read', file_path: '/p/a.ts' })
    await $.tool.call({ tool: 'Edit', file_path: '/p/a.ts', old_string: 'x', new_string: 'y' })
    await $.tool.call({ tool: 'Read', file_path: '/p/a.ts' })
    await $.tool.call({ tool: 'Write', file_path: '/p/b.ts', content: '' })
    await $.tool.call({ tool: 'Read', file_path: '/p/c.ts' })

    const ui = await pane($)
    expect(await row(ui, 'file:/p/a.ts', '~')).toBe(true)
    expect(await row(ui, 'file:/p/b.ts', '+')).toBe(true)
    expect(await row(ui, 'file:/p/c.ts', '·')).toBe(true)
    expect(await row(ui, 'file:/p/a.ts', '+')).toBe(false)
    expect(await row(ui, 'file:/p/c.ts', '~')).toBe(false)
    expect(await has(ui, '3 files')).toBe(true)
  })

  test('marks a command done or failed', async ($, on) => {
    let isFailing = false
    on('tool.call', () => answer(isFailing))

    await $.tool.call({ tool: 'Bash', command: 'ls' })
    isFailing = true
    await $.tool.call({ tool: 'Bash', command: 'false' })

    const ui = await pane($)
    expect(await has(ui, '1 failed')).toBe(true)
    expect(await has(ui, '✓')).toBe(true)
    expect(await has(ui, '✗')).toBe(true)
  })

  test('/session-notes clear empties the pane', async ($, on) => {
    on('tool.call', () => answer())

    await $.tool.call({ tool: 'Bash', command: 'ls' })
    await $.command.run({ command: 'session-notes', args: 'clear' })

    const ui = await pane($)
    expect(await has(ui, '0 commands')).toBe(true)
    expect(await has(ui, '0 files')).toBe(true)
  })

  test('an empty pane says so', async $ => {
    const ui = await pane($)
    expect((await ui.findAll({ type: 'Text', text: /Nothing/ })).length).toBe(2)
  })
})
