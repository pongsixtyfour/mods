export type NoteFile = { path: string; kind: 'read' | 'edited' | 'created' }
export type NoteCommand = {
  id: string
  command: string
  status: 'running' | 'ok' | 'failed'
  startedAt: number
  ms?: number
}
export type NoteAgentStatus = 'running' | 'done' | 'failed' | 'stopped'
export type NoteAgent = {
  id: string
  agentId?: string
  type: string
  description: string
  model: string
  isBackground: boolean
  status: NoteAgentStatus
  ms?: number
}
export type NoteAgentEnd = { agentId: string; status: NoteAgentStatus; ms: number }
export type SessionNotes = {
  version: number
  files: NoteFile[]
  commands: NoteCommand[]
  agents: NoteAgent[]
  ended: NoteAgentEnd[]
}

declare module 'claude-code' {
  interface PluginState {
    'session-notes': { notes: SessionNotes }
  }
}
