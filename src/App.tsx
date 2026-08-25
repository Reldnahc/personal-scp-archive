import { NavLink, Route, Routes } from 'react-router-dom';
import manifest from './generated/content-manifest.json';
import type { Article } from './types';
import { ArchivePage } from './pages/ArchivePage';
import { HomePage } from './pages/HomePage';
import { AboutPage, LicensingPage } from './pages/StaticPages';
import { SCPPage } from './pages/SCPPage';

const articles = manifest.articles as Article[];

function Layout() {
  return (
    <div className="site-frame">
      <header className="site-header">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <div className="header-inner">
          <NavLink to="/" className="wordmark" aria-label="SCP-AI archive home">
            <span className="wordmark-mark" aria-hidden="true">AI</span>
            <span><b>SCP–AI</b><small>OFFICE OF ANOMALOUS MATERIALS</small></span>
          </NavLink>
          <nav aria-label="Primary navigation">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/archive">Archive</NavLink>
            <NavLink to="/about">About</NavLink>
          </nav>
        </div>
      </header>
      <main id="main-content">
        <Routes>
          <Route path="/" element={<HomePage articleCount={articles.length} />} />
          <Route path="/archive" element={<ArchivePage articles={articles} />} />
          <Route path="/scp/:id" element={<SCPPage articles={articles} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/licensing" element={<LicensingPage articles={articles} />} />
          <Route path="*" element={<section className="page narrow-page"><p className="eyebrow">RECORD NOT FOUND</p><h1>404</h1><p>The requested archive record does not exist.</p></section>} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div><span>SCP–AI // RECORDS OFFICE</span><span>RESTRICTED CIRCULATION</span></div>
        <div><NavLink to="/licensing">License &amp; attribution</NavLink><span>CC BY-SA 3.0</span></div>
      </footer>
    </div>
  );
}

export default function App() { return <Layout />; }
