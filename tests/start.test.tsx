import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'simple-usage',
  component: 'PromptHint',
  props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
  viewport: { columns: 130, rows: 40 },
} as const

test('draws before session.start has stored anything (e.g. after /reload-plugins)', async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-16T12:00:00Z') })
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }) as never)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeDefined()
  await ui.unmount()
})

test('draws after a fresh session start, before any measurement', async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-16T12:00:00Z') })
  on('command.register', () => ({ value: undefined }) as never)
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }) as never)
  on('session.start', ($, e) => ({ cwd: '/tmp' }) as never)

  await $.session.start({ cwd: '/tmp' } as never)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeDefined()
  await ui.unmount()
})
