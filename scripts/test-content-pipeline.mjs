import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = await mkdtemp(path.join(tmpdir(), 'scp-ai-pipeline-'));
const content = path.join(workspace, 'scps');
const registry = path.join(workspace, 'id-registry.json');
const manifest = path.join(workspace, 'manifest.json');
const publicRoot = path.join(workspace, 'public');
await mkdir(content, { recursive: true });
await writeFile(registry, '{"version":1,"assignments":{}}\n');

const run = (command) => spawnSync(process.execPath, [path.join(root, 'scripts/content.mjs'), command, '--content-root', content, '--registry', registry, '--manifest', manifest, '--public-root', publicRoot], { encoding: 'utf8' });
const metadata = (slug, status = 'draft', extra = {}) => ({ id: null, slug, title: `Title ${slug}`, objectClass: 'Euclid', description: 'Test record.', tags: ['test'], dateAdded: '2026-08-25', status, contentWarnings: [], ...extra });
async function story(slug, status = 'draft', extra = {}) {
  const folder = path.join(content, slug); await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, 'metadata.json'), `${JSON.stringify(metadata(slug, status, extra), null, 2)}\n`);
  await writeFile(path.join(folder, 'index.html'), '<section><h2>{{SCP_ID}}</h2><p>Marker {{SCP_NUMBER}}-A</p><img src="assets/a.png"></section>');
  return folder;
}

try {
  assert.equal(run('validate').status, 0, 'empty archive validates');
  await story('quiet-draft');
  assert.equal(run('validate').status, 0, 'unnumbered draft validates');
  const first = await story('first-record', 'published');
  const unnumbered = run('validate');
  assert.notEqual(unnumbered.status, 0, 'published unnumbered article fails');
  assert.match(unnumbered.stderr, /run npm run assign-ids/);
  const second = await story('second-record', 'published');
  assert.equal(run('assign').status, 0, 'assignment succeeds');
  const firstMeta = JSON.parse(await readFile(path.join(first, 'metadata.json'), 'utf8'));
  const secondMeta = JSON.parse(await readFile(path.join(second, 'metadata.json'), 'utf8'));
  assert.match(firstMeta.id, /^SCP-AI-\d{4}$/);
  assert.notEqual(firstMeta.id, secondMeta.id, 'assigned IDs are unique');
  assert.equal(run('assign').status, 0, 'repeat assignment succeeds');
  assert.equal(JSON.parse(await readFile(path.join(first, 'metadata.json'), 'utf8')).id, firstMeta.id, 'existing ID is immutable');
  await rm(first, { recursive: true });
  assert.equal(run('validate').status, 0, 'deleted article leaves valid reserved ID');
  const afterDelete = JSON.parse(await readFile(registry, 'utf8'));
  assert.equal(afterDelete.assignments[firstMeta.id], 'first-record', 'deleted ID remains reserved');
  await writeFile(path.join(second, 'style.css'), 'body { color: maroon; }');
  const currentSecond = JSON.parse(await readFile(path.join(second, 'metadata.json'), 'utf8'));
  currentSecond.mode = 'custom';
  await writeFile(path.join(second, 'metadata.json'), `${JSON.stringify(currentSecond, null, 2)}\n`);
  assert.equal(run('generate').status, 0, 'custom article generates');
  const generated = JSON.parse(await readFile(manifest, 'utf8'));
  assert.equal(generated.articles[0].hasStyle, true, 'custom CSS is discovered');
  const generatedHtml = await readFile(path.join(publicRoot, 'second-record', 'index.html'), 'utf8');
  assert.match(generatedHtml, new RegExp(secondMeta.id), 'full ID placeholder is replaced');
  assert.match(generatedHtml, new RegExp(`Marker ${secondMeta.id.slice(-4)}-A`), 'number placeholder is replaced');
  assert.doesNotMatch(generatedHtml, /\{\{SCP_/u, 'generated HTML contains no unresolved SCP placeholders');
  const duplicate = await story('duplicate-record', 'published', { id: secondMeta.id });
  const collision = run('validate');
  assert.notEqual(collision.status, 0, 'duplicate ID fails');
  assert.match(collision.stderr, /duplicate ID/);
  await rm(duplicate, { recursive: true });
  const malformed = path.join(content, 'malformed'); await mkdir(malformed);
  await writeFile(path.join(malformed, 'metadata.json'), '{ not json'); await writeFile(path.join(malformed, 'index.html'), '<p>x</p>');
  const badJson = run('validate');
  assert.notEqual(badJson.status, 0, 'malformed metadata fails');
  assert.match(badJson.stderr, /invalid JSON/);
  console.log('Content pipeline checks passed: empty, draft, assignment, uniqueness, immutability, reservation, custom CSS, and malformed metadata.');
} finally {
  await rm(workspace, { recursive: true, force: true });
}
