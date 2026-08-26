import type { Article } from './types';

export const articleRoute = (article: Article) => `/scp/${article.id.toLowerCase()}`;

export function pickRandomArticle(
  articles: Article[],
  currentId?: string,
  random: () => number = Math.random,
) {
  if (articles.length === 0) return undefined;
  const choices = articles.length > 1 && currentId
    ? articles.filter((article) => article.id !== currentId)
    : articles;
  return choices[Math.floor(random() * choices.length)];
}
