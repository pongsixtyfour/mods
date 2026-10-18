# done-sound

A Claude Code mod that plays a sound when a long turn finishes, so you can look away while Claude works.

## Behaviour

It plays after a turn only when all of these hold:

- the turn ran for 15 seconds or more
- it is the main session's turn, not a subagent's
- you did not interrupt it

The clip is a short three-note chime (`sounds/done.wav`, generated for this mod) at gain 3. Playback uses `afplay`, so on Linux and Windows terminals it plays nothing.

## Install

```
/plugin install done-sound --marketplace pongsixtyfour/done-sound
```

## Configure

Edit the two constants at the top of `hooks/register.ts`:

- `MIN_MS`: the shortest turn that earns a sound, in milliseconds (default `15_000`)
- `GAIN`: linear volume from 0 to 4 (default `3`)

To change the sound, replace `sounds/done.wav` with any audio file `afplay` can play (keep the name, or update the path in `register.ts`).

## Develop

```
claude plugin validate .
claude plugin test .
```

The tests cover the four cases above: a long turn plays, and a short turn, an interrupted turn and a subagent turn stay silent.
