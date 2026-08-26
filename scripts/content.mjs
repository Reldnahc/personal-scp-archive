import { access, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomInt } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const command = args[0];
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? path.resolve(args[index + 1]) : fallback;
};
const contentRoot = option('--content-root', path.join(ROOT, 'src/content/scps'));
const registryPath = option('--registry', path.join(ROOT, 'src/content/id-registry.json'));
const nameRegistryPath = option('--name-registry', path.join(ROOT, 'src/content/name-registry.json'));
const manifestPath = option('--manifest', path.join(ROOT, 'src/generated/content-manifest.json'));
const publicRoot = option('--public-root', path.join(ROOT, 'public/generated/scps'));
const ID_PATTERN = /^SCP-AI-(\d{4})$/;
const STATUSES = new Set(['draft', 'published', 'archived']);
const MODES = new Set(['standard', 'custom']);

class ContentError extends Error {}
const exists = async (file) => access(file, constants.F_OK).then(() => true, () => false);
const applyMetadataTokens = (value, metadata) => {
  if (!metadata.id) return value;
  const number = metadata.id.replace('SCP-AI-', '');
  return value
    .replaceAll('{{SCP_ID}}', metadata.id)
    .replaceAll('{{SCP_NUMBER}}', number)
    .replaceAll('{{SCP_TITLE}}', metadata.title)
    .replaceAll('{{OBJECT_CLASS}}', metadata.objectClass);
};
const readJson = async (file, label) => {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { throw new ContentError(`${label}: invalid JSON (${error.message})`); }
};

async function loadRegistry() {
  if (!(await exists(registryPath))) throw new ContentError(`ID registry is missing: ${registryPath}`);
  const registry = await readJson(registryPath, 'ID registry');
  if (registry.version !== 1 || !registry.assignments || Array.isArray(registry.assignments)) {
    throw new ContentError('ID registry must contain { "version": 1, "assignments": {} }.');
  }
  return registry;
}

async function loadNameRegistry() {
  if (!(await exists(nameRegistryPath))) throw new ContentError(`Name registry is missing: ${nameRegistryPath}`);
  return readJson(nameRegistryPath, 'Name registry');
}

const normalizeName = (value) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');

function validateNameRegistry(registry, articles, errors) {
  if (!registry || typeof registry !== 'object' || Array.isArray(registry) || registry.version !== 1) {
    errors.push('Name registry must contain { "version": 1, "articles": {}, "approvedReuse": [] }.');
    return;
  }
  if (!registry.articles || typeof registry.articles !== 'object' || Array.isArray(registry.articles)) {
    errors.push('Name registry articles must be an object keyed by story slug.');
    return;
  }
  if (!Array.isArray(registry.approvedReuse)) {
    errors.push('Name registry approvedReuse must be an array.');
    return;
  }

  const uses = { name: new Map(), surname: new Map() };
  for (const article of articles) {
    if (!registry.articles[article.folderName]) {
      errors.push(`${article.folderName}: missing name review in src/content/name-registry.json`);
    }
  }

  for (const [slug, review] of Object.entries(registry.articles)) {
    if (!review || typeof review !== 'object' || Array.isArray(review)) {
      errors.push(`Name registry ${slug}: review must be an object`);
      continue;
    }
    if (review.reviewed !== true) errors.push(`Name registry ${slug}: reviewed must be true after checking the article`);
    if (!Array.isArray(review.names)) {
      errors.push(`Name registry ${slug}: names must be an array`);
      continue;
    }
    const localNames = new Set();
    for (const [index, entry] of review.names.entries()) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(`Name registry ${slug}: names[${index}] must be an object`);
        continue;
      }
      if (typeof entry.name !== 'string' || !entry.name.trim()) {
        errors.push(`Name registry ${slug}: names[${index}].name must be a non-empty string`);
        continue;
      }
      if (typeof entry.role !== 'string' || !entry.role.trim()) errors.push(`Name registry ${slug}: names[${index}].role must be a non-empty string`);
      if (entry.surname !== null && (typeof entry.surname !== 'string' || !entry.surname.trim())) {
        errors.push(`Name registry ${slug}: names[${index}].surname must be a non-empty string or null`);
      }
      const fullName = normalizeName(entry.name);
      if (localNames.has(fullName)) errors.push(`Name registry ${slug}: duplicate name entry ${entry.name}`);
      localNames.add(fullName);
      if (!uses.name.has(fullName)) uses.name.set(fullName, { value: entry.name, slugs: new Set() });
      uses.name.get(fullName).slugs.add(slug);
      if (typeof entry.surname === 'string' && entry.surname.trim()) {
        const surname = normalizeName(entry.surname);
        if (!uses.surname.has(surname)) uses.surname.set(surname, { value: entry.surname, slugs: new Set() });
        uses.surname.get(surname).slugs.add(slug);
      }
    }
  }

  const approvals = new Map();
  for (const [index, approval] of registry.approvedReuse.entries()) {
    if (!approval || typeof approval !== 'object' || Array.isArray(approval)) {
      errors.push(`Name registry approvedReuse[${index}] must be an object`);
      continue;
    }
    if (!['name', 'surname'].includes(approval.type)) errors.push(`Name registry approvedReuse[${index}].type must be name or surname`);
    if (typeof approval.value !== 'string' || !approval.value.trim()) errors.push(`Name registry approvedReuse[${index}].value must be a non-empty string`);
    if (!Array.isArray(approval.articles) || approval.articles.length < 2 || !approval.articles.every((slug) => typeof slug === 'string' && slug.trim())) {
      errors.push(`Name registry approvedReuse[${index}].articles must contain at least two story slugs`);
    }
    if (typeof approval.reason !== 'string' || !approval.reason.trim()) errors.push(`Name registry approvedReuse[${index}].reason must be a non-empty string`);
    if (['name', 'surname'].includes(approval.type) && typeof approval.value === 'string') {
      const key = `${approval.type}:${normalizeName(approval.value)}`;
      if (approvals.has(key)) errors.push(`Name registry contains duplicate approval for ${approval.type} ${approval.value}`);
      approvals.set(key, new Set(Array.isArray(approval.articles) ? approval.articles : []));
    }
  }

  for (const type of ['name', 'surname']) {
    for (const [normalized, use] of uses[type]) {
      if (use.slugs.size < 2) continue;
      const approval = approvals.get(`${type}:${normalized}`);
      const missing = [...use.slugs].filter((slug) => !approval?.has(slug));
      if (!approval || missing.length) {
        errors.push(`Name registry: ${type} "${use.value}" is reused across ${[...use.slugs].sort().join(', ')}; rename it or document the intentional reuse in approvedReuse`);
      }
    }
  }
}

async function discover() {
  await mkdir(contentRoot, { recursive: true });
  const entries = await readdir(contentRoot, { withFileTypes: true });
  const articles = [];
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const folder = path.join(contentRoot, entry.name);
    const metadataPath = path.join(folder, 'metadata.json');
    if (!(await exists(metadataPath))) throw new ContentError(`${entry.name}: missing metadata.json`);
    const metadata = await readJson(metadataPath, entry.name);
    articles.push({ folderName: entry.name, folder, metadataPath, metadata });
  }
  return articles;
}

function validateMetadata(article, errors) {
  const { metadata: m, folderName } = article;
  const requiredStrings = ['slug', 'title', 'objectClass', 'description', 'dateAdded', 'status'];
  if (!m || typeof m !== 'object' || Array.isArray(m)) return errors.push(`${folderName}: metadata must be a JSON object`);
  for (const field of requiredStrings) if (typeof m[field] !== 'string' || !m[field].trim()) errors.push(`${folderName}: ${field} must be a non-empty string`);
  if (m.slug !== folderName) errors.push(`${folderName}: metadata slug must exactly match the story folder name`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.slug || '')) errors.push(`${folderName}: slug must use lowercase words separated by hyphens`);
  if (!STATUSES.has(m.status)) errors.push(`${folderName}: status must be draft, published, or archived`);
  if (m.mode !== undefined && !MODES.has(m.mode)) errors.push(`${folderName}: mode must be standard or custom`);
  for (const field of ['tags', 'contentWarnings']) if (!Array.isArray(m[field]) || !m[field].every((v) => typeof v === 'string')) errors.push(`${folderName}: ${field} must be an array of strings`);
  if (m.sources !== undefined) {
    if (!Array.isArray(m.sources)) errors.push(`${folderName}: sources must be an array when present`);
    else for (const [index, source] of m.sources.entries()) {
      if (!source || typeof source !== 'object' || Array.isArray(source)) errors.push(`${folderName}: sources[${index}] must be an object`);
      else {
        for (const field of ['title', 'author', 'url']) if (typeof source[field] !== 'string' || !source[field].trim()) errors.push(`${folderName}: sources[${index}].${field} must be a non-empty string`);
        if (typeof source.url === 'string') {
          try { const url = new URL(source.url); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); }
          catch { errors.push(`${folderName}: sources[${index}].url must be an absolute HTTP(S) URL`); }
        }
      }
    }
  }
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(m.dateAdded || '');
  const parsedDate = dateMatch ? new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]))) : null;
  if (!dateMatch || !parsedDate || parsedDate.toISOString().slice(0, 10) !== m.dateAdded) errors.push(`${folderName}: dateAdded must be a valid YYYY-MM-DD date`);
  if (m.displayOrder !== undefined && typeof m.displayOrder !== 'number') errors.push(`${folderName}: displayOrder must be a number when present`);
  if (m.id !== undefined && m.id !== null && !ID_PATTERN.test(m.id)) errors.push(`${folderName}: id must match SCP-AI-#### or be null`);
  if (m.id) {
    const n = Number(m.id.match(ID_PATTERN)?.[1]);
    if (n < 1 || n > 9999) errors.push(`${folderName}: ID number must be between 0001 and 9999`);
  }
  if (m.status === 'published' && !m.id) errors.push(`${folderName}: published article has no ID; run npm run assign-ids`);
}

async function validate({ allowUnassignedPublished = false, allowRegistryMissing = false } = {}) {
  const [articles, registry, nameRegistry] = await Promise.all([discover(), loadRegistry(), loadNameRegistry()]);
  const errors = [];
  const ids = new Map();
  const slugs = new Set();
  for (const article of articles) {
    validateMetadata(article, errors);
    if (allowUnassignedPublished) {
      const i = errors.findIndex((e) => e.startsWith(`${article.folderName}: published article has no ID`));
      if (i >= 0) errors.splice(i, 1);
    }
    if (!(await exists(path.join(article.folder, 'index.html')))) errors.push(`${article.folderName}: missing required index.html`);
    const { id, slug } = article.metadata;
    if (slugs.has(slug)) errors.push(`${article.folderName}: duplicate slug ${slug}`);
    slugs.add(slug);
    if (id) {
      if (ids.has(id)) errors.push(`${article.folderName}: duplicate ID ${id} (also used by ${ids.get(id)})`);
      ids.set(id, article.folderName);
      if (registry.assignments[id] === undefined && !allowRegistryMissing) errors.push(`${article.folderName}: registry must map ${id} to ${slug}`);
      if (registry.assignments[id] !== undefined && registry.assignments[id] !== slug) errors.push(`${article.folderName}: registry reserves ${id} for ${registry.assignments[id]}, not ${slug}`);
    }
  }
  for (const [id, slug] of Object.entries(registry.assignments)) {
    if (!ID_PATTERN.test(id) || Number(id.slice(-4)) < 1) errors.push(`Registry contains invalid ID: ${id}`);
    if (typeof slug !== 'string' || !slug) errors.push(`Registry entry ${id} must have a slug value`);
  }
  validateNameRegistry(nameRegistry, articles, errors);
  if (errors.length) throw new ContentError(`Content validation failed:\n- ${errors.join('\n- ')}`);
  return { articles, registry };
}

async function assignIds() {
  const { articles, registry } = await validate({ allowUnassignedPublished: true, allowRegistryMissing: true });
  for (const article of articles.filter(({ metadata }) => metadata.id)) {
    if (registry.assignments[article.metadata.id] === undefined) {
      registry.assignments[article.metadata.id] = article.metadata.slug;
      console.log(`Registered existing ${article.metadata.id} for ${article.metadata.slug}`);
    }
  }
  const used = new Set(Object.keys(registry.assignments).map((id) => Number(id.slice(-4))));
  const unassigned = articles.filter(({ metadata }) => !metadata.id);
  if (unassigned.length > 9999 - used.size) throw new ContentError('SCP-AI number space is exhausted; no unused IDs remain.');
  for (const article of unassigned) {
    let number;
    do { number = randomInt(1, 10000); } while (used.has(number));
    used.add(number);
    const id = `SCP-AI-${String(number).padStart(4, '0')}`;
    article.metadata.id = id;
    registry.assignments[id] = article.metadata.slug;
    await writeFile(article.metadataPath, `${JSON.stringify(article.metadata, null, 2)}\n`);
    console.log(`Assigned ${id} to ${article.metadata.slug}`);
  }
  await writeFile(registryPath, `${JSON.stringify({ version: 1, assignments: Object.fromEntries(Object.entries(registry.assignments).sort()) }, null, 2)}\n`);
  await validate();
  console.log(unassigned.length ? `Assigned ${unassigned.length} permanent ID(s).` : 'No unassigned articles found; nothing changed.');
}

async function generate() {
  const { articles } = await validate();
  await rm(publicRoot, { recursive: true, force: true });
  await mkdir(publicRoot, { recursive: true });
  const published = articles.filter(({ metadata }) => metadata.status === 'published');
  const manifest = [];
  for (const article of published) {
    const target = path.join(publicRoot, article.metadata.slug);
    await cp(article.folder, target, { recursive: true });
    const sourceHtml = await readFile(path.join(article.folder, 'index.html'), 'utf8');
    await writeFile(path.join(target, 'index.html'), applyMetadataTokens(sourceHtml, article.metadata));
    manifest.push({
      ...article.metadata,
      mode: article.metadata.mode || 'standard',
      hasStyle: await exists(path.join(article.folder, 'style.css')),
      hasScript: await exists(path.join(article.folder, 'script.js')),
      contentPath: `generated/scps/${article.metadata.slug}/index.html`,
      assetBase: `generated/scps/${article.metadata.slug}/`,
    });
  }
  manifest.sort((a, b) => (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER) || b.dateAdded.localeCompare(a.dateAdded) || a.title.localeCompare(b.title));
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify({ generated: true, articles: manifest }, null, 2)}\n`);
  console.log(`Generated manifest with ${manifest.length} published article(s).`);
}

try {
  if (command === 'assign') await assignIds();
  else if (command === 'validate') { const { articles } = await validate(); console.log(`Content valid: ${articles.length} article folder(s).`); }
  else if (command === 'generate') await generate();
  else throw new ContentError('Usage: node scripts/content.mjs <assign|validate|generate>');
} catch (error) {
  console.error(error instanceof ContentError ? error.message : error);
  process.exitCode = 1;
}
