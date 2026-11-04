// @inline shared/skill-runtime.js
// @inline shared/text.js
// @inline shared/format.js
// @inline shared/time.js
// @inline shared/fetch.js

// Provider (research/api-candidates.md, "GitHub status"): GitHub REST API, unauthenticated,
// public repositories only, 60 requests per hour per IP. No token, no custom headers (a plain
// GET). Every returned string is untrusted: stripped, capped and quoted.
const API = 'https://api.github.com';
const TIMEOUT_MS = 10000;
const LOW_RATE = 10;
const SHOWS = ['all', 'summary', 'release', 'commits', 'issues'];
const SHOW_ALIASES = { releases: 'release', overview: 'summary', info: 'summary', issue: 'issues', commit: 'commits', everything: 'all' };

function parseRepo(raw) {
  let t = cleanText(raw, 300).replace(/[?#].*$/, '').trim();
  t = t.replace(/^https?:\/\/(?:www\.)?github\.com\//i, '').replace(/^(?:www\.)?github\.com\//i, '');
  const parts = t.replace(/\/+$/, '').split('/');
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new SkillError("Field 'repo' must look like owner/name, for example google-ai-edge/gallery.");
  }
  const owner = parts[0];
  const name = parts[1].replace(/\.git$/i, '');
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner) || !/^[A-Za-z0-9._-]{1,100}$/.test(name) ||
      name === '.' || name === '..') {
    throw new SkillError(`'${cleanText(raw, 60)}' is not a valid GitHub repository name (owner/name).`);
  }
  return { owner, name };
}

function parseGithubInput(input) {
  const { owner, name } = parseRepo(requireString(input, 'repo'));
  let show = 'all';
  if (input.show !== undefined && input.show !== null && String(input.show).trim() !== '') {
    const s = cleanText(input.show, 30).toLowerCase();
    show = SHOWS.includes(s) ? s : SHOW_ALIASES[s];
    if (!show) throw new SkillError(`Unknown value '${cleanText(input.show, 30)}' for 'show'. Use one of: ${SHOWS.join(', ')}.`);
  }
  return { owner, name, show };
}

function noteRate(res, rate) {
  const get = (k) => (res.headers && typeof res.headers.get === 'function' ? res.headers.get(k) : null);
  const remaining = get('x-ratelimit-remaining') === null ? NaN : Number(get('x-ratelimit-remaining'));
  const limit = get('x-ratelimit-limit') === null ? NaN : Number(get('x-ratelimit-limit'));
  const reset = get('x-ratelimit-reset') === null ? NaN : Number(get('x-ratelimit-reset'));
  if (Number.isFinite(remaining)) rate.remaining = rate.remaining === null ? remaining : Math.min(rate.remaining, remaining);
  if (Number.isFinite(limit)) rate.limit = limit;
  if (Number.isFinite(reset)) rate.reset = reset;
  if ((res.status === 403 || res.status === 429) && (remaining === 0 || get('retry-after') !== null)) {
    const after = Number(get('retry-after'));
    const when = Number.isFinite(after) && after > 0
      ? `Try again in about ${Math.ceil(after)} s.`
      : (Number.isFinite(reset) ? `Try again after ${formatInstant(reset * 1000)} (${HOME_TZ}).` : 'Try again later.');
    throw new SkillError(`GitHub rate limit reached (${Number.isFinite(limit) ? limit : 60} requests per hour without signing in, shared by everything on this network). ${when}`);
  }
}

function fmtDate(iso) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? formatInstant(ms) : 'unknown date';
}

function withCommas(n) {
  return typeof n === 'number' && Number.isFinite(n) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 'n/a';
}

function firstLine(s, max) {
  return cleanText(s, 2000).split('\n')[0].trim().slice(0, max);
}

// Runs one request; an error becomes { error } so a failing extra never hides the rest.
async function attempt(path, extra, rate) {
  try {
    const data = await fetchJson(API + path, {
      timeoutMs: TIMEOUT_MS, label: 'GitHub', onResponse: (res) => noteRate(res, rate), ...extra,
    });
    return { data };
  } catch (e) {
    return { error: e instanceof SkillError ? e.message : 'GitHub data could not be read.' };
  }
}

function releaseLines(r) {
  if (r.error) return [`Latest release: unavailable (${r.error})`];
  if (r.data === null) return ['Latest release: none published'];
  const d = r.data;
  if (!d || typeof d.tag_name !== 'string') return ['Latest release: unexpected response'];
  const note = firstLine(d.body || '', 100);
  return [`Latest release: ${cleanText(d.tag_name, 40)}${d.prerelease ? ' (pre-release)' : ''}, ${fmtDate(d.published_at)}` +
    (note ? ` — ${quoteData(note)}` : '')];
}

function commitLines(r) {
  if (r.error) return [`Recent commits: unavailable (${r.error})`];
  if (r.data === null || (Array.isArray(r.data) && r.data.length === 0)) return ['Recent commits: none (the repository is empty)'];
  if (!Array.isArray(r.data)) return ['Recent commits: unexpected response'];
  const lines = ['Recent commits:'];
  for (const c of r.data.slice(0, 5)) {
    if (!c || typeof c.sha !== 'string' || !c.commit || typeof c.commit.message !== 'string') continue;
    const who = c.commit.author ? cleanText(c.commit.author.name, 40) : '';
    const when = c.commit.author ? fmtDate(c.commit.author.date) : 'unknown date';
    lines.push(`- ${when} ${c.sha.slice(0, 7)} ${quoteData(firstLine(c.commit.message, 90))}${who ? ' — ' + who : ''}`);
  }
  return lines.length > 1 ? lines : ['Recent commits: unexpected response'];
}

function issueLines(r, repo) {
  if (r.error) return [`Open issues: unavailable (${r.error})`];
  if (!Array.isArray(r.data)) return ['Open issues: unexpected response'];
  const real = r.data.filter((i) => i && !i.pull_request && Number.isFinite(i.number) && typeof i.title === 'string');
  if (real.length === 0) return ['Open issues: none in the latest results (pull requests are not listed here)'];
  const lines = [`Latest open issues (pull requests excluded):`];
  for (const i of real.slice(0, 3)) {
    const who = i.user && typeof i.user.login === 'string' ? cleanText(i.user.login, 40) : 'unknown';
    lines.push(`- #${i.number} ${quoteData(cleanText(i.title, 90))} — ${who}, ${fmtDate(i.created_at)}, ${withCommas(i.comments)} comment${i.comments === 1 ? '' : 's'}`);
  }
  return lines;
}

async function githubStatus(input) {
  const { owner, name, show } = parseGithubInput(input);
  const nowMs = Date.now();
  const rate = { remaining: null, limit: null, reset: null };
  const base = `/repos/${owner}/${name}`;

  // The repository first: a 404 stops here and the other requests are never spent.
  const repoRes = await attempt(base, { okStatuses: [404] }, rate);
  if (repoRes.error) throw new SkillError(repoRes.error);
  const repo = repoRes.data;
  if (repo === null) {
    throw new SkillError(`Repository '${owner}/${name}' was not found. Check the spelling; private repositories cannot be read without signing in.`);
  }
  if (typeof repo.full_name !== 'string') throw new SkillError('GitHub returned an unexpected response.');

  const wantRelease = show === 'all' || show === 'release';
  const wantCommits = show === 'all' || show === 'commits';
  const wantIssues = (show === 'all' || show === 'issues') && repo.has_issues !== false;
  const [release, commits, issues] = await Promise.all([
    wantRelease ? attempt(`${base}/releases/latest`, { okStatuses: [404] }, rate) : null,
    wantCommits ? attempt(`${base}/commits?per_page=5`, { okStatuses: [404, 409] }, rate) : null,
    wantIssues ? attempt(`${base}/issues?state=open&per_page=10`, {}, rate) : null,
  ]);

  const flags = [repo.archived ? 'ARCHIVED (read-only)' : '', repo.fork ? 'fork' : ''].filter(Boolean);
  const lines = [`GitHub: https://github.com/${owner}/${name}${flags.length ? ' [' + flags.join(', ') + ']' : ''}`];
  const desc = cleanText(repo.description, 160);
  if (desc) lines.push(quoteData(desc));
  const license = repo.license && typeof repo.license.spdx_id === 'string' ? cleanText(repo.license.spdx_id, 30) : 'none listed';
  lines.push(`Stars ${withCommas(repo.stargazers_count)}, forks ${withCommas(repo.forks_count)}, open issues and pull requests ${withCommas(repo.open_issues_count)}, ` +
    `language ${cleanText(repo.language, 30) || 'n/a'}, license ${license}`);
  lines.push(`Last push ${fmtDate(repo.pushed_at)}, created ${fmtDate(repo.created_at)}, default branch ${cleanText(repo.default_branch, 40) || 'n/a'}`);
  if (release) lines.push(...releaseLines(release));
  if (commits) lines.push(...commitLines(commits));
  if (issues) lines.push(...issueLines(issues, repo));
  if ((show === 'all' || show === 'issues') && repo.has_issues === false) lines.push('Issues are disabled for this repository.');

  if (rate.remaining === null) {
    lines.push('GitHub requests left this hour: unknown.');
  } else {
    const limit = rate.limit === null ? 60 : rate.limit;
    lines.push(`GitHub requests left this hour: ${rate.remaining} of ${limit}` +
      (rate.reset ? ` (resets ${formatInstant(rate.reset * 1000)})` : '') +
      (rate.remaining <= LOW_RATE ? ' — running low' : '') + '. Shared with everything on this network.');
  }
  lines.push(`Source: GitHub REST API, public data, no sign-in. Retrieved ${formatInstant(nowMs)} (${HOME_TZ}).`);
  return lines.join('\n');
}

registerSkill(githubStatus);
