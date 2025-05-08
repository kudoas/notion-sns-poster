import { Article } from '../../domain/model/article';

export function buildText(article: Article): string {
  // 投稿フォーマットはここで一元管理できます
  // 例: タイトルとURLの間に空行を入れる、ハッシュタグを付与するなど
  return `${article.title}\n${article.url}`;
} 
