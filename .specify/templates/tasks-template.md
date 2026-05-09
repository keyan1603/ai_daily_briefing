# ✅ Task Breakdown — [Feature Name] (NNN-feature-slug)

> Generated from `plan.md` · Each task maps to a user story in `spec.md`  
> `[P]` = can run in parallel with other `[P]` tasks in the same phase  
> `[→ filename]` = primary file(s) affected

---

## Phase 1 — [Phase Name]

_Dependency: [none / list prerequisite phases or tasks]_

- [ ] **T-01** · [Task description — what to build, not how]  
  `[→ path/to/file.ts]`

- [ ] **T-02** · [Task description]  
  `[→ path/to/file.ts]`

**Checkpoint [1]:** [Verifiable outcome — a command output, a UI state, a passing test]

---

## Phase 2 — [Phase Name]

_Dependency: Phase 1 complete_

- [ ] **T-03** `[P]` · [Task — can run in parallel]  
  `[→ path/to/file.ts]`

- [ ] **T-04** `[P]` · [Task — can run in parallel]  
  `[→ path/to/other-file.ts]`

- [ ] **T-05** · [Task — must run after T-03 and T-04]  
  `[→ path/to/file.ts]`

**Checkpoint [2]:** [Verifiable outcome]

---

<!-- Add more phases as needed. Mirror the phases in plan.md exactly. -->

---

## Task Summary

| Phase | Tasks | Notes |
|---|---|---|
| 1 — [Name] | T-01 → T-02 | Sequential |
| 2 — [Name] | T-03 → T-05 | T-03 and T-04 are parallel |
| **Total** | **N tasks** | |

---

<!--
  GUIDELINES FOR WRITING TASKS

  Good task:
    T-12 · Implement parseJSON<T>(text, fallback): strip markdown fences, find JSON bounds, safe JSON.parse; return fallback on any error
    [→ lib/anthropic.ts]

  Bad task (too vague):
    T-12 · Add JSON parsing

  Each task should:
  - Be completable in < 2 hours of focused work
  - Reference the specific file(s) it touches
  - Describe WHAT to build (observable behaviour), not HOW (implementation details)
  - Have a natural dependency order — later tasks must not require files that earlier tasks haven't created
  - Parallel tasks [P] must not write to the same file
-->
