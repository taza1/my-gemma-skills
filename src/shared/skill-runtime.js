// Shared runtime for every skill. Inlined into each skill's index.html by scripts/build.js.
// Contract (docs/TECHNICAL-RESEARCH.md s4): ai_edge_gallery_get_result(data) returns a JSON
// string containing ONLY { result } or { error }; unknown fields make the app discard the shape.

class SkillError extends Error {}

function parseInput(data) {
  if (typeof data !== 'string' || data.trim() === '') {
    throw new SkillError('No input received. Expected a JSON object.');
  }
  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch (e) {
    throw new SkillError('Input is not valid JSON.');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SkillError('Input must be a JSON object.');
  }
  return parsed;
}

function requireString(input, field) {
  const v = input[field];
  if (v === undefined || v === null) throw new SkillError(`Missing field '${field}'.`);
  if (typeof v !== 'string' && typeof v !== 'number') {
    throw new SkillError(`Field '${field}' must be text.`);
  }
  const s = String(v).trim();
  if (s === '') throw new SkillError(`Field '${field}' is empty.`);
  return s;
}

function requireNumber(input, field) {
  const v = input[field];
  if (v === undefined || v === null) throw new SkillError(`Missing field '${field}'.`);
  if (typeof v === 'string' && v.trim() === '') throw new SkillError(`Field '${field}' is empty.`);
  const n = typeof v === 'string' ? Number(v.trim()) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new SkillError(`Field '${field}' must be a finite number.`);
  }
  return n;
}

function registerSkill(handler) {
  window['ai_edge_gallery_get_result'] = async (data) => {
    try {
      const out = await handler(parseInput(data));
      return JSON.stringify({ result: String(out) });
    } catch (e) {
      if (e instanceof SkillError) return JSON.stringify({ error: e.message });
      console.error(e);
      return JSON.stringify({ error: 'Unexpected error in skill.' });
    }
  };
}
