import { describe, expect, it } from 'bun:test'
import { verifyNotionWebhookSignature } from './notion.ts'

async function buildSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const hash = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return `sha256=${hash}`
}

describe('verify notion webhook signature', () => {
  it('returns false when signature header is missing', () => {
    const req = new Request('https://example.com/notion-webhook', {
      method: 'POST',
      body: '{"hello":"world"}',
    })

    const actual = verifyNotionWebhookSignature('secret', req, '{"hello":"world"}')
    expect(actual).toBe(false)
  })

  it('returns true when signature matches body', async () => {
    const body = '{"type":"event"}'
    const secret = 'my-secret'
    const signature = await buildSignature(secret, body)
    const req = new Request('https://example.com/notion-webhook', {
      method: 'POST',
      headers: { 'X-Notion-Signature': signature },
      body,
    })

    const actual = verifyNotionWebhookSignature(secret, req, body)
    expect(actual).toBe(true)
  })

  it('returns false when signature does not match', async () => {
    const body = '{"type":"event"}'
    const wrongSignature = await buildSignature('wrong-secret', body)
    const req = new Request('https://example.com/notion-webhook', {
      method: 'POST',
      headers: { 'X-Notion-Signature': wrongSignature },
      body,
    })

    const actual = verifyNotionWebhookSignature('correct-secret', req, body)
    expect(actual).toBe(false)
  })
})
