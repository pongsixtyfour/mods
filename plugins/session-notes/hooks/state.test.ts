import { describe, expect, test } from 'claude-code/testing'

import type { SessionNotes } from '../types'
import { VERSION, empty, whole } from './state'

describe('saved notes', () => {
  test('keeps notes saved under this version', () => {
    const saved: SessionNotes = { ...empty(), files: [{ path: '/p/a.ts', kind: 'edited' }] }

    expect(whole(saved)).toEqual(saved)
  })

  test('drops notes saved by an older version', () => {
    const old = { files: [{ path: '/p/a.ts', kind: 'edited' }], commands: [] }

    expect(whole(old as never)).toEqual(empty())
  })

  test('drops notes saved under another version number', () => {
    expect(
      whole({ ...empty(), version: VERSION - 1, files: [{ path: 'x', kind: 'read' }] }),
    ).toEqual(empty())
  })

  test('starts empty when nothing was saved', () => {
    expect(whole(undefined)).toEqual(empty())
  })
})
