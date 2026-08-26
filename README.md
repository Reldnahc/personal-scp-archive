# SCP–AI personal fiction archive

A zero-cost, fully static archive for personal anomalous fiction. React manages navigation, metadata, search, and the shared archive interface; story bodies remain unrestricted HTML files with optional per-article CSS, JavaScript, and assets.

Published records are discovered automatically from `src/content/scps/`. The files under `docs/article-template/` are authoring examples only and are never published as records.

## Stack and operating model

- Vite, React, and TypeScript
- React Router with hash-based URLs for reliable GitHub Pages refreshes
- Plain CSS with locally bundled open-source fonts; no remote font service, API, analytics, tracking, backend, database, CMS, or authentication
- Small Node scripts using only built-in modules for discovery, validation, and permanent random IDs
- GitHub Actions and GitHub Pages for free static deployment

The public URL for an assigned record is `#/scp/scp-ai-####`. Its source folder uses a stable descriptive slug, so renaming a title does not change the record URL. Avoid changing the slug after publication because it is also recorded in the permanent registry and used for copied assets.

## Repository structure

```text
.
├─ .github/workflows/deploy-pages.yml  GitHub Pages build and deploy
├─ docs/article-template/              Copyable, non-production starter
├─ scripts/
│  ├─ content.mjs                      Discover, validate, assign, generate
│  └─ test-content-pipeline.mjs        Isolated temporary-fixture checks
├─ src/
│  ├─ content/
│  │  ├─ id-registry.json              Permanent, tracked ID history
│  │  ├─ name-registry.json            Reviewed names and reuse decisions
│  │  └─ scps/                         One self-contained folder per story
│  ├─ generated/content-manifest.json  Generated; consumed by React
│  ├─ pages/                            Home, archive, article, static pages
│  ├─ App.tsx
│  └─ styles.css                        Site design and SCP utilities
├─ public/generated/scps/              Generated content copies (ignored by build cleanup)
├─ vite.config.ts
└─ package.json
```

## Install and run

Requires Node.js 20 or newer (the deployment workflow uses Node 22).

```bash
npm install
npm run dev
```

Other commands:

```bash
npm run validate       # metadata, files, IDs, and registry consistency
npm run typecheck      # strict TypeScript check
npm run assign-ids     # permanently assign all currently unnumbered stories
npm run build          # validate, generate manifest/content, build dist/
npm run preview        # serve the production build locally
npm run test:content   # run isolated content-pipeline fixture checks
```

Both `dev` and `build` regenerate the manifest automatically. A normal build **never assigns IDs or modifies metadata/the registry**. `assign-ids` is the only normal command that makes permanent numbering changes.

## Add the first SCP

Copy the template or create the two required files yourself. The folder name is a durable human-readable slug, never an SCP number.

```bash
mkdir src/content/scps/my-new-story
cp docs/article-template/metadata.json src/content/scps/my-new-story/metadata.json
cp docs/article-template/index.html src/content/scps/my-new-story/index.html
```

On PowerShell, the equivalent is:

```powershell
New-Item -ItemType Directory src/content/scps/my-new-story
Copy-Item docs/article-template/metadata.json src/content/scps/my-new-story/metadata.json
Copy-Item docs/article-template/index.html src/content/scps/my-new-story/index.html
```

Then:

1. Change `slug` to `my-new-story`, fill in the other metadata, and write `index.html`.
2. Leave `id` as `null`. A draft can stay unnumbered; change `status` to `published` when ready.
3. Review every named person or named entity against `src/content/name-registry.json`. Add the story slug with `"reviewed": true` and list its names, surnames (or `null` when unknown/redacted), and roles. Rename accidental collisions or document an intentional one in `approvedReuse` with a reason.
4. Optionally add `style.css`, `script.js`, and an `assets/` directory.
5. Assign and inspect a permanent number:

   ```bash
   npm run assign-ids
   npm run validate
   npm run dev
   ```

6. Commit the story folder, `src/content/id-registry.json`, `src/content/name-registry.json`, and the regenerated manifest, then push.

No React import or central article list needs editing. Discovery scans every direct child folder of `src/content/scps/`.

## Metadata schema

Each `metadata.json` is a small JSON object:

| Field | Type | Meaning |
|---|---|---|
| `id` | string or `null` | Permanent `SCP-AI-0001` through `SCP-AI-9999` designation |
| `slug` | string | Lowercase hyphenated value exactly matching the folder name |
| `title` | string | Human-readable archive title |
| `objectClass` | string | Displayed classification; deliberately not restricted to a fixed list |
| `description` | string | Short archive/search summary |
| `tags` | string[] | Lightweight search and browsing terms |
| `dateAdded` | `YYYY-MM-DD` | Used for default newest-first ordering |
| `status` | string | `draft`, `published`, or `archived` |
| `contentWarnings` | string[] | Optional notices shown above standard articles |
| `sources` | object[] | Optional `{ title, author, url }` credits for identifiable source works |
| `mode` | string | Optional `standard` (default) or `custom` |
| `displayOrder` | number | Optional explicit primary sort value; lower values come first |

All listed fields except `displayOrder`, `sources`, and `mode` are required. `id` may be `null`. Drafts can be unnumbered, but published records cannot; validation tells you to run `npm run assign-ids`. Archived entries remain valid and reserved but are not included in the public manifest.

Malformed JSON, bad dates or statuses, a slug/folder mismatch, missing `index.html`, invalid/out-of-range IDs, duplicate IDs, and registry conflicts fail loudly. Broken story folders are never silently skipped.

## Character and entity name registry

`src/content/name-registry.json` is the durable index of names already used by the archive. It includes people, named artificial systems, and other story-specific named entities worth protecting from accidental reuse. Redacted or unknown surnames use `null`; identifiers such as D-class numbers do not need entries.

Every article folder, including drafts, must have a matching review entry. `npm run validate` fails when one is missing. It also compares normalized exact names and known surnames across all registry entries, including entries for stories later deleted. A collision must be resolved in one of two ways:

1. change the incidental name in the new article and record the replacement; or
2. if the reuse is deliberate, add an `approvedReuse` entry containing `type`, `value`, every involved article slug, and a plain-language `reason`.

The validator cannot reliably infer every fictional name from unrestricted HTML, so adding all relevant names remains an explicit editorial review step. The enforced per-story entry ensures that step cannot be skipped silently. Do not delete old story entries merely because an article is removed; keeping them prevents accidental future reuse.

A normal review entry looks like this:

```json
"my-new-story": {
  "reviewed": true,
  "names": [
    { "name": "Dr. Avery Example", "surname": "Example", "role": "Foundation researcher" },
    { "name": "Morgan [REDACTED]", "surname": null, "role": "civilian witness" }
  ]
}
```

When reuse is intentional, document the decision instead of weakening the rule globally:

```json
{
  "type": "surname",
  "value": "Example",
  "articles": ["earlier-story", "my-new-story"],
  "reason": "The characters are members of the same family."
}
```

## Discovery and generated files

`scripts/content.mjs` scans `src/content/scps/*/metadata.json`, validates every article folder, selects published entries, copies each self-contained folder to `public/generated/scps/<slug>/`, and writes `src/generated/content-manifest.json`. React imports that manifest; story bodies are fetched only on their article page.

The manifest and copied public content are build artifacts and carry no numbering authority. The generated manifest is clearly marked with `"generated": true`. It is safe to regenerate. Only source metadata and `id-registry.json` establish identity.

Default archive order is `displayOrder` (when used), then date added descending, then title. Random IDs therefore do not masquerade as publication order. Search runs locally in the browser across number, title, description, and tags; object-class filtering is also local and dependency-free.

## Permanent random numbering

`npm run assign-ids`:

1. validates all article folders and existing IDs;
2. reads every historically used number from `src/content/id-registry.json`;
3. registers valid manually supplied metadata IDs that are not yet in the registry;
4. uses cryptographically strong local randomness to choose an unused number from 0001–9999 for each unnumbered article;
5. writes the ID to that article's metadata and records `ID → slug` in the registry;
6. validates again.

Existing IDs are never changed. Duplicate or conflicting IDs fail. There is no low-number reservation and no sequential fallback. If all 9,999 values are reserved, assignment fails clearly.

The registry is intentionally independent of current article folders. If you delete a story, its entry stays in the registry and that number will not be recycled. To free one, you must deliberately remove its registry entry yourself; do so only when you truly intend to erase that historical reservation. Because assignments are local tracked changes, they are visible in Git history and reviewable before push.

## Article presentation modes

### Standard mode

Use `"mode": "standard"` or omit `mode`. `index.html` should be an HTML fragment, not a React component or Markdown document. It appears below the archive-supplied ID/title/object-class header and inherits the readable document typography plus global SCP utilities.

If present, `style.css` is loaded automatically while that record is open. If present, `script.js` is loaded after the article body is mounted and removed on navigation. Relative `src` and `href` values in article HTML are rewritten against that story's generated folder, so this works:

```html
<figure>
  <img src="assets/containment-diagram.png" alt="Containment chamber plan">
  <figcaption>Diagram 1 — revised chamber plan.</figcaption>
</figure>
```

When a story refers to its own designation, use metadata placeholders in `index.html`. Generation replaces them in the published copy without modifying the source article:

```html
<p>{{SCP_ID}} was recovered near Survey Marker {{SCP_NUMBER}}-A.</p>
```

Available placeholders are `{{SCP_ID}}`, `{{SCP_NUMBER}}`, `{{SCP_TITLE}}`, and `{{OBJECT_CLASS}}`.

### Custom mode

Set `"mode": "custom"`. The archive leaves only a narrow return bar and gives the rest of the viewport to a sandboxed article iframe. `index.html` may be a fragment or a complete HTML document. The generator/runtime automatically supplies the correct base URL and automatically loads optional sibling `style.css` and `script.js`.

Custom documents can replace typography, width, structure, and layout without leaking CSS into the archive shell. Scripts have same-origin access because all content is trusted repository content, but the iframe remains sandboxed from top-level navigation and other browser capabilities. Build the core content as readable HTML so it still works if optional JavaScript fails.

Article content is rendered as **trusted local HTML**. React's HTML injection is intentional. Never populate story HTML from comments, form input, remote feeds, or other untrusted sources without revisiting the security model.

## Shared SCP utility classes

Global styles in `src/styles.css` provide:

- `.redacted` — selectable-resistant visual blackout that wraps on small screens
- `.expunged` — displays a standard data-expunged marker
- `.classified` — double-border classified block
- `.warning` and `.notice` — warning/notice panels
- `.interview` — transcript-style left rule
- `.log` — monospaced record block
- `.footnote` — subdued small annotation
- `.document-meta` — compact metadata definition list

Use semantic HTML inside these containers. Avoid relying on color alone for meaning and give every meaningful image useful `alt` text.

## Drafts, archived records, and deletion

- `draft`: fully validated, may have `id: null`, not published.
- `published`: must have a permanent ID and appears in the archive.
- `archived`: not publicly listed, but its metadata and any assigned registry number remain validated.
- deleted folder: disappears from generated content, while its registry entry permanently reserves the old number.

## GitHub Pages deployment

`.github/workflows/deploy-pages.yml` runs on every push to `main` and on manual dispatch. It installs locked dependencies, validates, builds, uploads `dist/`, and deploys it using only official GitHub Pages Actions. The workflow computes Vite's base as `/` for a `username.github.io` repository or `/repository-name/` for a project site. Asset paths and fetched story paths use that base.

HashRouter makes routes look like `https://username.github.io/repository/#/scp/scp-ai-4187`. Everything before `#` resolves to the real static `index.html`, so direct visits and refreshes work without server rewrite rules.

After pushing the repository, manually open **GitHub repository → Settings → Pages → Build and deployment** and select **GitHub Actions** as the source. Ensure the default branch is named `main`, or update the workflow trigger if it is not. Public repositories receive Pages and standard Actions usage at no charge under GitHub's current plan; this project calls no billable external service.

## Licensing and attribution

SCP-derived fiction and other SCP-related creative content in this archive are marked as [Creative Commons Attribution-ShareAlike 3.0 Unported](https://creativecommons.org/licenses/by-sa/3.0/) in `LICENSE-CONTENT.md` and on the visible licensing page. This permits reuse and commercial use, but requires attribution and ShareAlike licensing of adaptations. The archive credits the [SCP Foundation Wiki](https://scp-wiki.wikidot.com/) and its authors and states that it is independent and unofficial.

The archive identifies its stories as AI-generated and does not treat an AI system as a legal author. General use of the SCP setting is covered by the site-wide SCP Wiki attribution. If a story uses or adapts a specific SCP article, character, image, or other identifiable work, add a `sources` entry for each source:

```json
"sources": [
  {
    "title": "Title of source work",
    "author": "Author name or pseudonym",
    "url": "https://scp-wiki.wikidot.com/source-page"
  }
]
```

These credits render on the record and the site licensing page. Verify every third-party asset's license separately; an image appearing on the SCP Wiki does not by itself establish permission. In particular, do not use the former SCP-173 image depicting Izumi Kato's *Untitled 2004*.

The application source code is separately MIT-licensed in `LICENSE-CODE`, following Creative Commons' recommendation to use a software-specific license for code. This separation does not remove CC BY-SA obligations from SCP-derived creative material.

The Sigma-10 type stack—Inter, Sans Normalcy, and RedactRect—is bundled locally under the SIL Open Font License 1.1. See `THIRD_PARTY_NOTICES.md` for attribution.

## Troubleshooting

- **Published article has no ID:** run `npm run assign-ids`, inspect both changed JSON files, and commit them.
- **Registry must map an ID:** run `npm run assign-ids` to register a valid manually supplied metadata ID. A conflicting historical owner must be resolved deliberately.
- **Missing name review:** add the article slug and its reviewed names to `src/content/name-registry.json`.
- **Name or surname is reused:** rename the incidental character, or add a narrowly scoped `approvedReuse` entry with the reason the continuity is intentional.
- **Slug mismatch:** make the `slug` value exactly equal to its parent folder name.
- **Article missing from the archive:** it must be `published`, numbered, valid, and followed by a dev-server restart if the folder was created while Vite was already running.
- **Asset is missing:** use a relative path such as `assets/image.png`, check exact filename casing (Linux deployment is case-sensitive), and keep it inside the story folder.
- **Custom CSS/JS is not loading:** name the optional sibling files exactly `style.css` and `script.js`; no manual `<link>` or `<script>` is required.
- **Pages site has broken assets:** deploy through the included workflow so `BASE_PATH` is set to the repository name.
- **Validation disagrees with generated data:** run `npm run build`; generation always follows validation and overwrites stale generated output.

## Quality checks

`npm run test:content` creates temporary fixtures outside production content and verifies empty archives, unnumbered drafts, published-ID enforcement, random assignment, uniqueness, immutability, historical reservation after deletion, custom CSS discovery, and malformed JSON errors. The temporary fixture tree is deleted afterward and never ships as a real record.
