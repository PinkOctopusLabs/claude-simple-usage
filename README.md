# simple-usage

A Claude Code mod that shows how much of your context window and plan rate limits you've used, on the line under the prompt:

```
⏵⏵ auto mode on (shift+tab to cycle)      ctx ▰▰▰▰▱▱▱▱▱▱ 42% 84k/200k  │  5h ▰▰▱▱▱▱▱▱▱▱ 23% ↻2h14m  │  7d ▰▱▱▱▱▱▱▱▱▱ 9% ↻4d
```

- **ctx:** how full the context window is, with tokens used out of the window size.
- **5h / 7d:** your plan's 5-hour and 7-day rate limits, with time until each resets. Off a subscription plan, the session's cost shows instead.
- **Colours:** green below 60%, yellow from 60%, red from 85%. A notice pops up once when a limit passes 90%.
- **Narrow terminals:** the bars drop out first, then the token counts and reset times, leaving `ctx 42% │ 5h 23% │ 7d 9%`.

Figures update after each turn and whenever a rate-limit window moves by a full point.

## Install

```
/plugin marketplace add PinkOctopusLabs/claude-simple-usage
/plugin install simple-usage@claude-simple-usage
```

Or from a terminal:

```
claude plugin marketplace add PinkOctopusLabs/claude-simple-usage
claude plugin install simple-usage@claude-simple-usage
```

## Use

`/usage-bar` shows or hides it. While it's hidden, the normal hint line comes back.

## What it hooks

- `session.start`: registers `/usage-bar` and reads the session's current usage figures.
- `session.measure`: stores the latest context and rate-limit figures, and shows a one-time notice when a limit passes 90%. It only observes; the figures pass on unchanged.
- `command.run` for `/usage-bar` only: toggles the line on or off. It answers that one command and doesn't see or change any other command.
- `ui.render` for the hint line under the prompt: draws the hint text followed by the usage figures. While hidden, it leaves the engine's own hint line in place.

It makes no network requests, reads or writes no files, and keeps its figures only for the current session.

## Develop

```
claude --plugin-dir .          # run a session with the mod loaded
claude plugin validate .       # check the manifest and hooks
claude plugin test .           # run tests/
```

## Support

simple-usage is free and provided as-is, without support.

## Privacy

It collects nothing and makes no network requests. See [PRIVACY.md](PRIVACY.md).

## License

MIT. See [LICENSE](LICENSE).
