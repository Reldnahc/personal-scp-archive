import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { prefetchArticle } from '../articleContent';
import { articleRoute, pickRandomArticle } from '../archiveNavigation';
import type { Article } from '../types';

export function ArchivePage({ articles }: { articles: Article[] }) {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [objectClass, setObjectClass] = useState('');
  const [tag, setTag] = useState('');
  const classes = [...new Set(articles.map((article) => article.objectClass))].sort();
  const showClearAll = Boolean(query || objectClass);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return articles.filter((article) =>
      (!objectClass || article.objectClass === objectClass)
      && (!tag || article.tags.includes(tag))
      && (!needle || [article.id, article.title, article.description, ...article.tags].join(' ').toLowerCase().includes(needle))
    );
  }, [articles, objectClass, query, tag]);

  const clearFilters = (focusSearch = false) => {
    setQuery('');
    setObjectClass('');
    setTag('');
    if (focusSearch) window.requestAnimationFrame(() => searchRef.current?.focus());
  };

  const openRandom = () => {
    const article = pickRandomArticle(articles);
    if (!article) return;
    prefetchArticle(article);
    navigate(articleRoute(article));
  };

  return (
    <section className="page archive-page">
      <header className="page-heading">
        <p className="eyebrow">CENTRAL INDEX</p><h1>Case files</h1>
        <p>Newest entries first. Designations are non-chronological.</p>
      </header>
      {articles.length > 0 && <>
        <div className="archive-tools">
          <label><span>Search records</span><input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Number, title, tag…" /></label>
          <label><span>Object class</span><select value={objectClass} onChange={(event) => setObjectClass(event.target.value)}><option value="">All classes</option>{classes.map((name) => <option key={name}>{name}</option>)}</select></label>
          <p aria-live="polite" aria-atomic="true">{visible.length} {visible.length === 1 ? 'record' : 'records'}</p>
        </div>
        <div className="archive-actions" aria-label="Archive actions">
          <button type="button" className="random-file" onClick={openRandom}>Random file</button>
          {tag && <p>Tag: <strong>{tag}</strong> <button type="button" onClick={() => setTag('')} aria-label={`Clear ${tag} tag filter`}>Clear tag</button></p>}
          {showClearAll && <button type="button" className="clear-filters" onClick={() => clearFilters(true)}>Clear all filters</button>}
        </div>
      </>}
      {articles.length === 0 ? <EmptyArchive /> : visible.length === 0 ? <div className="empty-state"><p className="empty-code">NO MATCH</p><h2>No records meet those criteria.</h2><button className="text-button" onClick={() => clearFilters(true)}>Clear filters</button></div> : (
        <div className="record-list">{visible.map((article) => <article className="record-row" key={article.id} onPointerEnter={() => prefetchArticle(article)} onFocus={() => prefetchArticle(article)} onTouchStart={() => prefetchArticle(article)}>
          <div className="record-id"><span>FILE</span><strong>{article.id}</strong></div>
          <div className="record-summary"><h2><Link to={articleRoute(article)}>{article.title}</Link></h2><p>{article.description}</p><ul aria-label={`Tags for ${article.id}`}>{article.tags.map((articleTag) => <li key={articleTag}><button type="button" aria-pressed={tag === articleTag} onClick={() => setTag(tag === articleTag ? '' : articleTag)}>{articleTag}</button></li>)}</ul></div>
          <dl className="record-meta"><div><dt>Class</dt><dd>{article.objectClass}</dd></div><div><dt>Added</dt><dd><time dateTime={article.dateAdded}>{article.dateAdded}</time></dd></div></dl>
          <Link className="record-open" to={articleRoute(article)} aria-label={`Open ${article.id}: ${article.title}`}>→</Link>
        </article>)}</div>
      )}
    </section>
  );
}

function EmptyArchive() {
  return <div className="empty-state ruled"><p className="empty-code">INDEX // 0000</p><h2>No files.</h2><p>The drawers are empty.</p></div>;
}
