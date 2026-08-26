import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cachedArticleHtml, loadArticleHtml, prefetchArticle, publicUrl } from '../articleContent';
import { articleRoute, articlesByNumber, pickRandomArticle } from '../archiveNavigation';
import { NotFoundPage } from './StaticPages';
import type { Article } from '../types';

function useArticleHtml(article?: Article) {
  const [state, setState] = useState<{ path?: string; html?: string; error?: string }>({});
  const path = article?.contentPath;
  const current = state.path === path ? state : { path, html: article ? cachedArticleHtml(article) : undefined };

  useEffect(() => {
    if (!article) return;
    let active = true;
    const cached = cachedArticleHtml(article);
    if (cached !== undefined) setState({ path: article.contentPath, html: cached });
    else {
      setState({ path: article.contentPath });
      loadArticleHtml(article)
        .then((html) => { if (active) setState({ path: article.contentPath, html }); })
        .catch((error) => { if (active) setState({ path: article.contentPath, error: error.message }); });
    }
    return () => { active = false; };
  }, [article]);
  return current;
}

function rewriteRelativeUrls(html: string, base: string) {
  const doc = new DOMParser().parseFromString(`<div id="article-root">${html}</div>`, 'text/html');
  doc.querySelectorAll<HTMLElement>('[src], [href]').forEach((el) => {
    for (const attr of ['src', 'href']) {
      const value = el.getAttribute(attr);
      if (value && !/^(?:[a-z]+:|#|\/)/i.test(value)) el.setAttribute(attr, new URL(value, base).href);
    }
  });
  doc.querySelectorAll('table').forEach((table, index) => {
    if (table.parentElement?.classList.contains('table-scroll')) return;
    const wrapper = doc.createElement('div');
    wrapper.className = 'table-scroll';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', `Scrollable record table ${index + 1}`);
    wrapper.tabIndex = 0;
    table.replaceWith(wrapper);
    wrapper.append(table);
  });
  return doc.getElementById('article-root')?.innerHTML || html;
}

function extractSections(html?: string) {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll<HTMLHeadingElement>('h2[id]')]
    .map((heading) => ({ id: heading.id, label: heading.textContent?.trim() ?? '' }))
    .filter((section) => section.label);
}

function buildCustomDocument(html: string, article: Article, base: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const baseElement = doc.createElement('base'); baseElement.href = base; doc.head.prepend(baseElement);
  if (article.hasStyle) { const link = doc.createElement('link'); link.rel = 'stylesheet'; link.href = 'style.css'; doc.head.append(link); }
  if (article.hasScript) { const script = doc.createElement('script'); script.src = 'script.js'; script.defer = true; doc.body.append(script); }
  return `<!doctype html>${doc.documentElement.outerHTML}`;
}

export function SCPPage({ articles }: { articles: Article[] }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const article = articles.find((item) => item.id.toLowerCase() === id.toLowerCase());
  const content = useArticleHtml(article);
  const sections = useMemo(() => extractSections(content.html), [content.html]);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    setShowLoading(false);
    if (!article || content.html !== undefined || content.error) return;
    const timer = window.setTimeout(() => setShowLoading(true), 150);
    return () => window.clearTimeout(timer);
  }, [article, content.html, content.error]);

  useEffect(() => {
    if (!article || article.mode === 'custom' || content.html === undefined) return;
    const nodes: HTMLElement[] = [];
    if (article.hasStyle) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = publicUrl(`${article.assetBase}style.css`); link.dataset.articleAsset = article.slug; document.head.append(link); nodes.push(link);
    }
    if (article.hasScript) {
      const script = document.createElement('script'); script.src = publicUrl(`${article.assetBase}script.js`); script.defer = true; script.dataset.articleAsset = article.slug; document.body.append(script); nodes.push(script);
    }
    return () => nodes.forEach((node) => node.remove());
  }, [article, content.html]);

  if (!article) return <NotFoundPage unknownDesignation />;
  if (content.error) return <section className="page narrow-page"><p className="eyebrow">RETRIEVAL ERROR</p><h1>{article.id}</h1><p>The record body could not be loaded: {content.error}</p></section>;
  if (content.html === undefined) return <div className="loading-record" role="status" aria-busy="true">{showLoading ? 'Retrieving record…' : ''}</div>;

  if (article.mode === 'custom') {
    const base = new URL(publicUrl(article.assetBase), window.location.href).href;
    const source = buildCustomDocument(content.html, article, base);
    return <section className="custom-record"><div className="custom-record-bar"><Link to="/archive">← Archive</Link><span>{article.id}</span><span>{article.title}</span><span>AI-assisted fiction · <Link to="/licensing">CC BY-SA 3.0</Link></span></div><iframe title={`${article.id}: ${article.title}`} srcDoc={source} sandbox="allow-scripts allow-same-origin" /></section>;
  }

  const base = new URL(publicUrl(article.assetBase), window.location.href).href;
  const orderedArticles = articlesByNumber(articles);
  const articleIndex = orderedArticles.findIndex((item) => item.id === article.id);
  const previous = orderedArticles[(articleIndex - 1 + orderedArticles.length) % orderedArticles.length];
  const next = orderedArticles[(articleIndex + 1) % orderedArticles.length];
  const goToSection = (sectionId: string, control: HTMLButtonElement) => {
    const heading = document.getElementById(sectionId);
    if (!heading) return;
    control.closest('details')?.removeAttribute('open');
    heading.tabIndex = -1;
    heading.scrollIntoView({ block: 'start' });
    heading.focus({ preventScroll: true });
    heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
  };
  const goToRandom = () => {
    const randomArticle = pickRandomArticle(articles, article.id);
    if (randomArticle) {
      prefetchArticle(randomArticle);
      navigate(articleRoute(randomArticle));
    }
  };

  return <article className="scp-page">
    <header className="scp-header"><p className="eyebrow">SECURE CONTAINMENT FILE</p><div><h1>{article.id}</h1><p>{article.title}</p></div><dl className="document-meta"><div><dt>Object class</dt><dd>{article.objectClass}</dd></div><div><dt>Date added</dt><dd>{article.dateAdded}</dd></div></dl>{article.contentWarnings.length > 0 && <details className="content-advisory"><summary>Reader advisory</summary><p>{article.contentWarnings.join(', ')}.</p></details>}</header>
    {sections.length > 2 && <details className="file-sections"><summary>File sections <span>{sections.length}</span></summary><ol>{sections.map((section) => <li key={section.id}><button type="button" onClick={(event) => goToSection(section.id, event.currentTarget)}>{section.label}</button></li>)}</ol></details>}
    <div className="article-body" dangerouslySetInnerHTML={{ __html: rewriteRelativeUrls(content.html, base) }} />
    {(article.sources?.length ?? 0) > 0 && <section className="source-credits" aria-labelledby="source-credits-heading"><h2 id="source-credits-heading">Sources and attribution</h2><ul>{article.sources!.map((source) => <li key={source.url}>Uses material from <a href={source.url}>{source.title}</a> by {source.author}</li>)}</ul></section>}
    <nav className="record-navigation" aria-label="Record navigation">
      <Link className="record-return" to="/archive">← Return to archive</Link>
      <div className="record-sequence">
        <Link to={articleRoute(previous)} onPointerEnter={() => prefetchArticle(previous)} onFocus={() => prefetchArticle(previous)} aria-label={`Previous record: ${previous.id}, ${previous.title}`}><span>Previous</span><strong>{previous.id}</strong></Link>
        <button type="button" onClick={goToRandom}><span>Random</span><strong>Random file</strong></button>
        <Link to={articleRoute(next)} onPointerEnter={() => prefetchArticle(next)} onFocus={() => prefetchArticle(next)} aria-label={`Next record: ${next.id}, ${next.title}`}><span>Next</span><strong>{next.id}</strong></Link>
      </div>
    </nav>
    <footer className="record-footer"><span>AI-assisted fiction</span><Link to="/licensing">CC BY-SA 3.0</Link></footer>
  </article>;
}
