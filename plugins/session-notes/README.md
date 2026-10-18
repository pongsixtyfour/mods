# session-notes

A Claude Code mod that keeps a live side pane of what happened this session, in three boxes:

- **Files**: every file Claude read, edited or created, marked `+` created, `~` edited or `·` read. A file keeps its strongest mark.
- **Commands**: every Bash command, marked `●` running, `✓` ok or `✗` failed, with how long it took.
- **Agents**: every subagent started, with its type, the model it runs on, its description, whether it runs in the background (`bg`) and how long it took. Marks are `●` running, `✓` done, `✗` failed or `■` stopped.

The header line counts all three and shows a red `failed` count when a command or agent has failed. Colours come from your terminal theme.

## Use

The pane opens when a session starts. If your terminal is narrower than 110 columns it waits undrawn; open it at any width with:

```
/session-notes
```

`/session-notes clear` empties all three boxes.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install session-notes --marketplace pongsixtyfour/mods
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```
claude plugin install session-notes --marketplace pongsixtyfour/mods
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `pongsixtyfour/mods`, then Add plugin.

## Limits

- It records tool calls made after it loads, not earlier ones.
- It tracks `Read`, `Edit`, `Write` and `Bash`, and agent starts and ends. It ignores `NotebookEdit`, `Glob` and `Grep`.
- Calls made inside a subagent appear in the Files and Commands boxes mixed in with your own; they are not marked as the agent's.
- Files show as their last two folders plus the name, so same-named files in matching folders look alike.
- A teammate agent shows as done after its first finished turn, then updates again on its next.
- The pane keeps the newest 100 commands and 50 agents, and shows as many rows per box as fit.
- Notes are kept in session state across reloads. Notes saved by a different version of the mod are dropped.

## Develop

```
claude plugin validate .
claude plugin test .
```

The tests cover file marks and the strongest-mark rule, command ok and failed, `clear`, the empty pane, calls made inside a subagent, agent running, done, stopped, failed and refused, an agent that ends before its spawn call returns, the model shown, and old saved notes being dropped.
