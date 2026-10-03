// DeepBench v7.0.290 | scripts/lib/slim-served-page.mjs | SES-203 — the served briefing page carries the
// template's DEVELOPER COMMENTARY, and a cycle now has to read all of it before it may republish.
//
// WHY THIS EXISTS. Since the Artifact publish gate started refusing a republish until the session
// had Read every line of the live page, every cycle pays a full-page read as a precondition to
// writing John's briefing. Measured on the served copy this ticket shipped against (358,950 bytes,
// 18,827 of them the platform's own frame-runtime, 338,032 ours): 670 whole-line `//` comments
// totalling 57,350 chars, plus 9,718 chars of leading indentation, inside the single 287,826-char
// renderer block. That is 19.9% of the page a cycle must read, re-sent identically on every fire,
// and NOT ONE BYTE OF IT IS JOHN'S CONTENT — it is notes addressed to whoever edits the template
// next.
//
// THE SPLIT THIS MODULE MAKES, and it is the whole idea: the TEMPLATE in git keeps every comment
// byte-for-byte (it is the source of truth, and this repo's editor warnings are load-bearing —
// SES-164's "check for a warning that exists nowhere else before you move anything" applies to the
// template exactly as it does to a stamp). The SERVED ARTIFACT is a build output nobody edits, so
// it does not need them. Nothing is deleted from the repository; one build step declines to COPY
// something forward.
//
// THE EDIT THIS FORBIDS, because it is the tempting shortcut and it is wrong twice: stripping the
// comments out of docs/runbooks/briefing-template.html itself. That deletes the warnings from the
// only place they are kept, to save bytes in a file that is regenerated anyway — SES-188's trim
// was of DUPLICATED provenance blocks with the originals archived first, which is a different act.
//
// WHY IT ONLY TOUCHES <script> AND NEVER THE HTML COMMENTS. Three HTML comments in that file are
// load-bearing rather than provenance: the TITLE GUARD (the Artifact publisher scans only the first
// 8192 bytes for a <title>), and the SEED SENTINEL immediately above the briefing-state block,
// which is deliberately NOT a valid empty state so a builder that fails to seed cannot publish a
// page that merely looks seeded. Stripping HTML comments would remove the sentinel and silently
// weaken that guard for 5.2% more. Not worth it, and not this ticket's business.
//
// FAIL-CLOSED, which is the property to preserve if this is ever edited. Two independent gates:
//   (1) the scanner asserts, per deletion, that what it removed BEGINS with a comment opener it
//       recognised in code state — so a state-machine bug cannot silently eat a string literal;
//   (2) the result is parse-checked with vm.Script before it is accepted.
// If either fails, this returns the ORIGINAL html with applied:false and a reason. A page that
// republishes unslimmed is a cost; a page that republishes broken is John's only interface gone.

import vm from 'node:vm';

// Scan one JavaScript source and delete whole-line `//` comments, trailing `//` comments, block
// comments, and leading indentation — but only where the scanner is in CODE state. A `//` inside a
// string, a template literal or a regex is content and is left alone, which is the entire reason
// this is a state machine and not a regular expression.
//
// The regex-literal branch matters even though the current renderer has few: mistaking `/.../` for
// division puts the scanner inside what it thinks is code, where a `//` in the pattern (e.g.
// `/https?:\/\//`) would read as a comment opener and eat the rest of the line.
function stripJsComments(src) {
  const cuts = [];              // [start, end) ranges to delete, each asserted below
  let i = 0;
  const n = src.length;
  let lineStart = 0;            // index of the first char of the current line
  let lineIsCode = true;        // was the line's start reached in code state?
  let sawCodeOnLine = false;    // any non-space code char seen on this line yet
  let firstCodeCol = -1;        // index of first non-space char on this line (code state only)
  const tmpl = [];              // template-literal nesting: stack of brace depths
  let braceDepth = 0;
  let prevTok = '';             // last significant code char, for the regex/divide decision

  const pushCut = (a, b, kind) => {
    if (b > a) cuts.push({ a, b, kind });
  };

  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];

    // ---- newline bookkeeping (code state only) -------------------------------------------
    if (c === '\n') {
      // A line that held nothing but a comment leaves no code; its indentation was already
      // covered by the comment cut, and the newline itself is kept so line structure survives.
      if (lineIsCode && firstCodeCol > lineStart) pushCut(lineStart, firstCodeCol, 'indent');
      i++;
      lineStart = i;
      lineIsCode = true;
      sawCodeOnLine = false;
      firstCodeCol = -1;
      continue;
    }

    // ---- string literals -------------------------------------------------------------------
    if (c === "'" || c === '"') {
      if (firstCodeCol < 0) firstCodeCol = i;
      sawCodeOnLine = true;
      const quote = c;
      i++;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === quote) { i++; break; }
        if (src[i] === '\n') break;         // unterminated; let the parse check catch it
        i++;
      }
      prevTok = quote;
      continue;
    }

    // ---- template literals (with ${ } nesting) ---------------------------------------------
    if (c === '`') {
      if (firstCodeCol < 0) firstCodeCol = i;
      sawCodeOnLine = true;
      i++;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '`') { i++; break; }
        if (src[i] === '$' && src[i + 1] === '{') {
          // Enter an interpolation: code state resumes until the matching brace.
          tmpl.push(braceDepth);
          braceDepth++;
          i += 2;
          break;
        }
        if (src[i] === '\n') {
          // A newline INSIDE a template literal: its indentation is content, never strippable.
          lineStart = i + 1;
          lineIsCode = false;
          firstCodeCol = -1;
        }
        i++;
      }
      prevTok = '`';
      continue;
    }

    // ---- comments ---------------------------------------------------------------------------
    if (c === '/' && c2 === '/') {
      const start = (!sawCodeOnLine && lineIsCode) ? lineStart : i;   // whole line, or trailing
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      pushCut(start, j, 'line-comment');
      i = j;                                   // leave the newline for the branch above
      continue;
    }
    if (c === '/' && c2 === '*') {
      const start = (!sawCodeOnLine && lineIsCode) ? lineStart : i;
      let j = i + 2;
      while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++;
      j = Math.min(n, j + 2);
      pushCut(start, j, 'block-comment');
      i = j;
      continue;
    }

    // ---- regex literal vs division ----------------------------------------------------------
    if (c === '/') {
      // A regex may begin where a value may not follow: after an operator, punctuation, or a
      // keyword. After an identifier, number, `)`, `]` or a string it is division.
      const isRegex = !/[A-Za-z0-9_$)\]'"`]/.test(prevTok);
      if (firstCodeCol < 0) firstCodeCol = i;
      sawCodeOnLine = true;
      if (isRegex) {
        i++;
        let inClass = false;
        while (i < n) {
          if (src[i] === '\\') { i += 2; continue; }
          if (src[i] === '[') inClass = true;
          else if (src[i] === ']') inClass = false;
          else if (src[i] === '/' && !inClass) { i++; break; }
          else if (src[i] === '\n') break;
          i++;
        }
        while (i < n && /[a-z]/.test(src[i])) i++;   // flags
        prevTok = '/';
        continue;
      }
      prevTok = '/';
      i++;
      continue;
    }

    // ---- ordinary code ----------------------------------------------------------------------
    if (c === '{') braceDepth++;
    if (c === '}') {
      braceDepth--;
      if (tmpl.length && braceDepth === tmpl[tmpl.length - 1]) {
        // Closing a `${ }` — resume template-literal scanning.
        tmpl.pop();
        i++;
        while (i < n) {
          if (src[i] === '\\') { i += 2; continue; }
          if (src[i] === '`') { i++; break; }
          if (src[i] === '$' && src[i + 1] === '{') { tmpl.push(braceDepth); braceDepth++; i += 2; break; }
          if (src[i] === '\n') { lineStart = i + 1; lineIsCode = false; firstCodeCol = -1; }
          i++;
        }
        prevTok = '`';
        continue;
      }
    }
    if (!/\s/.test(c)) {
      if (firstCodeCol < 0) firstCodeCol = i;
      sawCodeOnLine = true;
      prevTok = c;
    }
    i++;
  }
  if (lineIsCode && firstCodeCol > lineStart) pushCut(lineStart, firstCodeCol, 'indent');

  // GATE (1): every deletion must be one this scanner can name. An indent cut must be whitespace;
  // a comment cut must actually begin with a comment opener. A state-machine bug that wandered
  // into a string literal fails here rather than shipping a corrupted page.
  for (const { a, b, kind } of cuts) {
    const text = src.slice(a, b);
    if (kind === 'indent') {
      if (/\S/.test(text)) return { out: null, removed: 0, reason: 'indent cut contained non-whitespace' };
    } else if (!/^\s*\/[/*]/.test(text)) {
      return { out: null, removed: 0, reason: `${kind} cut did not begin with a comment opener` };
    }
  }

  cuts.sort((x, y) => x.a - y.a);
  let out = '';
  let cursor = 0;
  let removed = 0;
  for (const { a, b } of cuts) {
    if (a < cursor) continue;                 // overlapping cut; keep the earlier one
    out += src.slice(cursor, a);
    removed += b - a;
    cursor = b;
  }
  out += src.slice(cursor);

  // Collapse the blank lines the comment cuts leave behind. Purely cosmetic on a file nobody
  // edits, and it is the difference between 670 empty lines and none.
  const before = out.length;
  out = out.replace(/\n[ \t]*(?=\n)/g, '');
  removed += before - out.length;

  return { out, removed, reason: null };
}

// Slim the built page. Only <script> blocks that are JavaScript are touched; the
// `application/json` briefing-state block is John's harvested state and is left byte-for-byte.
export function slimServedPage(html) {
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let out = '';
  let last = 0;
  let removed = 0;
  let blocks = 0;
  let m;

  while ((m = re.exec(html)) !== null) {
    const [full, attrs, body] = m;
    if (/type\s*=\s*["']?application\/json/i.test(attrs) || !body.trim()) continue;

    const { out: stripped, reason } = stripJsComments(body);
    if (stripped === null) return { html, removed: 0, applied: false, blocks: 0, reason };

    // GATE (2): the result must still parse. A page that publishes broken is worse than a page
    // that publishes fat, so an unparseable strip abandons the whole optimisation.
    try {
      new vm.Script(stripped, { filename: 'briefing-slim-check.js' });
    } catch (e) {
      return { html, removed: 0, applied: false, blocks: 0, reason: `stripped script did not parse: ${e.message}` };
    }

    out += html.slice(last, m.index) + `<script${attrs}>` + stripped + '</script>';
    last = m.index + full.length;
    removed += body.length - stripped.length;
    blocks++;
  }
  out += html.slice(last);
  return { html: out, removed, applied: blocks > 0, blocks, reason: null };
}

export const __test = { stripJsComments };
