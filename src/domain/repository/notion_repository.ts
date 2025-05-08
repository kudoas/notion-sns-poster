import { Article } from '../model/article';

export interface INotionRepository {
  getUnpostedArticles(): Promise<Article[]>;
  markArticleAsPosted(articleId: string): Promise<void>;
} 
