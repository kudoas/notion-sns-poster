import { Article } from "./interface";

export const buildText = (article: Article): string => `🔖 ${article.title} ${article.url}`
