import type { Article } from '../types';

export function AboutPage() {
  return <article className="page narrow-page prose-page about-page">
    <p className="eyebrow">ARCHIVE NOTE</p>
    <h1>About</h1>
    <p>This is a personal collection of anomalous fiction, presented as an independent records archive. It is unofficial and unaffiliated with the SCP Wiki.</p>
    <p>Case numbers are assigned permanently and at random from the archive's registry. They identify records; they do not describe the order in which the stories were written or published.</p>
    <p>The stories are developed through AI-assisted and generated drafting under human direction, selection, revision, and editorial control. The <strong>SCP–AI</strong> designation names this archive and does not imply that every record concerns artificial intelligence.</p>
    <p>The site is entirely static. It has no accounts, comments, analytics, advertising, or tracking.</p>
  </article>;
}

export function LicensingPage({ articles }: { articles: Article[] }) {
  return <article className="page narrow-page prose-page license-page">
    <p className="eyebrow">LICENSING RECORD</p>
    <h1>Licensing &amp; attribution</h1>
    <div className="notice"><strong>CC BY-SA 3.0</strong><p>SCP-derived material in this archive is available under the <a rel="license" href="https://creativecommons.org/licenses/by-sa/3.0/">Creative Commons Attribution-ShareAlike 3.0 Unported License</a>.</p></div>
    <p>Based on the <a href="https://scp-wiki.wikidot.com/">SCP Foundation Wiki</a> and the work of its contributors. This archive is unofficial and unaffiliated.</p>
    <p>Covered material may be shared and adapted, including commercially, with attribution and the same license. Changes must be identified.</p>
    <p>Stories use AI-assisted and generated drafting with human direction, selection, revision, and editorial control. Specific borrowed works, when present, are credited below.</p>
    {articles.length === 0 ? <p className="footnote">The archive presently contains no published SCP records.</p> : <div className="license-sources">{articles.map((article) => <section key={article.id}><h3>{article.id}: {article.title}</h3>{(article.sources?.length ?? 0) > 0 ? <ul>{article.sources!.map((source) => <li key={source.url}>Uses material from <a href={source.url}>{source.title}</a> by {source.author}</li>)}</ul> : <p className="footnote">No specific source works are listed beyond the general SCP setting attribution above.</p>}</section>)}</div>}
    <h2>Other material</h2>
    <p>Site software is MIT licensed. Third-party assets retain their own terms. Do not use the former SCP-173 image depicting Izumi Kato's <em>Untitled 2004</em>.</p>
    <p className="license-links"><a href="https://scp-wiki.wikidot.com/licensing-guide">SCP licensing guide</a> · <a href="https://scp-wiki.wikidot.com/image-use-policy">Image policy</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/">License text</a></p>
  </article>;
}
