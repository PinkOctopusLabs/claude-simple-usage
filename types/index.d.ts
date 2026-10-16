export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

export type Usage = {
  contextTokens?: number
  contextWindow: number
  contextPercent?: number
  limits: Limit[]
  costUsd?: number
}

declare module 'claude-code' {
  interface PluginState {
    'simple-usage': { usage: Usage | null; isHidden: boolean }
  }
}
