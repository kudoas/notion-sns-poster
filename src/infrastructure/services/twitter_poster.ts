import encBase64 from 'crypto-js/enc-base64';
import hmacSha1 from 'crypto-js/hmac-sha1';
import OAuth from 'oauth-1.0a';
import { SnsPoster } from '../../domain/model/sns_poster';
import { Article } from '../../domain/model/article';
import { buildText } from './utils';

export class TwitterPoster implements SnsPoster {
  private oauth: OAuth;

  constructor(
    private readonly consumerKey: string,
    private readonly consumerSecret: string,
    private readonly accessToken: string,
    private readonly accessSecret: string,
  ) {
    this.oauth = new OAuth({
      consumer: { key: this.consumerKey, secret: this.consumerSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return hmacSha1(base_string, key).toString(encBase64);
      },
    });
  }

  async postArticle(article: Article): Promise<void> {
    console.log(`TwitterPoster: Posting article to X (Twitter) via oauth-1.0a: ${article.title}`);

    const text = buildText(article);
    const apiUrl = 'https://api.twitter.com/2/tweets';
    const tweetPayload = { text };

    try {
      const resp = await this.fetchWithAuth(apiUrl, 'POST', tweetPayload);
      if (!resp.ok) {
        const body = await resp.text();
        console.error('TwitterPoster: Twitter API response error body:', body);
        let detail = '';
        try {
          const parsedBody = JSON.parse(body);
          detail = parsedBody.detail || parsedBody.title || '';
        } catch (e) {
          // JSONパース失敗時は何もしない
        }
        throw new Error(`TwitterPoster: Failed to post article ${article.id} to Twitter: ${resp.status} ${resp.statusText}. ${detail}`);
      }

      console.log('TwitterPoster: X (Twitter) post successful.');
    } catch (error: any) {
      console.error('TwitterPoster: Error posting article to X (Twitter):', error.message);
      throw error;
    }
  }

  private async fetchWithAuth(url: string, method: string, body: object | undefined) {
    const requestData: OAuth.RequestOptions = {
      url,
      method,
    };
    if (method === 'POST' || method === 'PUT') {
      requestData.data = body;
      requestData.includeBodyHash = true;
    }

    const oauthHeaders = this.oauth.toHeader(
      this.oauth.authorize(requestData, { key: this.accessToken, secret: this.accessSecret }),
    );

    const headers: HeadersInit = { ...oauthHeaders };
    let reqBody: BodyInit | null = null;

    if (method === 'POST' || method === 'PUT') {
      headers['Content-Type'] = 'application/json';
      reqBody = JSON.stringify(body);
    }

    return fetch(url, {
      method,
      headers,
      body: reqBody,
    });
  }
} 
