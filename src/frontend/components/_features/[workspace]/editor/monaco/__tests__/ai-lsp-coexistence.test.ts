import { describe, expect, it } from '@jest/globals'
import type * as monacoNs from 'monaco-editor'

import {
  AI_TAB_COMMIT_ACTION_ID,
  AI_TAB_COMMIT_PRECONDITION,
  installAiLspCoexistenceKeybindings,
} from '../ai-lsp-coexistence'

const TAB = 2

type Descriptor = monacoNs.editor.IActionDescriptor

function makeEditor() {
  const actions: Descriptor[] = []
  const triggers: Array<{ source: string; handlerId: string }> = []
  const contextKeys = new Map<string, boolean>()
  const disposeListeners: Array<() => void> = []
  let actionsDisposed = 0
  let addCommandCalls = 0

  const editor = {
    createContextKey: (key: string, initial: boolean) => {
      contextKeys.set(key, initial)
      return { set: (value: boolean) => contextKeys.set(key, value) }
    },
    addAction: (descriptor: Descriptor) => {
      actions.push(descriptor)
      return {
        dispose: () => {
          actionsDisposed += 1
        },
      }
    },
    addCommand: () => {
      addCommandCalls += 1
      return null
    },
    trigger: (source: string, handlerId: string) => {
      triggers.push({ source, handlerId })
    },
    onDidDispose: (cb: () => void) => {
      disposeListeners.push(cb)
      return { dispose: () => undefined }
    },
  }

  return {
    editor: editor as unknown as monacoNs.editor.IStandaloneCodeEditor,
    actions,
    triggers,
    contextKeys,
    fireDispose: () => disposeListeners.forEach((cb) => cb()),
    actionsDisposed: () => actionsDisposed,
    addCommandCalls: () => addCommandCalls,
  }
}

const fakeMonaco = { KeyCode: { Tab: TAB } } as unknown as typeof monacoNs

describe('installAiLspCoexistenceKeybindings', () => {
  it('binds Tab through an editor-scoped action, never a shared addCommand', () => {
    const fake = makeEditor()
    installAiLspCoexistenceKeybindings(fake.editor, fakeMonaco)

    expect(fake.addCommandCalls()).toBe(0)
    expect(fake.actions).toHaveLength(1)
    expect(fake.actions[0].id).toBe(AI_TAB_COMMIT_ACTION_ID)
    expect(fake.actions[0].keybindings).toEqual([TAB])
  })

  it('claims Tab only while AI ghost text is visible, so the LSP dropdown keeps Tab otherwise', () => {
    const fake = makeEditor()
    installAiLspCoexistenceKeybindings(fake.editor, fakeMonaco)

    expect(fake.actions[0].precondition).toBe(AI_TAB_COMMIT_PRECONDITION)
    expect(AI_TAB_COMMIT_PRECONDITION).toContain('inlineSuggestionVisible')
    expect(AI_TAB_COMMIT_PRECONDITION).not.toContain('suggestWidgetVisible')
  })

  it('commits on the editor the action runs for, not the one that installed last', () => {
    const first = makeEditor()
    const second = makeEditor()
    installAiLspCoexistenceKeybindings(first.editor, fakeMonaco)
    installAiLspCoexistenceKeybindings(second.editor, fakeMonaco)

    void first.actions[0].run(first.editor)

    expect(first.triggers).toEqual([{ source: 'openplc-ai-lsp', handlerId: 'editor.action.inlineSuggest.commit' }])
    expect(second.triggers).toEqual([])
  })

  it('toggles the coexistence context key', () => {
    const fake = makeEditor()
    const controller = installAiLspCoexistenceKeybindings(fake.editor, fakeMonaco)

    expect(fake.contextKeys.get('openplcAiLspCoexistence')).toBe(false)
    controller.setActive(true)
    expect(fake.contextKeys.get('openplcAiLspCoexistence')).toBe(true)
  })

  it('drops the Tab binding when its editor is disposed', () => {
    const fake = makeEditor()
    installAiLspCoexistenceKeybindings(fake.editor, fakeMonaco)

    fake.fireDispose()

    expect(fake.actionsDisposed()).toBe(1)
  })
})
