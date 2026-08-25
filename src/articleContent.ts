import type { Article } from './types';

const htmlPromises = new Map<string, Promise<string>>();
const resolvedHtml = new Map<string, string>();
const warmedAssets = new Set<string>();

export const publicUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path}`.replace(/([^:]\/)\/+/g, '$1');

export function cachedArticleHtml(article: Article) {
  return resolvedHtml.get(article.contentPath);
}

export function loadArticleHtml(article: Article) {
  const existing = htmlPromises.get(article.contentPath);
  if (existing) return existing;

  const request = fetch(publicUrl(article.contentPath))
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then((html) => {
      resolvedHtml.set(article.contentPath, html);
      return html;
    })
    .catch((error) => {
      htmlPromises.delete(article.contentPath);
      throw error;
    });

  htmlPromises.set(article.contentPath, request);
  return request;
}

function warmAsset(path: string, kind: 'style' | 'script') {
  const href = publicUrl(path);
  if (warmedAssets.has(href)) return;
  warmedAssets.add(href);
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  link.as = kind;
  document.head.append(link);
}

export function prefetchArticle(article: Article) {
  void loadArticleHtml(article).catch(() => undefined);
  if (article.hasStyle) warmAsset(`${article.assetBase}style.css`, 'style');
  if (article.hasScript) warmAsset(`${article.assetBase}script.js`, 'script');
}
