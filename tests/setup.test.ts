import { describe, it, expect } from 'vitest'

describe('test harness network guard', () => {
  it('blocks real fetch', () => {
    expect(() => void fetch('https://example.com')).toThrow(
      /Blocked real network access/
    )
  })

  it('blocks XMLHttpRequest', () => {
    expect(() => new XMLHttpRequest()).toThrow(/Blocked real network access/)
  })

  it('blocks WebSocket', () => {
    expect(() => new WebSocket('wss://example.com')).toThrow(
      /Blocked real network access/
    )
  })
})
