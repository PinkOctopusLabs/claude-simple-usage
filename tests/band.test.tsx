import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'simple-usage',
  component: 'PromptHint',
  props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
  viewport: { columns: 130, rows: 40 },
} as const

test('shows context and rate limits after a measurement', async ($, on) => {
  const toasts: string[] = []
  on('session.measure', ($, e) => ({ changed: e.changed }))
  mock.clock(on, { now: Date.parse('2026-10-16T12:00:00Z') })
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })

  await $.session.measure({
    context: { tokens: 84_000, window: 200_000, percent: 42 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 23, resetsAt: '2026-10-16T14:14:00Z' },
      { kind: 'seven_day', percentUsed: 91 },
    ],
    changed: ['context', 'rateLimits'],
  })

  expect(toasts).toEqual(['7d limit at 91%'])

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface } as never)
    expect(await ui.find({ type: 'Text', text: /42%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /84k\/200k/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /23%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /91%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /↻2h14m/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /│/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /for shortcuts/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^[▰▱]{10} / })).toBeDefined()
    await ui.unmount()
  }
})

test('drops the bars, then the detail, as the terminal narrows', async ($, on) => {
  on('session.measure', ($, e) => ({ changed: e.changed }))
  mock.clock(on, { now: Date.parse('2026-10-16T12:00:00Z') })
  on('ui.toast', () => ({ value: undefined }))
  await $.session.measure({
    context: { tokens: 84_000, window: 200_000, percent: 42 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 23, resetsAt: '2026-10-16T14:14:00Z' },
      { kind: 'seven_day', percentUsed: 9 },
    ],
    changed: ['context', 'rateLimits'],
  })

  const at = async (columns: number) => {
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal', viewport: { columns, rows: 40 } } as never)
    const found = {
      bars: (await ui.find({ type: 'Text', text: /[▰▱]/ })) !== undefined,
      detail: (await ui.find({ type: 'Text', text: /84k\/200k/ })) !== undefined,
      percent: (await ui.find({ type: 'Text', text: /42%/ })) !== undefined,
    }
    await ui.unmount()
    return found
  }

  expect(await at(160)).toEqual({ bars: true, detail: true, percent: true })
  expect(await at(100)).toEqual({ bars: false, detail: true, percent: true })
  expect(await at(70)).toEqual({ bars: false, detail: false, percent: true })
})
