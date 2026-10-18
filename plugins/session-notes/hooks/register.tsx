import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { NoteAgentStatus, NoteFile, SessionNotes } from '../types'
import { empty, whole } from './state'

const PANE = 'session-notes'
const MAX_COMMANDS = 100
const MAX_AGENTS = 50
const notes = atom({ plugin: 'session-notes', key: 'notes' } as const, empty())

const edit = ($: Parameters<typeof update>[0], change: (state: SessionNotes) => SessionNotes) =>
  update($, notes, state => change(whole(state)))

const RANK: Record<NoteFile['kind'], number> = { read: 0, edited: 1, created: 2 }

const split = (path: string) => {
  const parts = path.split('/')
  const dir = parts.slice(-3, -1).join('/')

  return { dir: dir === '' ? '' : `${dir}/`, name: parts[parts.length - 1] ?? path }
}

const shortModel = (model: string) => model.replace(/^claude-/, '')

const took = (ms: number) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`)

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

const noteFile = (path: string, kind: NoteFile['kind']) => (state: SessionNotes) => {
  const seen = state.files.find(file => file.path === path)
  if (seen === undefined) return { ...state, files: [...state.files, { path, kind }] }
  if (RANK[kind] <= RANK[seen.kind]) return state

  return { ...state, files: state.files.map(file => (file === seen ? { path, kind } : file)) }
}

export const register: Register = on => {
  let spawned = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'session-notes',
      description: 'Show the files touched and commands run this session (clear: reset)',
    })
    void $.ui.open({ id: PANE, title: 'Session notes' })

    return next(e)
  })

  on('command.run', { command: 'session-notes' }, async ($, e) => {
    if (e.args.trim() === 'clear') {
      await edit($, empty)

      return { text: 'Session notes cleared.' }
    }
    await $.ui.open({ id: PANE, title: 'Session notes' })

    return { text: 'Session notes pane opened.' }
  })

  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    await edit($, noteFile(e.file_path, 'read'))

    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    await edit($, noteFile(e.file_path, 'edited'))

    return next(e)
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    await edit($, noteFile(e.file_path, 'created'))

    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const startedAt = Date.now()
    const entry = { id: e.tool_use_id, command: e.command, status: 'running' as const, startedAt }
    await edit($, state => ({
      ...state,
      commands: [...state.commands, entry].slice(-MAX_COMMANDS),
    }))
    const ran = await next(e)
    const status = ran.deny === undefined && ran.isError !== true ? 'ok' : 'failed'
    await edit($, state => ({
      ...state,
      commands: state.commands.map(one =>
        one.id === entry.id ? { ...one, status, ms: Date.now() - startedAt } : one,
      ),
    }))

    return ran
  })

  on('agent.spawn', async ($, e, next) => {
    const id = `${e.tool_use_id}|${Date.now()}|${spawned++}`
    await edit($, state => ({
      ...state,
      agents: [
        ...state.agents,
        {
          id,
          type: e.subagentType,
          description: e.description,
          model: e.model ?? e.parentModel,
          isBackground: e.background,
          status: 'running' as const,
        },
      ].slice(-MAX_AGENTS),
    }))
    const started = await next(e)
    await edit($, state => {
      if (started.deny !== undefined) {
        return { ...state, agents: state.agents.filter(one => one.id !== id) }
      }
      const early = state.ended.find(one => one.agentId === started.agentId)

      return {
        ...state,
        ended: state.ended.filter(one => one !== early),
        agents: state.agents.map(one =>
          one.id === id
            ? {
                ...one,
                agentId: started.agentId,
                model: started.model,
                ...(early && { status: early.status, ms: early.ms }),
              }
            : one,
        ),
      }
    })

    return started
  })

  on('turn.complete', async ($, e, next) => {
    const answered = await next(e)
    const agentId = e.agentId
    if (agentId === undefined) return answered

    const status: NoteAgentStatus =
      e.reason === 'answer' ? 'done' : e.reason === 'aborted' ? 'stopped' : 'failed'
    await edit($, state => {
      if (!state.agents.some(one => one.agentId === agentId)) {
        return { ...state, ended: [...state.ended, { agentId, status, ms: e.durationMs }] }
      }

      return {
        ...state,
        agents: state.agents.map(one =>
          one.agentId === agentId ? { ...one, status, ms: e.durationMs } : one,
        ),
      }
    })

    return answered
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const { files, commands, agents } = whole(await read($, notes))
    const room = Math.max(2, Math.floor(((e.viewport?.rows ?? 24) - 18) / 3))
    const failed =
      commands.filter(one => one.status === 'failed').length +
      agents.filter(one => one.status === 'failed').length
    const marks = { created: '+', edited: '~', read: '·' } as const
    const tints = { created: 'success', edited: 'warning', read: 'inactive' } as const
    const states = { running: '●', ok: '✓', failed: '✗' } as const
    const colors = { running: 'warning', ok: 'success', failed: 'error' } as const
    const agentMarks = { running: '●', done: '✓', failed: '✗', stopped: '■' } as const
    const agentTints = {
      running: 'warning',
      done: 'success',
      failed: 'error',
      stopped: 'inactive',
    } as const

    return (
      <Box flexDirection="column">
        <Box gap={1} paddingX={1}>
          <Text bold color="claude">
            Session notes
          </Text>
          <Text dimColor>
            {plural(files.length, 'file')} · {plural(commands.length, 'command')} ·{' '}
            {plural(agents.length, 'agent')}
          </Text>
          {failed > 0 && <Text color="error">{failed} failed</Text>}
        </Box>

        <Box flexDirection="column" borderStyle="round" borderColor="subtle" paddingX={1}>
          <Text bold>Files</Text>
          {files.length === 0 && (
            <Text dimColor italic>
              Nothing touched yet.
            </Text>
          )}
          {files.slice(-room).map(file => {
            const { dir, name } = split(file.path)

            return (
              <Box key={`file:${file.path}`} gap={1}>
                <Text color={tints[file.kind]}>{marks[file.kind]}</Text>
                <Box flexShrink={1}>
                  <Text dimColor>{dir}</Text>
                  <Text
                    bold={file.kind !== 'read'}
                    dimColor={file.kind === 'read'}
                    wrap="truncate-end"
                  >
                    {name}
                  </Text>
                </Box>
              </Box>
            )
          })}

          <Box marginTop={1} gap={2}>
            <Box gap={1}>
              <Text color={tints.created}>{marks.created}</Text>
              <Text color="subtle">new</Text>
            </Box>
            <Box gap={1}>
              <Text color={tints.edited}>{marks.edited}</Text>
              <Text color="subtle">edited</Text>
            </Box>
            <Box gap={1}>
              <Text color={tints.read}>{marks.read}</Text>
              <Text color="subtle">read</Text>
            </Box>
          </Box>
        </Box>

        <Box flexDirection="column" borderStyle="round" borderColor="subtle" paddingX={1}>
          <Text bold>Commands</Text>
          {commands.length === 0 && (
            <Text dimColor italic>
              Nothing run yet.
            </Text>
          )}
          {commands.slice(-room).map(one => (
            <Box key={`cmd:${one.id}`} gap={1}>
              <Text color={colors[one.status]}>{states[one.status]}</Text>
              <Box flexGrow={1} flexShrink={1}>
                <Text color={one.status === 'failed' ? 'error' : undefined} wrap="truncate-end">
                  {one.command.split('\n')[0]}
                </Text>
              </Box>
              {one.ms !== undefined && <Text dimColor>{took(one.ms)}</Text>}
            </Box>
          ))}
        </Box>

        <Box flexDirection="column" borderStyle="round" borderColor="subtle" paddingX={1}>
          <Text bold>Agents</Text>
          {agents.length === 0 && (
            <Text dimColor italic>
              None started.
            </Text>
          )}
          {agents.slice(-room).map(one => (
            <Box key={`agent:${one.id}`} gap={1}>
              <Text color={agentTints[one.status]}>{agentMarks[one.status]}</Text>
              <Text bold>{one.type}</Text>
              {one.model !== '' && <Text color="suggestion">{shortModel(one.model)}</Text>}
              <Box flexGrow={1} flexShrink={1}>
                <Text dimColor wrap="truncate-end">
                  {one.description}
                </Text>
              </Box>
              {one.isBackground && one.status === 'running' && <Text dimColor>bg</Text>}
              {one.ms !== undefined && <Text dimColor>{took(one.ms)}</Text>}
            </Box>
          ))}
        </Box>
      </Box>
    )
  })
}
