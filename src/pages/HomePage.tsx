import { Link } from 'react-router-dom';

export function HomePage({ articleCount }: { articleCount: number }) {
  return (
    <section className="home-page">
      <div className="archive-cover">
        <div className="cover-tab" aria-hidden="true">VOL. AI</div>
        <p className="cover-code">REGISTRY 7 / RESTRICTED</p>
        <div className="cover-seal" aria-hidden="true"><span>SCP</span><b>AI</b></div>
        <header className="cover-title">
          <p>Office of Anomalous Materials</p>
          <h1>SCP–AI</h1>
          <h2>Case Archive</h2>
        </header>
        <div className="cover-register">
          <dl><div><dt>Files</dt><dd>{String(articleCount).padStart(4, '0')}</dd></div><div><dt>Volume</dt><dd>AI</dd></div></dl>
        </div>
        <div className="cover-controls">
          <Link className="cover-entry" to="/archive">Open index <span aria-hidden="true">→</span></Link>
          <div className="cover-status">
            <span>Restricted</span>
            <p>{articleCount === 0 ? 'NO FILES CATALOGUED' : 'INDEX CURRENT'}</p>
          </div>
        </div>
        <p className="cover-warning">DO NOT REMOVE FROM RECORDS ROOM</p>
      </div>
    </section>
  );
}
