import type * as monacoNs from 'monaco-editor'

/**
 * Custom Monaco context key that reflects whether AI inline completions and the
 * STruC++ LSP suggest widget are allowed to coexist (i.e. AI is enabled,
 * consented and inline completions are turned on).  The Tab override below is
 * gated on this key so it only takes effect while coexistence is active —
 * toggling AI off restores Monaco's default Tab=accept behaviour without needing
 * to remount the editor.
 */
const COEXISTENCE_CONTEXT_KEY = 'openplcAiLspCoexistence'

export const AI_TAB_COMMIT_ACTION_ID = 'openplc.ai.tabCommitInlineSuggestion'

export const AI_TAB_COMMIT_PRECONDITION = `${COEXISTENCE_CONTEXT_KEY} && inlineSuggestionVisible && !editorReadonly`

export type AiLspCoexistenceController = {
  /** Enable/disable the coexistence Tab override at runtime. */
  setActive: (active: boolean) => void
  dispose: () => void
}

/**
 * Lets the STruC++ LSP dropdown and the AI ghost text be shown at the same time:
 *
 *   - Tab commits the AI inline suggestion whenever one is visible, even while the
 *     suggest widget is open (Monaco's default reserves Tab for the dropdown).
 *   - Without AI ghost text, Tab falls through to Monaco's default: it accepts the
 *     highlighted LSP item, or indents.
 *
 * `addAction`, not `addCommand`: an `addCommand` keybinding is shared by every mounted
 * editor, so Tab would commit on whichever editor mounted last.
 */
export function installAiLspCoexistenceKeybindings(
  editor: monacoNs.editor.IStandaloneCodeEditor,
  monaco: typeof monacoNs,
): AiLspCoexistenceController {
  const active = editor.createContextKey<boolean>(COEXISTENCE_CONTEXT_KEY, false)

  const action = editor.addAction({
    id: AI_TAB_COMMIT_ACTION_ID,
    label: 'Accept AI Inline Suggestion',
    keybindings: [monaco.KeyCode.Tab],
    precondition: AI_TAB_COMMIT_PRECONDITION,
    run: (target) => {
      target.trigger('openplc-ai-lsp', 'editor.action.inlineSuggest.commit', {})
    },
  })
  const disposeListener = editor.onDidDispose(() => action.dispose())

  return {
    setActive: (value: boolean) => active.set(value),
    dispose: () => {
      disposeListener.dispose()
      action.dispose()
    },
  }
}
