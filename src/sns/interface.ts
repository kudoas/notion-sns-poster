export type Article = {
  id: string;
  title: string;
  url: string;
}

export interface SnsPoster {
  postArticle(article: Article): Promise<void>;
}
