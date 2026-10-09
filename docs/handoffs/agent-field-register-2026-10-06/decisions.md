# The register: your decisions and notes, 2026-10-06

Generated from `snapshot.json`. One row per register row that has a decision or a note from John. The full register, with the evidence columns, is in `snapshot.json`.

## Counts by decision

| Decision | Rows |
|---|---|
| Move to Future View | 28 |
| Discuss | 15 |
| Add an editor | 15 |
| Add to AI client | 8 |
| Hide from AI client | 7 |
| Remove from page | 6 |
| System should update | 4 |
| AI Client can update | 2 |
| Add to Personnel page | 1 |

## Rows with a note from John

| Row | Field | Note |
|---|---|---|
| f01-id | id | Let's discuss the id vs the name vs mcp components |
| f02-name | name | Need to understand the reprcussions of changing names, what it does to the mcp connection and how the ai client knows to call access edit if name changes |
| f05-bio | bio | let's discuss the origin and allowing the user to see and where to put it |
| f18-no_inference | no_inference | don't understand this purpose |
| f20-code | code | What does this mean? ID? |
| f43-capabilities | capability list (suggested) | let's discuss this one, one on one, i want to know, is this showing all the cababilities assigned in the database with its associated skillsets. Can we make this an editable function, perhaps its own page, that allows a user to type in its skill and skill types. Allow the user to edit the capability and its defintion. Its my understanding this is passed to teh AI client as individual tools, and want to get this locked down. Also understand how an AI client can update these. Need to think through this one. |
| f44-edit-identity | editor for role, specialty, bio (suggested) | is this overlap with the other identity fields marked needing an editor |
| f47-out-of-scope | out-of-scope statement (suggested) | let's understand what this means vs guardrails vs playbook vs trained |
| p02-trainee-badge | YOUR TRAINEE badge | System should update its status. |
| p12-skill-hover | Skill hover card | lets discuss duplication and purpose |
| p15-intel-config | Intelligence Configuration strip | what does it mean it is duplicated, where and does it serve different purposes or confuses |
| p58-how-it-works | How Background Knowledge Works, Layer 02 | Let's discuss the accuracy of this information |

## Every decided row

| Row | Field | Group | View | Updated | Reviewed | Decision |
|---|---|---|---|---|---|---|
| f01-id | id | Identity | All tabs (header) | Never: set once | Complete | Discuss |
| f02-name | name | Identity | All tabs (header), Profile (home) | Never: set once | Complete | Add an editor, Discuss |
| f03-role | role | Identity | Profile (home) | Never: placeholder | Complete | Add an editor |
| f04-specialty | specialty | Identity | Resume | Never: placeholder | Complete | Add an editor |
| f05-bio | bio | Identity | Not on page | Never: placeholder | Complete | AI Client can update, Add an editor, Discuss |
| f14-library_catalog | library.catalog | Library and data rooms | Not on page | System | Complete | Move to Future View, Hide from AI client |
| f15-library_records | library.records | Library and data rooms | Not on page | System | Complete | Move to Future View, Hide from AI client |
| f16-library_tier | library.tier | Library and data rooms | Not on page | System | Complete | Move to Future View, Hide from AI client |
| f17-data_room_access | data_room_access | Library and data rooms | Not on page | Never: placeholder | Complete | Move to Future View, Hide from AI client |
| f18-no_inference | no_inference | Handover markers | Not on page | Never: hardcoded | Complete | Hide from AI client, Discuss |
| f19-architecture | architecture | Identity | Resume | Never: placeholder | Complete | Move to Future View |
| f20-code | code | Identity | All tabs (header), Profile (home) | Never: placeholder | Complete | Discuss |
| f21-hourly_rate | hourly_rate | Business and pay | Profile (home) | Never: placeholder | Complete | Move to Future View |
| f22-report_cost | report_cost (also base_ and current_) | Business and pay | Profile (home) | Never: placeholder | Complete | Move to Future View |
| f23-report_hours | report_hours | Business and pay | Profile (home) | Never: placeholder | Complete | Move to Future View |
| f24-revenue_model | revenue_model | Business and pay | Profile (home) | Never: placeholder | Complete | Move to Future View |
| f25-salary | salary (also yearly_value) | Business and pay | Profile (home) | Never: placeholder | Complete | Move to Future View |
| f26-situational_awareness | situational_awareness | Scores and readiness | Profile (home) | Never: placeholder | Complete | Move to Future View |
| f27-skill_score | skill_score | Scores and readiness | Profile (home), Resume | Never: placeholder | Complete | Add an editor, Discuss |
| f28-trainer_org | trainer_org | Access and status | Resume | Never: placeholder | Complete | Move to Future View |
| f29-rating | rating | Scores and readiness | Not on page | Never: placeholder | Complete | Move to Future View |
| f30-usage_count | usage_count | Activity and usage | Not on page | Never: placeholder | Complete | System should update, Add to Personnel page |
| f35-visibility | visibility | Access and status | Resume | Never: placeholder | Complete | Add an editor |
| f36-update_cadence | update_cadence | Access and status | Resume | Never: placeholder | Complete | System should update |
| f37-label-update-rights | Update Rights label | Access and status | Resume | Never: hardcoded | Complete | Add an editor, Discuss |
| f38-label-readiness | L1 to L5 readiness scores | Scores and readiness | Profile (home) | System | Complete | Move to Future View |
| f39-label-tasks | Tasks list | Work assignments | Profile (home) | Never: hardcoded | Complete | Move to Future View |
| f40-label-roster | quip, classes, docs, chunks | Identity | Profile (home) | Never: hardcoded | Complete | Move to Future View |
| f41-voice | voice (suggested) | Skills and capabilities | Not on page | Not built | Complete | Add to AI client, Add an editor |
| f42-origin-date | teaching origin and date (check) | Training content | Not on page | System | Complete | Move to Future View |
| f43-capabilities | capability list (suggested) | Skills and capabilities | Profile (home) | Not built | Complete | Add to AI client, Add an editor, Discuss |
| f44-edit-identity | editor for role, specialty, bio (suggested) | Identity | Not on page | Not built | Complete | Add an editor, Discuss |
| f45-real-labels | real data for cadence and visibility (suggested) | Access and status | Resume | Not built | Complete | Move to Future View |
| f47-out-of-scope | out-of-scope statement (suggested) | Rules and behavior | Not on page | Not built | Complete | Add to AI client, Add an editor, Discuss |
| john-01 | new field 1 | Added by John |  |  | Complete | Remove from page |
| john-02 | new field 2 | Added by John |  |  | Complete | Remove from page |
| john-03 | new field 3 | Added by John |  |  | Complete | Remove from page |
| john-04 | new field 4 | Added by John |  |  | Complete | Remove from page |
| john-05 | new field 5 | Added by John |  |  | Complete | Remove from page |
| p01-active-badge | ACTIVE badge | Page text | All tabs (header), Profile (home) | Never: hardcoded | Complete | Remove from page |
| p02-trainee-badge | YOUR TRAINEE badge | Access and status | All tabs (header), Profile (home) | Never: hardcoded | Complete | System should update, Add an editor |
| p10-bureau-heading | Bureau of Procurement Intelligence heading | Page text | Profile (home) | Never: hardcoded | Complete | Add to AI client, Add an editor |
| p11-capabilities-card | Capabilities card | Skills and capabilities | Profile (home) | System | Complete | AI Client can update, Add an editor |
| p12-skill-hover | Skill hover card | Skills and capabilities | Profile (home) | System | Complete | Discuss |
| p13-compensation-note | Compensation card footer | Page text | Profile (home) | Never: hardcoded | Complete | Move to Future View |
| p14-readiness-score | Agent Readiness Score | Scores and readiness | Profile (home) | System | Complete | Move to Future View |
| p15-intel-config | Intelligence Configuration strip | Scores and readiness | Profile (home) | System | Complete | Discuss |
| p16-quick-skill | Quick Stats: Skill | Scores and readiness | Profile (home) | Never: placeholder | Complete | Move to Future View |
| p17-quick-docs | Quick Stats: Documents | Training content | Profile (home) | Never: hardcoded | Complete | System should update, Discuss |
| p18-quick-reports | Quick Stats: Reports Run | Activity and usage | Profile (home) | Never: hardcoded | Complete | Move to Future View |
| p19-quick-awareness | Quick Stats: Situational Awareness | Scores and readiness | Profile (home) | Never: placeholder | Complete | Move to Future View |
| p20-skill-level-bar | Skill Level bar | Scores and readiness | Profile (home) | Never: placeholder | Complete | Move to Future View |
| p21-report-card | Report Card | Scores and readiness | Profile (home) | System | Complete | Move to Future View |
| p22-active-work | Active Work Assignments | Work assignments | Profile (home) | Never: hardcoded | Complete | Move to Future View |
| p24-recently-completed | Recently Completed list and View button | Work assignments | Profile (home) | Never: hardcoded | Complete | Move to Future View |
| p30-resume-vitals | Resume Vitals card | Identity | Resume | Never: hardcoded | Complete | Move to Future View |
| p31-skill-ladder | Skill Ladder | Scores and readiness | Resume | Never: hardcoded | Complete | Add an editor, Discuss |
| p47-entry-jurisdiction | Jurisdiction | Training content | Training | User |  | Add to AI client |
| p48-entry-priority | Priority (0 to 100) | Training content | Training | User |  | Add to AI client |
| p49-entry-triggers | Triggers (flag list) | Training content | Training | User |  | Add to AI client |
| p50-entry-status | Status: Active or Disabled | Training content | Training | User | Complete | Hide from AI client |
| p52-entry-chips | Kind and reach chips | Training content | Training | System | Complete | Hide from AI client |
| p54-what-learned | What <name> Learned | Training content | Training | System |  | Add to AI client |
| p58-how-it-works | How Background Knowledge Works, Layer 02 | Page text | Training | Never: hardcoded | Complete | Discuss |
