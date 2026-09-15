// DeepBench v7.0.489 | tests/regression/ses-398-meter-self-read.test.mjs | SES-398
//
// FEATURE: SES-398 -- the cloud routine reads the usage meter itself at every fire, before the
// pre-boot gate. Measured 2026-09-15: cycles 1e058d0f (06:40Z), 4d4f5e6c (10:54Z) and fae57bad
// (12:41Z) refused `meter_stale`, because every reading came from John's laptop or a GitHub
// schedule that ran 5 of its 34 due fires. Step 1 of docs/runbooks/routine-prompt.md now runs ONE
// pinned Bash command whose last printed line is either an INSERT into
// public.runner_usage_readings or a NO_READING reason; the cycle runs the INSERT, then asks
// runner_should_boot().
//
// WHAT IS GUARDED, with no model call and no database write:
//   1. The command sits in the prompt block BYTE-IDENTICAL (readPrompt from ses-355), so the routine
//      copy pushed from that block runs exactly the filter this file runs.
//   2. Its shape: variant A (env -C /tmp, no tools, no MCP, no slash commands, no session
//      persistence -- ~6.6K input tokens measured locally) FIRST, then `||`, then variant B (the
//      ticket's measured call, ~32.4K), the SAME filter text after both. The filter exits 1 on
//      NO_READING and 0 on the INSERT, so bash runs B only when A yields no reading.
//   3. The filter itself, run by `node -e` with exactly the bytes bash would pass (the text between
//      the single quotes), on five fixtures, asserting WHICH line came out and the exit code:
//        F1 Fable call                        -> the INSERT at 63 / 5 / 94, exit 0
//        F2 Opus call                         -> 63 / 5 / NULL, exit 0 (no Fable window, no guess)
//        F3 F1 minus every unifiedWindows     -> NO_READING no_unified_windows, exit 1
//        F4 empty stdin                       -> NO_READING no_output, exit 1
//        F5 a real Fable 400 failure          -> NO_READING no_rate_limit_event, exit 1
//      Controls: 1e4 -> 1e2 turns F1 red; a filter that exits 0 on NO_READING turns F3 red (it would
//      stop B from ever running); B before A, or two different filters, turn the shape red.
//
// FIXTURE PROVENANCE, stated exactly because two sources are spliced (gathered by the parent
// session meter-a0-0915, 2026-09-15):
//   * CLOUD, VERBATIM: the three rate_limit_info objects -- the Fable call's two events in recorded
//     order and the Opus call's one -- from cloud routine run cse_01Xayc1PeKmwhEgJamT6PFuX
//     (environment env_01GuEzm2nCHbCB5SumvQVEQ1, Claude Code 2.1.272, 15:57-16:02Z), printed there
//     with JSON.stringify and read back from get_run_log. That run's full raw lines (wrapper, init,
//     result) were NOT retrievable -- get_run_log truncates tool results -- and two later cloud
//     probes were refused by the unattended model, so no further probe was run.
//   * LOCAL, VERBATIM: every other byte. The init, one thinking_tokens, the assistant text, the
//     rate_limit_event wrapper (type, uuid, session_id), post_turn_summary and result lines are
//     local-raw-haiku.jsonl lines 1, 2, 14, 15, 16 and 17: Claude Code 2.1.218 on John's laptop,
//     claude-haiku-4-5, variant B flags. Lines 3-13 (ten more thinking_tokens lines and the
//     assistant thinking block) are omitted; the filter skips every such line by type.
//   * SPLICED, the only two edits, both made in code below and never in the constants: each event
//     line is LOCAL_EVENT with its rate_limit_info replaced by a cloud object (both Fable events
//     reuse that one wrapper), and the init line's claude_code_version 2.1.218 becomes 2.1.272. The
//     usage numbers (in 10 / out 36 / cache_read 25273 / cache_write 7115) are the local run's.
//     2.1.218 emits no unifiedWindows at all, which is why the windows had to come from the cloud.
//   * F5 is local-raw-A.jsonl whole and untouched: variant A on claude-fable-5-1 under 2.1.218, which
//     the API refuses with a 400 before any rate_limit_event.

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { readPrompt } from "./ses-355-routine-prompt.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROMPT_REL = "docs/runbooks/routine-prompt.md";

// The filter carries no single quote (it spells one \x27), no `||` (so the command splits on it
// unambiguously), no backtick and no newline -- it has to survive being one single-quoted bash word.
export const SELF_READ_FILTER = String.raw`let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const q="\x27",w={};let n=0,ev=0,uw=0,ver="unknown",u=null;for(const l of d.split(/\r?\n/)){let o;try{o=JSON.parse(l)}catch(e){continue}if(!(o&&typeof o==="object"))continue;n++;if(o.type==="system"&&o.subtype==="init"&&typeof o.claude_code_version==="string"&&/^[0-9A-Za-z.-]+$/.test(o.claude_code_version))ver=o.claude_code_version;if(o.type==="rate_limit_event"){ev++;const x=o.rate_limit_info&&o.rate_limit_info.unifiedWindows;if(x&&typeof x==="object"&&!Array.isArray(x)){uw++;Object.assign(w,x)}}if(o.type==="result"&&o.usage&&typeof o.usage==="object")u=o.usage}const pct=k=>{const v=w[k],f=typeof v==="number"?v:v&&v.utilization;return typeof f==="number"&&isFinite(f)&&f>=0?Math.round(f*1e4)/100:null};const t=k=>u&&Number.isInteger(u[k])?u[k]:"?";let r=!n?"no_output":!ev?"no_rate_limit_event":!uw?"no_unified_windows":w.five_hour==null?"missing_five_hour":w.seven_day==null?"missing_seven_day":null;const s5=pct("five_hour"),s7=pct("seven_day"),oi=w.seven_day_overage_included==null?"NULL":pct("seven_day_overage_included");if(!r&&[s5,s7,oi].includes(null))r="bad_value";if(r){console.log("NO_READING "+r);process.exitCode=1;return}const keys=Object.keys(w).filter(k=>/^[A-Za-z0-9_]+$/.test(k)).join(",");console.log("INSERT INTO public.runner_usage_readings (source, slot, all_models_pct, session_5h_pct, fable_pct, note) VALUES ("+q+"routine-self-read"+q+", "+q+"adhoc"+q+", "+s7+", "+s5+", "+oi+", "+q+"routine self-read (SES-398): Claude Code "+ver+"; claude-fable-5-1 rate_limit_event unifiedWindows "+keys+"; usage in "+t("input_tokens")+" out "+t("output_tokens")+" cache_read "+t("cache_read_input_tokens")+" cache_write "+t("cache_creation_input_tokens")+q+") RETURNING id, taken_at;");process.exitCode=0})`;
export const VARIANT_A =
  'env -C /tmp claude -p "Reply with only: OK" --model claude-fable-5-1 --max-turns 1 --tools "" ' +
  "--strict-mcp-config --disable-slash-commands --no-session-persistence --output-format stream-json --verbose";
export const VARIANT_B =
  'claude -p "Reply with only: OK" --model claude-fable-5-1 --max-turns 1 --output-format stream-json --verbose';
const piped = (variant, filter = SELF_READ_FILTER) => `${variant} | node -e '${filter}'`;
export const SELF_READ_COMMAND = `${piped(VARIANT_A)} || ${piped(VARIANT_B)}`;

// Cloud rate_limit_info objects, VERBATIM (run cse_01Xayc1PeKmwhEgJamT6PFuX, Claude Code 2.1.272).
export const CLOUD_FABLE_EVENT_1 = "{\"status\":\"allowed\",\"resetsAt\":1789494000,\"rateLimitType\":\"five_hour\",\"overageStatus\":\"rejected\",\"overageDisabledReason\":\"out_of_credits\",\"isUsingOverage\":false,\"unifiedWindows\":{\"five_hour\":{\"utilization\":0.05,\"resetsAt\":1789494000},\"seven_day\":{\"utilization\":0.63,\"resetsAt\":1789711200}}}";
export const CLOUD_FABLE_EVENT_2 = "{\"status\":\"allowed_warning\",\"resetsAt\":1789711200,\"rateLimitType\":\"seven_day_overage_included\",\"utilization\":0.94,\"isUsingOverage\":false,\"surpassedThreshold\":0.75,\"unifiedWindows\":{\"five_hour\":{\"utilization\":0.05,\"resetsAt\":1789494000},\"seven_day\":{\"utilization\":0.63,\"resetsAt\":1789711200},\"seven_day_overage_included\":{\"utilization\":0.94,\"resetsAt\":1789711200}}}";
export const CLOUD_OPUS_EVENT = "{\"status\":\"allowed\",\"resetsAt\":1789494000,\"rateLimitType\":\"five_hour\",\"overageStatus\":\"rejected\",\"overageDisabledReason\":\"out_of_credits\",\"isUsingOverage\":false,\"unifiedWindows\":{\"five_hour\":{\"utilization\":0.05,\"resetsAt\":1789494000},\"seven_day\":{\"utilization\":0.63,\"resetsAt\":1789711200}}}";
// Local line shapes, VERBATIM (local-raw-haiku.jsonl lines 1, 2, 14, 15, 16, 17; Claude Code 2.1.218).
export const LOCAL_INIT = "{\"type\":\"system\",\"subtype\":\"init\",\"cwd\":\"C:\\\\Users\\\\jleon\\\\AppData\\\\Local\\\\Temp\",\"session_id\":\"c8107842-5e19-431d-9dfa-4d38978ca95e\",\"tools\":[\"Task\",\"Artifact\",\"Bash\",\"CronCreate\",\"CronDelete\",\"CronList\",\"DesignSync\",\"Edit\",\"EnterWorktree\",\"ExitWorktree\",\"Glob\",\"Grep\",\"Monitor\",\"NotebookEdit\",\"PowerShell\",\"PushNotification\",\"Read\",\"RemoteTrigger\",\"ReportFindings\",\"ScheduleWakeup\",\"SendMessage\",\"Skill\",\"TaskCreate\",\"TaskGet\",\"TaskList\",\"TaskOutput\",\"TaskStop\",\"TaskUpdate\",\"ToolSearch\",\"WebFetch\",\"WebSearch\",\"Workflow\",\"Write\"],\"mcp_servers\":[],\"model\":\"claude-haiku-4-5\",\"permissionMode\":\"bypassPermissions\",\"slash_commands\":[\"start\",\"deep-research\",\"design-sync\",\"dataviz\",\"artifact-design\",\"artifact-capabilities\",\"update-config\",\"verify\",\"debug\",\"code-review\",\"simplify\",\"batch\",\"fewer-permission-prompts\",\"doctor\",\"loop\",\"schedule\",\"claude-api\",\"run\",\"run-skill-generator\",\"agents\",\"clear\",\"color\",\"compact\",\"config\",\"context\",\"effort\",\"fast\",\"heapdump\",\"init\",\"mcp\",\"import\",\"model\",\"__remote-workflow\",\"workflow-launch-exec\",\"reload-skills\",\"rename\",\"review\",\"ultrareview\",\"security-review\",\"usage-credits\",\"extra-usage\",\"usage\",\"insights\",\"recap\",\"goal\",\"design\",\"design-consent\",\"design-revoke\",\"team-onboarding\"],\"apiKeySource\":\"none\",\"claude_code_version\":\"2.1.218\",\"output_style\":\"default\",\"agents\":[\"claude\",\"claude-code-guide\",\"Explore\",\"general-purpose\",\"Plan\",\"statusline-setup\"],\"skills\":[\"deep-research\",\"design-sync\",\"dataviz\",\"artifact-design\",\"artifact-capabilities\",\"update-config\",\"verify\",\"debug\",\"code-review\",\"simplify\",\"batch\",\"fewer-permission-prompts\",\"doctor\",\"loop\",\"schedule\",\"claude-api\",\"run\",\"run-skill-generator\"],\"plugins\":[],\"capabilities\":[\"interrupt_receipt_v1\",\"msg_lifecycle_v1\"],\"analytics_disabled\":false,\"product_feedback_disabled\":false,\"uuid\":\"42512203-d7c3-4a6a-8a50-7655bdae92ad\",\"memory_paths\":{\"auto\":\"C:\\\\Users\\\\jleon\\\\.claude\\\\projects\\\\C--Users-jleon-AppData-Local-Temp\\\\memory\\\\\"},\"fast_mode_state\":\"off\"}";
export const LOCAL_THINKING = "{\"type\":\"system\",\"subtype\":\"thinking_tokens\",\"estimated_tokens\":5,\"estimated_tokens_delta\":5,\"uuid\":\"8e53ab4e-2c00-4c01-96b7-870dca9fbdd6\",\"session_id\":\"c8107842-5e19-431d-9dfa-4d38978ca95e\"}";
export const LOCAL_TEXT = "{\"type\":\"assistant\",\"message\":{\"model\":\"claude-haiku-4-5-20251001\",\"id\":\"msg_011Cf5ZicyDxurCSB8MaD4Ct\",\"type\":\"message\",\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"OK\"}],\"container\":null,\"stop_reason\":null,\"stop_sequence\":null,\"stop_details\":null,\"usage\":{\"input_tokens\":10,\"cache_creation_input_tokens\":7115,\"cache_read_input_tokens\":25273,\"cache_creation\":{\"ephemeral_5m_input_tokens\":0,\"ephemeral_1h_input_tokens\":7115},\"output_tokens\":4,\"service_tier\":\"standard\",\"inference_geo\":\"not_available\"},\"diagnostics\":null,\"context_management\":null},\"parent_tool_use_id\":null,\"session_id\":\"c8107842-5e19-431d-9dfa-4d38978ca95e\",\"uuid\":\"ba9971c2-e498-4b42-914d-d8bc0d4d1889\",\"timestamp\":\"2026-09-15T16:46:51.620Z\",\"request_id\":\"req_011Cf5ZicWSDXS5wxK5TrypP\"}";
export const LOCAL_EVENT = "{\"type\":\"rate_limit_event\",\"rate_limit_info\":{\"status\":\"allowed\",\"resetsAt\":1789494000,\"rateLimitType\":\"five_hour\",\"overageStatus\":\"rejected\",\"overageDisabledReason\":\"out_of_credits\",\"isUsingOverage\":false},\"uuid\":\"e63c9044-bb66-48b7-a640-939f45d4031a\",\"session_id\":\"c8107842-5e19-431d-9dfa-4d38978ca95e\"}";
export const LOCAL_SUMMARY = "{\"type\":\"system\",\"subtype\":\"post_turn_summary\",\"summarizes_uuid\":\"ba9971c2-e498-4b42-914d-d8bc0d4d1889\",\"status_category\":\"review_ready\",\"status_detail\":\"user confirmation received\",\"needs_action\":\"\",\"uuid\":\"bd436850-aadc-4f5e-ac56-7a46feb0ce10\",\"session_id\":\"c8107842-5e19-431d-9dfa-4d38978ca95e\"}";
export const LOCAL_RESULT = "{\"is_error\":false,\"duration_api_ms\":906,\"num_turns\":1,\"stop_reason\":\"end_turn\",\"session_id\":\"c8107842-5e19-431d-9dfa-4d38978ca95e\",\"total_cost_usd\":0.0169473,\"usage\":{\"input_tokens\":10,\"cache_creation_input_tokens\":7115,\"cache_read_input_tokens\":25273,\"output_tokens\":36,\"server_tool_use\":{\"web_search_requests\":0,\"web_fetch_requests\":0},\"service_tier\":\"standard\",\"cache_creation\":{\"ephemeral_1h_input_tokens\":7115,\"ephemeral_5m_input_tokens\":0},\"inference_geo\":\"not_available\",\"iterations\":[{\"input_tokens\":10,\"output_tokens\":36,\"cache_read_input_tokens\":25273,\"cache_creation_input_tokens\":7115,\"cache_creation\":{\"ephemeral_5m_input_tokens\":0,\"ephemeral_1h_input_tokens\":7115},\"type\":\"message\"}],\"speed\":\"standard\"},\"modelUsage\":{\"claude-haiku-4-5\":{\"inputTokens\":10,\"outputTokens\":36,\"cacheReadInputTokens\":25273,\"cacheCreationInputTokens\":7115,\"webSearchRequests\":0,\"costUSD\":0.0169473,\"contextWindow\":200000,\"maxOutputTokens\":32000,\"canonicalModel\":\"claude-haiku-4-5\",\"provider\":\"firstParty\"}},\"permission_denials\":[],\"terminal_reason\":\"completed\",\"fast_mode_state\":\"off\",\"subtype\":\"success\",\"api_error_status\":null,\"result\":\"OK\",\"ttft_ms\":1442,\"ttft_stream_ms\":1138,\"time_to_request_ms\":568,\"type\":\"result\",\"duration_ms\":2349,\"uuid\":\"4e87e3a8-cdb8-4a40-98ef-9817f79e2c80\"}";
// A real failure, VERBATIM (local-raw-A.jsonl, all 3 lines: variant A on claude-fable-5-1, Claude Code 2.1.218, API 400).
export const LOCAL_FABLE_400 = "{\"type\":\"system\",\"subtype\":\"init\",\"cwd\":\"C:\\\\Users\\\\jleon\\\\AppData\\\\Local\\\\Temp\",\"session_id\":\"3bcad894-8822-40e7-b4c5-acb84efd4bca\",\"tools\":[],\"mcp_servers\":[],\"model\":\"claude-fable-5-1\",\"permissionMode\":\"bypassPermissions\",\"slash_commands\":[],\"apiKeySource\":\"none\",\"claude_code_version\":\"2.1.218\",\"output_style\":\"default\",\"agents\":[\"claude\",\"claude-code-guide\",\"Explore\",\"general-purpose\",\"Plan\",\"statusline-setup\"],\"skills\":[],\"plugins\":[],\"capabilities\":[\"interrupt_receipt_v1\",\"msg_lifecycle_v1\"],\"analytics_disabled\":false,\"product_feedback_disabled\":false,\"uuid\":\"64e8ec59-6dc1-4978-a0d1-2510c11155e0\",\"memory_paths\":{\"auto\":\"C:\\\\Users\\\\jleon\\\\.claude\\\\projects\\\\C--Users-jleon-AppData-Local-Temp\\\\memory\\\\\"},\"fast_mode_state\":\"off\"}\n{\"type\":\"assistant\",\"message\":{\"id\":\"42b0944d-8f56-4c14-be83-e616066d894d\",\"container\":null,\"model\":\"<synthetic>\",\"role\":\"assistant\",\"stop_details\":null,\"stop_reason\":\"stop_sequence\",\"stop_sequence\":\"\",\"type\":\"message\",\"usage\":{\"input_tokens\":0,\"output_tokens\":0,\"cache_creation_input_tokens\":0,\"cache_read_input_tokens\":0,\"server_tool_use\":{\"web_search_requests\":0,\"web_fetch_requests\":0},\"service_tier\":null,\"cache_creation\":{\"ephemeral_1h_input_tokens\":0,\"ephemeral_5m_input_tokens\":0},\"inference_geo\":null,\"iterations\":null,\"speed\":null},\"content\":[{\"type\":\"text\",\"text\":\"API Error: 400 Claude Code 2.1.218 does not support this model; version 2.1.251 or newer is required. Run 'claude update', or update the Claude desktop app, then try again.\"}],\"context_management\":null},\"parent_tool_use_id\":null,\"session_id\":\"3bcad894-8822-40e7-b4c5-acb84efd4bca\",\"uuid\":\"21a73fe0-b916-4adf-a03b-ef67ecc644ab\",\"timestamp\":\"2026-09-15T16:42:56.567Z\",\"error\":\"unknown\",\"request_id\":\"req_011Cf5ZRKqMk1Cbdh2zPtEny\"}\n{\"is_error\":true,\"duration_api_ms\":0,\"num_turns\":1,\"stop_reason\":\"stop_sequence\",\"session_id\":\"3bcad894-8822-40e7-b4c5-acb84efd4bca\",\"total_cost_usd\":0,\"usage\":{\"input_tokens\":0,\"cache_creation_input_tokens\":0,\"cache_read_input_tokens\":0,\"output_tokens\":0,\"server_tool_use\":{\"web_search_requests\":0,\"web_fetch_requests\":0},\"service_tier\":\"standard\",\"cache_creation\":{\"ephemeral_1h_input_tokens\":0,\"ephemeral_5m_input_tokens\":0},\"inference_geo\":\"\",\"iterations\":[],\"speed\":\"standard\"},\"modelUsage\":{},\"permission_denials\":[],\"terminal_reason\":\"api_error\",\"fast_mode_state\":\"off\",\"subtype\":\"success\",\"api_error_status\":400,\"result\":\"API Error: 400 Claude Code 2.1.218 does not support this model; version 2.1.251 or newer is required. Run 'claude update', or update the Claude desktop app, then try again.\",\"type\":\"result\",\"duration_ms\":1411,\"uuid\":\"316ce5a8-9337-4342-9c95-f05fb93442d1\"}";

const lines = (...ls) => ls.join("\n") + "\n";
const initAt = version => {
  const out = LOCAL_INIT.replace('"claude_code_version":"2.1.218"', `"claude_code_version":"${version}"`);
  assert.notStrictEqual(out, LOCAL_INIT, "fixture: the recorded init line no longer carries claude_code_version 2.1.218");
  return out;
};
const eventWith = info => {
  const re = /"rate_limit_info":\{[^{}]*\}/;
  assert.ok(re.test(LOCAL_EVENT), "fixture: the recorded event wrapper no longer carries a flat rate_limit_info");
  return LOCAL_EVENT.replace(re, () => `"rate_limit_info":${info}`);
};
const stripWindows = line => {
  let o;
  try { o = JSON.parse(line); } catch { return line; }
  if (o?.type !== "rate_limit_event") return line;
  delete o.rate_limit_info.unifiedWindows;
  return JSON.stringify(o);
};

export const F1 = lines(initAt("2.1.272"), LOCAL_THINKING, LOCAL_TEXT,
  eventWith(CLOUD_FABLE_EVENT_1), eventWith(CLOUD_FABLE_EVENT_2), LOCAL_SUMMARY, LOCAL_RESULT);
export const F2 = lines(initAt("2.1.272"), LOCAL_THINKING, LOCAL_TEXT,
  eventWith(CLOUD_OPUS_EVENT), LOCAL_SUMMARY, LOCAL_RESULT);
export const F3 = F1.split("\n").map(stripWindows).join("\n");
export const F4 = "";
export const F5 = LOCAL_FABLE_400 + "\n";

const COLS = "INSERT INTO public.runner_usage_readings (source, slot, all_models_pct, session_5h_pct, fable_pct, note) VALUES ";
const USAGE = "; usage in 10 out 36 cache_read 25273 cache_write 7115";
export const F1_INSERT = COLS +
  "('routine-self-read', 'adhoc', 63, 5, 94, 'routine self-read (SES-398): Claude Code 2.1.272; claude-fable-5-1 " +
  `rate_limit_event unifiedWindows five_hour,seven_day,seven_day_overage_included${USAGE}') RETURNING id, taken_at;`;
export const F2_INSERT = COLS +
  "('routine-self-read', 'adhoc', 63, 5, NULL, 'routine self-read (SES-398): Claude Code 2.1.272; claude-fable-5-1 " +
  `rate_limit_event unifiedWindows five_hour,seven_day${USAGE}') RETURNING id, taken_at;`;

// Runs the filter the way bash does after `| node -e '<filter>'`: one argv word, stdin piped.
export function runFilter(filter, input) {
  const r = spawnSync(process.execPath, ["-e", filter], { input, encoding: "utf8", timeout: 20000 });
  const printed = String(r.stdout || "").split(/\r?\n/).filter(Boolean);
  return { status: r.status, printed, last: printed.at(-1) ?? "", stderr: String(r.stderr || "") };
}

export function commandHalves(command) {
  const halves = command.split(" || ");
  assert.strictEqual(halves.length, 2, `the self-read command must be exactly "A | filter || B | filter"; it splits into ${halves.length} part(s) on " || "`);
  return halves.map((h, i) => {
    const m = /^(.*) \| node -e '([^']*)'$/.exec(h);
    assert.ok(m, `half ${i + 1} of the self-read command is not "<claude call> | node -e '<filter>'": ${h.slice(0, 120)}`);
    return { variant: m[1], filter: m[2] };
  });
}

export function gradeCommand(command) {
  const [a, b] = commandHalves(command);
  assert.strictEqual(a.variant, VARIANT_A,
    "the FIRST call must be variant A (env -C /tmp, --tools \"\", --strict-mcp-config, --disable-slash-commands, " +
      `--no-session-persistence) -- the lean call; got: ${a.variant}`);
  assert.strictEqual(b.variant, VARIANT_B,
    `the fallback after || must be variant B, the ticket's measured call; got: ${b.variant}`);
  assert.strictEqual(a.filter, b.filter, "both halves must pipe into the SAME filter text, or A and B write different readings");
}

export function gradePrompt(prompt) {
  assert.ok(prompt.includes(SELF_READ_COMMAND),
    `${PROMPT_REL} must carry the self-read command byte-identical to SELF_READ_COMMAND -- the routine runs the block's copy`);
  assert.ok(/act on the LAST line/.test(prompt), `${PROMPT_REL} must tell the cycle to act on the LAST line the command prints (A's NO_READING precedes B's line)`);
  assert.ok(/METER SELF-READ: /.test(prompt) && /never type a number/.test(prompt),
    `${PROMPT_REL} must route a NO_READING line to METER SELF-READ: in the cycle row and forbid typing a number`);
}

export function gradeFilter(filter) {
  assert.ok(!filter.includes("'"), "the filter must carry no single quote -- it is one single-quoted bash word");
  const want = [
    ["F1 Fable call", F1, 0, F1_INSERT],
    ["F2 Opus call", F2, 0, F2_INSERT],
    ["F3 F1 minus every unifiedWindows", F3, 1, "NO_READING no_unified_windows"],
    ["F4 empty stdin", F4, 1, "NO_READING no_output"],
    ["F5 real Fable 400", F5, 1, "NO_READING no_rate_limit_event"],
    ["F1 behind a non-JSON line", "not json\n" + F1, 0, F1_INSERT],
  ];
  const seen = [];
  for (const [label, input, status, line] of want) {
    const r = runFilter(filter, input);
    assert.strictEqual(r.printed.length, 1, `${label}: the filter must print exactly ONE line, printed ${r.printed.length}: ${JSON.stringify(r.printed)} ${r.stderr.slice(0, 300)}`);
    assert.strictEqual(r.last, line, `${label}: printed ${JSON.stringify(r.last)}, expected ${JSON.stringify(line)}`);
    assert.strictEqual(r.status, status, `${label}: exit ${r.status}, expected ${status} -- the || fallback to variant B keys on it`);
    seen.push(`${label.split(" ")[0]} exit ${r.status} ${line.startsWith("INSERT") ? line.match(/'adhoc', ([^,]+), ([^,]+), ([^,]+),/).slice(1).join("/") : line}`);
  }
  return seen;
}

function everyClauseHasTeeth(prompt, filter) {
  // The fixtures differ where they claim to.
  assert.ok(F1.includes("unifiedWindows") && !F3.includes("unifiedWindows") && F3.includes("rate_limit_event"),
    "control: F3 must be F1 with its rate_limit_event lines kept and every unifiedWindows removed");
  // 1e4 -> 1e2: the kickoff's named control. 63 / 5 / 94 become 0.63 / 0.05 / 0.94.
  const scaled = filter.replace("1e4", "1e2");
  assert.notStrictEqual(scaled, filter, "control 1e4 -> 1e2 changed nothing (the SES-158 failure)");
  assert.throws(() => gradeFilter(scaled), "control: a filter scaling by 1e2 still produced the F1 INSERT");
  // A NO_READING that exits 0 would stop bash from ever reaching variant B.
  const noFallback = filter.replace("process.exitCode=1", "process.exitCode=0");
  assert.notStrictEqual(noFallback, filter, "control exit-1 -> exit-0 changed nothing (the SES-158 failure)");
  assert.throws(() => gradeFilter(noFallback), "control: a filter exiting 0 on NO_READING still passed");
  // Order and sameness of the two halves.
  assert.throws(() => gradeCommand(`${piped(VARIANT_B)} || ${piped(VARIANT_A)}`), "control: B before A still passed");
  assert.throws(() => gradeCommand(`${piped(VARIANT_A)} || ${piped(VARIANT_B, scaled)}`), "control: two different filters still passed");
  assert.throws(() => gradeCommand(piped(VARIANT_A)), "control: a command with no fallback still passed");
  // The prompt must carry THIS command, not a near copy.
  const drifted = prompt.split("1e4").join("1e2");
  assert.notStrictEqual(drifted, prompt, "control for the byte-identical prompt copy changed nothing");
  assert.throws(() => gradePrompt(drifted), "control: a prompt whose copy of the filter drifted by one byte still passed");
  assert.throws(() => gradePrompt(prompt.replace("act on the LAST line", "act on the first line")), "control: last-line clause");
}

export function run() {
  const prompt = readPrompt(fs.readFileSync(path.join(ROOT, PROMPT_REL), "utf8"));
  gradePrompt(prompt);
  const at = prompt.indexOf(SELF_READ_COMMAND);
  const shipped = prompt.slice(at, at + SELF_READ_COMMAND.length);
  gradeCommand(shipped);
  const filter = commandHalves(shipped)[0].filter;
  const seen = gradeFilter(filter);
  everyClauseHasTeeth(prompt, filter);
  console.log("  [PASS] ses-398-meter-self-read.test.mjs");
  console.log(`         command ${shipped.length} chars in the prompt block (A then B, one ${filter.length}-char filter); ${seen.join("; ")}`);
}

selfRun(import.meta.url, run);
export default run;
