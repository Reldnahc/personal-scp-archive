import { useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { prefetchArticle } from '../articleContent';
import { articleRoute, articlesByNumber, pickRandomArticle } from '../archiveNavigation';
import type { Article } from '../types';

type SortOrder = 'number' | 'newest' | 'oldest';

function readSortOrder(value: string | null): SortOrder {
  return value === 'newest' || value === 'oldest' ? value : 'number';
}

export function ArchivePage({ articles }: { articles: Article[] }) {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const objectClass = searchParams.get('class') ?? '';
  const tag = searchParams.get('tag') ?? '';
  const sortOrder = readSortOrder(searchParams.get('sort'));
  const showClearAll = Boolean(query || objectClass || tag);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = articlesByNumber(articles).filter((article) =>
      (!objectClass || article.objectClass === objectClass)
      && (!tag || article.tags.includes(tag))
      && (!needle || [article.id, article.title, article.objectClass, article.description, ...article.tags].join(' ').toLowerCase().includes(needle))
    );
    filtered.sort((a, b) => {
      if (sortOrder === 'number') return a.id.localeCompare(b.id);
      return sortOrder === 'newest'
        ? b.dateAdded.localeCompare(a.dateAdded) || a.id.localeCompare(b.id)
        : a.dateAdded.localeCompare(b.dateAdded) || a.id.localeCompare(b.id);
    });
    return filtered;
  }, [articles, objectClass, query, sortOrder, tag]);

  const setArchiveParam = (key: 'q' | 'class' | 'tag' | 'sort', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || (key === 'sort' && value === 'number')) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = (focusSearch = false) => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('class');
    next.delete('tag');
    setSearchParams(next, { replace: true });
    if (focusSearch) window.requestAnimationFrame(() => searchRef.current?.focus());
  };

  const openRandom = () => {
    const article = pickRandomArticle(visible);
    if (!article) return;
    prefetchArticle(article);
    navigate(articleRoute(article));
  };

  return (
    <section className="page archive-page">
      <header className="page-heading">
        <p className="eyebrow">CENTRAL INDEX</p><h1>Case files</h1>
        <p>Designations are non-chronological. Search, filter, or order records by designation or date.</p>
      </header>
      {articles.length > 0 && <>
        <form className="archive-tools" role="search" onSubmit={(event) => event.preventDefault()}>
          <label><span>Search records</span><input ref={searchRef} type="search" value={query} onChange={(event) => setArchiveParam('q', event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape' && query) { event.preventDefault(); setArchiveParam('q', ''); } }} placeholder="Number, title, class, tag…" aria-controls="archive-results" /></label>
          <fieldset className="archive-sort"><legend>Sort records</legend><div><button type="button" aria-pressed={sortOrder === 'number'} aria-controls="archive-results" onClick={() => setArchiveParam('sort', 'number')}>SCP number</button><button type="button" aria-pressed={sortOrder === 'newest'} aria-controls="archive-results" onClick={() => setArchiveParam('sort', 'newest')}>Newest</button><button type="button" aria-pressed={sortOrder === 'oldest'} aria-controls="archive-results" onClick={() => setArchiveParam('sort', 'oldest')}>Oldest</button></div></fieldset>
          <p aria-live="polite" aria-atomic="true">{visible.length} {visible.length === 1 ? 'record' : 'records'}</p>
        </form>
        <div className="archive-actions" role="group" aria-label="Archive actions">
          <button type="button" className="random-file" onClick={openRandom} disabled={visible.length === 0} aria-label={visible.length === 0 ? 'No matching records available' : 'Open a random record from the current results'}>Random file</button>
          {showClearAll && <div className="archive-filter-status">
            <span className="archive-filter-label">Active filters</span>
            {objectClass && <p>Class: <strong>{objectClass}</strong> <button type="button" onClick={() => setArchiveParam('class', '')} aria-label={`Clear ${objectClass} class filter`}>Clear class</button></p>}
            {tag && <p>Tag: <strong>{tag}</strong> <button type="button" onClick={() => setArchiveParam('tag', '')} aria-label={`Clear ${tag} tag filter`}>Clear tag</button></p>}
            <button type="button" className="clear-filters" onClick={() => clearFilters(true)}>Clear all filters</button>
          </div>}
        </div>
      </>}
      {articles.length === 0 ? <EmptyArchive /> : visible.length === 0 ? <div className="empty-state" id="archive-results"><p className="empty-code">NO MATCH</p><h2>No records meet those criteria.</h2><button className="text-button" onClick={() => clearFilters(true)}>Clear filters</button></div> : (
        <div className="record-list" id="archive-results">{visible.map((article) => <article className="record-row" key={article.id} onPointerEnter={() => prefetchArticle(article)} onFocus={() => prefetchArticle(article)} onTouchStart={() => prefetchArticle(article)}>
          <div className="record-id"><span>FILE</span><strong>{article.id}</strong></div>
          <div className="record-summary"><h2><Link to={articleRoute(article)} aria-label={`Open ${article.id}: ${article.title}`}>{article.title}</Link></h2><p>{article.description}</p><ul aria-label={`Tags for ${article.id}`}>{article.tags.map((articleTag) => <li key={articleTag}><button type="button" aria-pressed={tag === articleTag} aria-controls="archive-results" onClick={() => setArchiveParam('tag', tag === articleTag ? '' : articleTag)}>{articleTag}</button></li>)}</ul></div>
          <dl className="record-meta"><div><dt>Class</dt><dd><button type="button" className="record-class-filter" aria-pressed={objectClass === article.objectClass} aria-controls="archive-results" onClick={() => setArchiveParam('class', objectClass === article.objectClass ? '' : article.objectClass)}>{article.objectClass}</button></dd></div><div><dt>Added</dt><dd><time dateTime={article.dateAdded}>{article.dateAdded}</time></dd></div></dl>
          <span className="record-open" aria-hidden="true">→</span>
        </article>)}</div>
      )}
    </section>
  );
}

function EmptyArchive() {
  return <div className="empty-state ruled"><p className="empty-code">INDEX // 0000</p><h2>No files.</h2><p>The drawers are empty.</p></div>;
}
