import { describe, expect, it } from 'bun:test'
import { createHmac } from 'node:crypto'
import { verifyNotionWebhookSignature } from './notion'

function buildSignature(secret: string, payload: string): string {
  const hash = createHmac('sha256', secret).update(payload).digest('hex')
  return `sha256=${hash}`
}

describe('verifyNotionWebhookSignature', () => {
  it('returns false when signature header is missing', () => {
    const req = new Request('https://example.com/notion-webhook', {
      method: 'POST',
      body: '{"hello":"world"}',
    })

    const actual = verifyNotionWebhookSignature('secret', req, '{"hello":"world"}')
    expect(actual).toBe(false)
  })

  it('returns true when signature matches body', () => {
    const body = '{"type":"event"}'
    const secret = 'my-secret'
    const signature = buildSignature(secret, body)
    const req = new Request('https://example.com/notion-webhook', {
      method: 'POST',
      headers: { 'X-Notion-Signature': signature },
      body,
    })

    const actual = verifyNotionWebhookSignature(secret, req, body)
    expect(actual).toBe(true)
  })

  it('returns false when signature does not match', () => {
    const body = '{"type":"event"}'
    const req = new Request('https://example.com/notion-webhook', {
      method: 'POST',
      headers: { 'X-Notion-Signature': buildSignature('wrong-secret', body) },
      body,
    })

    const actual = verifyNotionWebhookSignature('correct-secret', req, body)
    expect(actual).toBe(false)
  })
})
