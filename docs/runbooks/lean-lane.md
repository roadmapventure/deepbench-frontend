# The lean lane -- a code session from your phone (AGT-464, v7.0.963)

One paste opens, one paste closes. This lane holds NO service key: the scripts take `SUPABASE_URL` +
`SUPABASE_LEAN_KEY` from the cloud environment's settings, call four narrow database functions
(`lean_claim_ticket`, `lean_release_claim`, `lean_claim_version`, `lean_file_ticket`) and nothing else,
and exit 2 `no-credentials` without a key -- so a session that lacks the key cannot quietly hand-compose
its way past the pipeline (that is what the five AGT-348 builds did).

## The one-paste template

    Lean lane (docs/runbooks/lean-lane.md). Ticket <ID>. Session name <n>.
    0. node scripts/check-deploy-current.js   -- exit 2 cannot-run here (no VERCEL_TOKEN): then
       curl -sI https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app | head -1
       and WRITE "deploy currency not checkable from this session" if that is the truth. Never imply a check you did not run.
    1. node scripts/open-session.js --name=<n> --ticket=<ID> --version     -- claims the ticket and the version; exit 3 = held, take the next ticket
    2. Read the kickoff for <ID>. If there is none: STOP -- no src/ or api/ write without a kickoff.
    3. Build it as written? (y/n)
    4. node scripts/close-session.js --name=<n> --ticket=<ID> --dry-run      -- gates named, claim re-asserted
    5. Push HEAD:dev now? (y/n)   -- y: node scripts/close-session.js --name=<n> --ticket=<ID>
    6. Ticket done, or delivered pending verifier? (done/delivered)   -- "done" only with a verifier row (ses-311)
    To file a ticket from the phone: node scripts/open-session.js --name=<n> --ticket=<ID> --file="<PREFIX>|<P-class>|<title>|<why it belongs>"

## What the lane may NOT do

- No `src/` or `api/` write without a kickoff doc; no `done` without a verifier row; no `dev -> main`.
- No service key, ever. If a step seems to need one, the step is wrong for this lane -- file it.
- The lean key lives in the cloud environment's settings and in `runner_secrets` by name, never in `.env.local`,
  never in a file in the repo, never printed.
- The `--ids=` block claim (N > 1 rows) stays the connector's SQL (`docs/runbooks/session-setup.md` §3b); this lane files one ticket per call.

## John's one chore (once; the build cannot do it -- the JWT secret lives only in the dashboard)

1. Supabase dashboard > Project Settings > API > JWT Settings > copy the JWT Secret.
2. On any machine with Node, paste (the token prints; nothing else):

       JWT_SECRET=<the secret> node -e 'const c=require("crypto");const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");const t=Math.floor(Date.now()/1e3);const h=b({alg:"HS256",typ:"JWT"}),p=b({role:"lean_lane",iss:"supabase",iat:t,exp:t+31536000});console.log(h+"."+p+"."+c.createHmac("sha256",process.env.JWT_SECRET).update(h+"."+p).digest("base64url"))'

3. Cloud environment (claude.ai/code, the environment menu in the session's title bar > Edit): add `SUPABASE_URL`
   and the printed token as `SUPABASE_LEAN_KEY`. A new session picks them up.
4. `runner_secrets`: insert the same token under the name `SUPABASE_LEAN_KEY`, so the record of what exists is complete.

Rotate: mint again, replace in both places. Revoke everything at once: `revoke lean_lane from authenticator;`.
The key expires after 365 days. If the project's legacy HS256 keys are ever disabled in the dashboard, this token
stops verifying -- `docs/harvests/AGT-464.md` §3(4) names the fallback.
