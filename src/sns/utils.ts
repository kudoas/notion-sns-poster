import type { Article } from './interface.ts'

export const buildText = (article: Article): string => `🔖 ${article.title} ${article.url}`
