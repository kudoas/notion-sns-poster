import { Article } from './article';

export interface SnsPoster {
  postArticle(article: Article): Promise<void>;
} 
