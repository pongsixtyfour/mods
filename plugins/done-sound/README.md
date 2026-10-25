# done-sound

A Claude Code mod that plays a sound when a long turn finishes, so you can look away while Claude works.

## Behaviour

It plays after a turn only when all of these hold:

- the turn ran for 15 seconds or more
- it is the main session's turn, not a subagent's
- you did not interrupt it

The clip is a short chime (`sounds/done.wav`, from the Cozy SFX pack).

## Platforms

| System | Player | Status |
| --- | --- | --- |
| macOS | the engine's own (`afplay`), at the configured gain (default 3) | tested |
| Linux | the first that works of `paplay`, `aplay`, `ffplay` | not tested on a real machine |
| Windows | `powershell.exe` with `Media.SoundPlayer` | not tested on a real machine |

On macOS nothing else is needed. On Linux, install one of the three players if none is there (`paplay` comes with PulseAudio and PipeWire, `aplay` with ALSA, `ffplay` with ffmpeg). Windows needs nothing extra.

The mod finds the system by running `uname`, so it needs the terminal (CLI) version of Claude Code, where mods can run commands. If no player works, it stays silent and does not fail. The Linux and Windows players use the system volume, so the clip is quieter there than on macOS, where gain 3 boosts it. This applies to terminal sessions only; the desktop app and VS Code are not covered.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install done-sound --marketplace pongsixtyfour/mods
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```
claude plugin install done-sound --marketplace pongsixtyfour/mods
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `pongsixtyfour/mods`, then Add plugin.

## Configure

Volume is a plugin option. Change `gain` (0 to 4, default `3`, macOS only) in `/config`, or under `pluginConfigs` in `settings.json`.

To change the shortest turn that earns a sound, edit `MIN_MS` at the top of `hooks/register.ts` (milliseconds, default `15_000`).

To change the sound, replace `sounds/done.wav` with a `.wav` file (the Windows player only plays `.wav`) (keep the name, or update the path in `register.ts`).

## Develop

```
claude plugin validate .
claude plugin test .
```

The tests cover when it plays (a long turn plays; a short, interrupted or subagent turn stays silent) and which player each system uses, with the commands faked.
