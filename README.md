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
/plugin install simple-usage --marketplace PinkOctopusLabs/claude-simple-usage
```

## Use

`/usage-band` shows or hides it. While it's hidden, the normal hint line comes back.

## Develop

```
claude --plugin-dir .          # run a session with the mod loaded
claude plugin validate .       # check the manifest and hooks
claude plugin test .           # run tests/
```

## License

MIT. See [LICENSE](LICENSE).
