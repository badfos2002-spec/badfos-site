/**
 * Stand-in for the `resend` package, used ONLY by scripts/test-storage-cleanup.ts
 * (tsconfig.storage-cleanup-test.json maps "resend" here). No network: it
 * records what would have been sent, so the nightly cron route can be run end
 * to end and its owner alerts observed.
 */
export const __sent: { to: unknown; subject: string; html: string }[] = []

export class Resend {
  static __fake = true
  constructor(_key?: string) {}
  emails = {
    send: async (msg: { to: unknown; subject: string; html: string }) => {
      __sent.push({ to: msg.to, subject: msg.subject, html: msg.html })
      return { data: { id: 'fake' }, error: null }
    },
  }
}
