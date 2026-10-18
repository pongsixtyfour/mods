# mods

Small mods for Claude Code. Add the marketplace once, then install any of them.

| Mod | What it does |
| --- | --- |
| [done-sound](plugins/done-sound) | Plays a chime when a long turn finishes, so you can look away while Claude works. macOS, plus Linux and Windows (untested). |
| [session-notes](plugins/session-notes) | A side pane listing the files touched, commands run and agents started this session. |

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install done-sound --marketplace pongsixtyfour/mods
/plugin install session-notes --marketplace pongsixtyfour/mods
```

Answer `y` to add the marketplace the first time, then pick a scope.

From a shell:

```
claude plugin install done-sound --marketplace pongsixtyfour/mods
claude plugin install session-notes --marketplace pongsixtyfour/mods
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `pongsixtyfour/mods`, then Add plugin.

## Develop

Each mod lives in `plugins/<name>` with its own tests:

```
claude plugin validate plugins/<name>
claude plugin test plugins/<name>
```
