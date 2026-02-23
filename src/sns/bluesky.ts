import { AtpAgent, RichText } from '@atproto/api'
import type { Article, SnsPoster } from './interface.ts'
import { buildText } from './utils.ts'

export class BlueskyPoster implements SnsPoster {
  constructor(
    private readonly identifier: string,
    private readonly password: string,
    private readonly service: string = 'https://bsky.social'
  ) {}

  async postArticle(article: Article): Promise<void> {
    try {
      const agent = new AtpAgent({ service: this.service })
      await agent.login({
        identifier: this.identifier,
        password: this.password,
      })
      const text = buildText(article)
      const rt = new RichText({ text })
      await rt.detectFacets(agent)
      await agent.post({ text: rt.text, facets: rt.facets })
    } catch (e) {
      const _message = e instanceof Error ? e.message : String(e)

      throw e
    }
  }
}
