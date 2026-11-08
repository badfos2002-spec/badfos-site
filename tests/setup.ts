import '@testing-library/jest-dom/vitest'

// Network guard: tests must never open real connections (Firebase, Resend,
// OpenAI, anything). Mock at the module level instead. jsdom blocks some of
// these by default but not all (e.g. WebSocket), so every entry point is
// stubbed to throw.
function blockNetwork(name: string): never {
  throw new Error(
    `Blocked real network access in test: ${name}. Mock the module instead.`
  )
}

globalThis.fetch = ((..._args: unknown[]) =>
  blockNetwork('fetch')) as typeof fetch

class BlockedXHR {
  constructor() {
    blockNetwork('XMLHttpRequest')
  }
}
class BlockedWebSocket {
  constructor() {
    blockNetwork('WebSocket')
  }
}
class BlockedEventSource {
  constructor() {
    blockNetwork('EventSource')
  }
}

;(globalThis as Record<string, unknown>).XMLHttpRequest = BlockedXHR
;(globalThis as Record<string, unknown>).WebSocket = BlockedWebSocket
;(globalThis as Record<string, unknown>).EventSource = BlockedEventSource
