import encBase64 from 'crypto-js/enc-base64';
import hmacSha1 from 'crypto-js/hmac-sha1';
import OAuth from 'oauth-1.0a';
import { SnsPoster, Article } from './interface';
import { buildText } from './utils';

export class TwitterPoster implements SnsPoster {
  constructor(
    private readonly consumerKey: string,
    private readonly consumerSecret: string,
    private readonly accessToken: string,
    private readonly accessSecret: string,
  ) { }

  async postArticle(article: Article): Promise<void> {
    const text = buildText(article);
    const apiUrl = 'https://api.twitter.com/2/tweets';
    const tweetPayload = { text };

    try {
      const resp = await this.#fetchWithAuth(apiUrl, 'POST', tweetPayload);
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`Failed to post article ${article.id} to Twitter: ${resp.status} ${resp.statusText} ${body}`);
      }
    } catch (e) {
      console.error('Error posting article to X (Twitter):', e.message);
      throw e
    }
  }

  /**
   * @see https://blog.lacolaco.net/2023/08/inside-laco-feed/
   */
  async #fetchWithAuth(url: string, method: string, body: object) {
    const oauth = new OAuth({
      consumer: { key: this.consumerKey, secret: this.consumerSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return hmacSha1(base_string, key).toString(encBase64);
      },
    });

    const oauthHeaders = oauth.toHeader(
      oauth.authorize({ url, method, data: body, includeBodyHash: true }, { key: this.accessToken, secret: this.accessSecret }),
    );

    return fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...oauthHeaders },
      body: JSON.stringify(body),
    });
  }
}
