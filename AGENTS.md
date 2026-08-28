# Agent instructions for the Personal SCP Archive

These instructions apply to the entire repository.

## Project purpose and invariants

This is a zero-cost, fully static Vite + React + TypeScript archive deployed to GitHub Pages. Preserve the existing architecture and records-office visual identity.

- React owns the archive UI, hash routing, navigation, filtering, metadata views, and shared article shell.
- SCP story bodies are trusted local HTML, not React components and not Markdown.
- Each story is self-contained under `src/content/scps/<stable-slug>/`.
- Do not add a backend, database, CMS, authentication, analytics, tracking, paid service, remote runtime API, or external deployment platform.
- Do not hardcode article imports or registrations in React. Content discovery is automatic.
- Preserve HashRouter and GitHub Pages base-path compatibility.
- Preserve lazy article loading, article-specific CSS/JavaScript support, standard/custom modes, the permanent ID registry, and the generated manifest pipeline.

## Finished article content

Treat published article prose as finished editorial content.

Do not rewrite, shorten, expand, reorganize, combine, split, or otherwise revise story prose unless the user explicitly requests that editorial change. Do not change dialogue, reveals, object classes, containment procedures, addendum order, or endings as part of formatting or UX work.

Presentation problems should be solved in shared CSS or article-specific CSS whenever possible. Do not alter article HTML merely to change spacing or typography.

The permitted exception is a name change required by the name-review workflow below. Keep that change narrowly scoped, replace every reference consistently, preserve meaning and formatting, and report it to the user.

## Archive summary standard

The `description` field is the spoiler-light catalogue summary displayed in Archive rows and browser metadata. It is editorial metadata, not a synopsis or promotional teaser.

For every new or revised summary:

1. Use one complete sentence, normally 12–30 words and no more than 160 characters.
2. Write in restrained present-tense dossier language.
3. Identify the concrete anomalous subject first, then its initial observable behavior or problem.
4. Limit the summary to information established near the opening Description. Do not reveal later addenda, escalation, hidden mechanisms, final outcomes, identities, or ending turns.
5. Preserve uncertainty when the article preserves it. Do not explain what the Foundation has not established.
6. Do not repeat the title, SCP designation, object class, date, tags, or content warnings merely to fill space.
7. Avoid rhetorical questions, quotation fragments, hype, evaluative claims, jokes, and phrases such as “a chilling tale” or “nothing is what it seems.” Let the anomaly provide the interest.
8. Prefer specific nouns and verbs over vague teaser language, but do not add facts absent from the article.
9. Read the summary beside the other Archive rows and remove repetitive sentence patterns where this can be done without weakening accuracy or tone.

These requirements need editorial review; validation alone cannot reliably detect spoilers or invented implications.

## Importing a new article

When the user supplies a new story, complete the inclusion rather than stopping at scaffolding.

1. Read the supplied source as UTF-8 and preserve its prose paragraph-for-paragraph.
2. Create a stable, human-readable folder slug that does not depend on an SCP number.
3. Create `metadata.json` with `"id": null`, plus the title, object class, summary-standard description, tags, date, status, content warnings, sources, and presentation mode.
4. Convert the story body to semantic HTML in `index.html`. The normal article shell already supplies the displayed item number, object class, title, date, and advisory.
5. Replace temporary designation references consistently:
   - full `SCP-8XXX`-style references become `{{SCP_ID}}`;
   - numeric portions in addendum/test labels become `{{SCP_NUMBER}}`.
6. Use the existing semantic patterns and global utilities for sections, transcripts, tests, logs, tables, blockquotes, findings, and redactions. Give headings stable unique IDs.
7. Add `style.css` only when the article needs presentation beyond shared styles. Add `script.js` only when genuinely required. Article JavaScript must be progressive enhancement.
8. Perform the mandatory name review described below before assigning an ID.
9. Run `npm run assign-ids`. Inspect the assigned ID and registry changes. Never choose a sequential or preferred number manually unless the user explicitly asks to override the system.
10. Verify the source-to-HTML conversion when practical. There must be no unresolved `SCP-8XXX` text or `{{SCP_*}}` tokens in built output.
11. Run all required checks and inspect the generated manifest.

Do not invent a fictional retrieval time, publication time, author, attribution, or source. Use only supplied or repository-derived information.

## Mandatory name review

`src/content/name-registry.json` is the durable archive-wide index of character and named-entity usage. It is part of the article inclusion workflow, not optional documentation.

For every new article:

1. Read the full story and list every named person and significant named entity in that article's registry entry.
2. Record the displayed `name`, the known `surname` or `null` when redacted/unknown, and a short `role`.
3. Include named artificial systems and similar story-specific named entities when their reuse could imply continuity.
4. D-class numbers and generic job titles do not require entries unless they function as a character name.
5. Compare the proposed names against all existing registry entries, including entries for deleted stories.
6. Check exact names and surnames. Also manually examine similar first names, initials, phonetic variants, and conspicuously repeated genre-style names that automated validation cannot detect.
7. Treat exact full-name, known-surname, and distinctive named-entity reuse as a likely accidental continuity signal unless the story or user establishes otherwise.
8. First-name reuse alone is permitted and does not normally require a rename or `approvedReuse` entry. Common first names may recur naturally. Use editorial judgment when the same first names appear unusually often, form a conspicuous pattern, or contribute to repetitive AI-genre naming.
9. For a likely accidental collision, prefer changing an incidental name in the new article. Do not casually rename a central name, title-bearing name, acronym, or reveal; ask the user when that judgment is materially ambiguous.
10. If reuse is intentional and would otherwise trigger validation, add a narrowly scoped `approvedReuse` entry with `type`, `value`, every involved article slug, and a clear `reason`.
11. Set `"reviewed": true` only after completing this examination.

Never delete a historical name-registry entry merely because its article was removed. Retaining it prevents accidental future reuse.

`npm run validate` must fail when a current article has no completed registry entry or when an exact name/surname collision lacks an explicit approval. Do not bypass or weaken this validation to make an import pass.

## Permanent SCP numbering

- Permanent assignments live in both article metadata and `src/content/id-registry.json`.
- Existing IDs are authoritative and immutable unless the user deliberately edits them.
- Normal development and builds must never assign, recycle, reshuffle, or renumber IDs.
- `npm run assign-ids` is the only normal assignment command.
- Deleted article IDs remain reserved in the registry.
- Public article routes are based on the assigned designation, not the folder slug.
- Use `{{SCP_ID}}` and `{{SCP_NUMBER}}` inside source HTML so in-story references always match the permanent assignment.

## Required verification

Before completing any article inclusion or content-pipeline change, run:

```bash
npm run typecheck
npm run validate
npm run test:content
npm run build
```

For article imports, additionally confirm:

- source prose and paragraph order were preserved except for explicitly authorized changes;
- the metadata description follows the archive summary standard and does not disclose later story developments;
- all name-registry entries are complete and collisions were resolved or approved;
- the assigned ID appears in the generated manifest and built article;
- no temporary designation or unresolved metadata token remains;
- the article-specific CSS/JavaScript flags in the manifest are correct;
- existing articles and IDs were not modified unintentionally.

Do not commit temporary fixtures or treat test fixtures as published records.

## Documentation and generated files

- Keep `README.md` aligned with workflow or architectural changes.
- `src/generated/content-manifest.json` is generated and clearly marked as such, but it is tracked in this repository; include its relevant regeneration changes.
- `public/generated/scps/` and `dist/` are build outputs, not numbering authorities.
- Licensing and attribution text must remain accurate. Do not invent legal claims, authors, or source credits.

## Git and deployment

Preserve unrelated user changes in a dirty worktree. Commit only files belonging to the task.

For requested changes to this publicly deployed archive, run the required checks, commit the focused change, and push `main` unless the user says not to push. Confirm the GitHub Pages workflow succeeds. GitHub Actions validates and deploys; it must never assign permanent IDs.

In the final response, report the assigned designation (for new articles), any renamed or intentionally reused names, validation results, commit ID, and deployment result.
