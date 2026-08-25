import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { prefetchArticle } from '../articleContent';
import type { Article } from '../types';

export function ArchivePage({ articles }: { articles: Article[] }) {
  const [query, setQuery] = useState('');
  const [objectClass, setObjectClass] = useState('');
  const classes = [...new Set(articles.map((a) => a.objectClass))].sort();
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return articles.filter((article) => (!objectClass || article.objectClass === objectClass) && (!needle || [article.id, article.title, article.description, ...article.tags].join(' ').toLowerCase().includes(needle)));
  }, [articles, objectClass, query]);

  return (
    <section className="page archive-page">
      <header className="page-heading">
        <p className="eyebrow">CENTRAL INDEX</p><h1>Case files</h1>
        <p>Newest entries first. Designations are non-chronological.</p>
      </header>
      {articles.length > 0 && <div className="archive-tools">
        <label><span>Search records</span><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Number, title, tag…" /></label>
        <label><span>Object class</span><select value={objectClass} onChange={(e) => setObjectClass(e.target.value)}><option value="">All classes</option>{classes.map((name) => <option key={name}>{name}</option>)}</select></label>
        <p aria-live="polite">{visible.length} {visible.length === 1 ? 'record' : 'records'}</p>
      </div>}
      {articles.length === 0 ? <EmptyArchive /> : visible.length === 0 ? <div className="empty-state"><p className="empty-code">NO MATCH</p><h2>No records meet those criteria.</h2><button className="text-button" onClick={() => { setQuery(''); setObjectClass(''); }}>Clear filters</button></div> : (
        <div className="record-list">{visible.map((article) => <article className="record-row" key={article.id} onPointerEnter={() => prefetchArticle(article)} onFocus={() => prefetchArticle(article)} onTouchStart={() => prefetchArticle(article)}>
          <div className="record-id"><span>FILE</span><strong>{article.id}</strong></div>
          <div className="record-summary"><h2><Link to={`/scp/${article.id.toLowerCase()}`}>{article.title}</Link></h2><p>{article.description}</p><ul aria-label="Tags">{article.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul></div>
          <dl className="record-meta"><div><dt>Class</dt><dd>{article.objectClass}</dd></div><div><dt>Added</dt><dd><time dateTime={article.dateAdded}>{article.dateAdded}</time></dd></div></dl>
          <Link className="record-open" to={`/scp/${article.id.toLowerCase()}`} aria-label={`Open ${article.id}: ${article.title}`}>→</Link>
        </article>)}</div>
      )}
    </section>
  );
}

function EmptyArchive() {
  return <div className="empty-state ruled"><p className="empty-code">INDEX // 0000</p><h2>No files.</h2><p>The drawers are empty.</p></div>;
}
