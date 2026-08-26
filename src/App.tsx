import { useEffect, useLayoutEffect, useRef } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import manifest from './generated/content-manifest.json';
import type { Article } from './types';
import { ArchivePage } from './pages/ArchivePage';
import { HomePage } from './pages/HomePage';
import { AboutPage, LicensingPage, NotFoundPage } from './pages/StaticPages';
import { SCPPage } from './pages/SCPPage';

const articles = manifest.articles as Article[];
const defaultDescription = 'A personal archive of anomalous fiction.';
const scrollPositions = new Map<string, { left: number; top: number }>();

function RouteEffects() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPathname = useRef<string | undefined>(undefined);
  const { pathname } = location;

  useEffect(() => {
    const article = pathname.startsWith('/scp/')
      ? articles.find((item) => pathname.toLowerCase() === `/scp/${item.id.toLowerCase()}`)
      : undefined;
    const routeMetadata: Record<string, { title: string; description: string }> = {
      '/': { title: 'SCP–AI // Case Archive', description: defaultDescription },
      '/archive': { title: 'Case Files // SCP–AI', description: 'Browse the SCP–AI anomalous fiction case files.' },
      '/about': { title: 'About // SCP–AI', description: 'About the personal SCP–AI fiction archive.' },
      '/licensing': { title: 'Licensing // SCP–AI', description: 'Licensing and attribution for the SCP–AI archive.' },
    };
    const metadata = article
      ? { title: `${article.id} — ${article.title} // SCP–AI`, description: article.description }
      : routeMetadata[pathname] ?? { title: 'Record Not Found // SCP–AI', description: defaultDescription };

    document.title = metadata.title;
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = metadata.description;
  }, [pathname]);

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  useLayoutEffect(() => () => {
    scrollPositions.set(location.key, { left: window.scrollX, top: window.scrollY });
  }, [location.key]);

  useLayoutEffect(() => {
    const routeChanged = previousPathname.current !== pathname;
    const savedPosition = pathname === '/archive' && navigationType === 'POP'
      ? scrollPositions.get(location.key)
      : undefined;
    let frame: number | undefined;

    if (savedPosition) {
      frame = window.requestAnimationFrame(() => window.scrollTo(savedPosition));
    } else if (routeChanged) {
      window.scrollTo({ top: 0, left: 0 });
    }

    previousPathname.current = pathname;
    return () => { if (frame !== undefined) window.cancelAnimationFrame(frame); };
  }, [location.key, navigationType, pathname]);

  return null;
}

function Layout() {
  return (
    <div className="site-frame">
      <RouteEffects />
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
          <Route path="*" element={<NotFoundPage />} />
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
