import type { Register, SessionContextUsage, SessionCost, SessionRateLimit } from 'claude-code'

import type { Usage } from '../types'

const USAGE = { plugin: 'simple-usage', key: 'usage' } as const
const IS_HIDDEN = { plugin: 'simple-usage', key: 'isHidden' } as const

const LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }
const WARN_AT = 90

type Figures = { context: SessionContextUsage; rateLimits: SessionRateLimit[]; cost?: SessionCost }

const toUsage = ({ context, rateLimits, cost }: Figures): Usage => ({
  contextTokens: context.tokens,
  contextWindow: context.window,
  contextPercent: context.percent,
  limits: rateLimits.map(({ kind, percentUsed, resetsAt }) => ({ kind, percentUsed, resetsAt })),
  costUsd: cost?.usd,
})

const colorFor = (percent: number) => (percent >= 85 ? 'error' : percent >= 60 ? 'warning' : 'success')

const bar = (percent: number, width: number) => {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width)
  return '▰'.repeat(filled) + '▱'.repeat(width - filled)
}

const compact = (tokens: number) =>
  tokens >= 1_000_000 ? `${(tokens / 1_000_000).toFixed(1)}M` : `${Math.round(tokens / 1000)}k`

const until = (resetsAt: string | undefined, now: number) => {
  if (!resetsAt) return ''
  const minutes = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60_000))
  if (minutes >= 48 * 60) return `${Math.round(minutes / 1440)}d`
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`
  return `${minutes}m`
}

export const register: Register = on => {
  // Kinds already warned about, so a toast fires once per crossing.
  const warned = new Set<string>()

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'usage-bar', description: 'Show or hide the usage bar under the prompt' })
    const figures = await $.session.usage()
    await $.state.set(USAGE, toUsage(figures))

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await $.state.set(USAGE, toUsage(e))

    for (const limit of e.rateLimits) {
      if (limit.percentUsed >= WARN_AT && !warned.has(limit.kind)) {
        warned.add(limit.kind)
        $.ui.toast(`${LABELS[limit.kind] ?? limit.kind} limit at ${limit.percentUsed}%`)
      } else if (limit.percentUsed < WARN_AT) {
        warned.delete(limit.kind)
      }
    }

    return next(e)
  })

  on('command.run', { command: 'usage-bar' }, async ($) => {
    const held = await $.state.get(IS_HIDDEN)
    const hidden = !held.value
    await $.state.set(IS_HIDDEN, hidden)

    return { text: hidden ? 'Usage bar hidden.' : 'Usage bar shown.' }
  })

  // Drawn in place of the hint line under the prompt: the engine's hint, then usage padded out
  // to the right edge. The engine sizes this site to its content, so the padding is counted here.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const { value: hidden } = await $.state.get(IS_HIDDEN)
    if (hidden) {
      return next(e)
    }

    // Nothing stored yet (drawn before session.start, or after /reload-plugins, which skips it):
    // read the figures directly rather than waiting for the next measurement.
    const { value: stored } = await $.state.get(USAGE)
    const u = stored ?? toUsage(await $.session.usage())

    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const columns = e.viewport?.columns ?? 120
    const room = columns - MODE_LABEL_RESERVE - [...e.props.hint].length - MIN_GAP

    // The fullest layout that fits: bars and detail, then detail alone, then percentages alone.
    const layouts = [
      { width: BAR_WIDTH, isDetailed: true },
      { width: 0, isDetailed: true },
      { width: 0, isDetailed: false },
    ]
    let segments: Segment[] = []
    for (const layout of layouts) {
      segments = usageSegments(u, layout.width, layout.isDetailed, now)
      if (lengthOf(segments) <= room) break
    }
    const gap = Math.max(MIN_GAP, room + MIN_GAP - lengthOf(segments))

    return (
      <Box flexDirection="row">
        <Text key="hint" dimColor>
          {e.props.hint}
          {' '.repeat(gap)}
        </Text>
        {segments.map((seg, i) => (
          <Text key={`seg-${i}`} dimColor={seg.dim} color={seg.color}>
            {seg.text}
          </Text>
        ))}
      </Box>
    )
  })
}

type Segment = { text: string; dim?: boolean; color?: string }

const SEPARATOR = '  │  '
const MIN_GAP = 3
// Room for the label the engine draws left of the hint (`⏵⏵ auto mode on · `) and a right margin.
const MODE_LABEL_RESERVE = 22

const BAR_WIDTH = 10

const lengthOf = (segments: Segment[]) => segments.reduce((n, seg) => n + [...seg.text].length, 0)

const gauge = (percent: number, width: number): Segment => ({
  text: `${width ? `${bar(percent, width)} ` : ''}${percent}%`,
  color: colorFor(percent),
})

const contextSegments = (u: Usage, width: number, isDetailed: boolean): Segment[] => {
  const percent = u.contextPercent
  if (percent === undefined) {
    return [{ text: `ctx —${isDetailed ? ` /${compact(u.contextWindow)}` : ''}`, dim: true }]
  }
  const detail =
    isDetailed && u.contextTokens !== undefined ? ` ${compact(u.contextTokens)}/${compact(u.contextWindow)}` : ''
  return [{ text: 'ctx ', dim: true }, gauge(percent, width), ...(detail ? [{ text: detail, dim: true }] : [])]
}

const usageSegments = (u: Usage, width: number, isDetailed: boolean, now: number): Segment[] => {
  const items: Segment[][] = [contextSegments(u, width, isDetailed)]
  for (const limit of u.limits) {
    const reset = isDetailed ? until(limit.resetsAt, now) : ''
    items.push([
      { text: `${LABELS[limit.kind] ?? limit.kind} `, dim: true },
      gauge(limit.percentUsed, width),
      ...(reset ? [{ text: ` ↻${reset}`, dim: true }] : []),
    ])
  }
  if (u.limits.length === 0 && u.costUsd !== undefined) {
    items.push([{ text: `$${u.costUsd.toFixed(2)}`, dim: true }])
  }
  const separator = isDetailed ? SEPARATOR : ' │ '
  return items.flatMap((item, i) => (i === 0 ? item : [{ text: separator, dim: true }, ...item]))
}
