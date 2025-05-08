import { Article } from '../../domain/model/article';
import { SnsPoster } from '../../domain/model/sns_poster';
import { INotionRepository } from '../../domain/repository/notion_repository';
import { BlueskyPoster } from '../../infrastructure/services/bluesky_poster';
import { TwitterPoster } from '../../infrastructure/services/twitter_poster';
import { AppConfig } from '../../infrastructure/config/config_service';

export class SchedulerUseCase {
  private notionRepository: INotionRepository;
  private snsPosters: SnsPoster[] = [];
  private appConfig: AppConfig;

  constructor(config: AppConfig, notionRepository: INotionRepository) {
    this.appConfig = config;
    this.notionRepository = notionRepository;
  }

  private async initializeSnsPosters(): Promise<void> {
    console.log('SchedulerUseCase: Initializing SNS posters...');
    const config = this.appConfig;

    if (config.bluesky) {
      const blueskyPoster = new BlueskyPoster(config.bluesky.service);
      try {
        await blueskyPoster.login(config.bluesky);
        this.snsPosters.push(blueskyPoster);
        console.log('SchedulerUseCase: BlueskyPoster initialized and logged in.');
      } catch (error) {
        console.error('SchedulerUseCase: Failed to initialize or login BlueskyPoster:', error);
      }
    }

    if (config.twitter) {
      const twitterPoster = new TwitterPoster(
        config.twitter.appKey,
        config.twitter.appSecret,
        config.twitter.accessToken,
        config.twitter.accessSecret
      );
      this.snsPosters.push(twitterPoster);
      console.log('SchedulerUseCase: TwitterPoster instance created.');
    }

    if (this.snsPosters.length === 0) {
      console.warn('SchedulerUseCase: No SNS posters were successfully initialized. Posting will not occur.');
    }
    console.log(`SchedulerUseCase: ${this.snsPosters.length} SNS poster(s) initialized.`);
  }

  async execute(): Promise<void> {
    console.log('SchedulerUseCase: Starting execution.');

    await this.initializeSnsPosters();

    if (this.snsPosters.length === 0) {
      console.warn('SchedulerUseCase: No SNS posters available. Skipping article processing.');
      return;
    }
    console.log(`SchedulerUseCase: Using ${this.snsPosters.length} SNS poster(s).`);

    let articlesToPost: Article[];
    try {
      articlesToPost = await this.notionRepository.getUnpostedArticles();
    } catch (error) {
      console.error('SchedulerUseCase: Error fetching articles from Notion:', error);
      return;
    }

    console.log(`SchedulerUseCase: Prepared ${articlesToPost.length} articles for posting.`);

    for (const article of articlesToPost) {
      let postSuccessfulInAtLeastOneSns = false;
      const postPromises = this.snsPosters.map(poster =>
        poster.postArticle(article).then(() => {
          console.log(`SchedulerUseCase: Article ${article.id} successfully posted via ${poster.constructor.name}.`);
          return { status: 'fulfilled', value: poster.constructor.name };
        }).catch(e => {
          console.error(`SchedulerUseCase: Error posting article ${article.id} to ${poster.constructor.name}:`, e);
          return { status: 'rejected', reason: e, posterName: poster.constructor.name };
        })
      );

      const results = await Promise.allSettled(postPromises);

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          postSuccessfulInAtLeastOneSns = true;
        }
      });

      if (postSuccessfulInAtLeastOneSns) {
        console.log(`SchedulerUseCase: Article ${article.id} posted successfully to at least one SNS. Updating Notion flag.`);
        try {
          await this.notionRepository.markArticleAsPosted(article.id);
        } catch (updateError) {
          console.error(`SchedulerUseCase: Failed to update Notion flag for article ${article.id}:`, updateError);
        }
      } else {
        console.warn(`SchedulerUseCase: Article ${article.id} failed to post to all configured SNS. Skipping Notion flag update.`);
      }
    }

    console.log('SchedulerUseCase: Execution finished.');
  }
} 
