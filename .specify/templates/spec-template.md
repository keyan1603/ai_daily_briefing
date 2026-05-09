# 📋 Feature Spec — [Feature Name]

> **Spec-Driven Development artifact** · Branch: `NNN-feature-slug`  
> **Status:** Draft | In Review | Approved  
> **Tech stack guidance:** Deferred to `/speckit.plan` phase

---

## Overview

_2–3 sentences. What is this feature? Who is it for? What core problem does it solve?_

---

## Problem Statement

_Why does this need to exist? What friction or gap does it address? Keep to 1 paragraph._

---

## User Stories

<!--
  One section per user story. Use the format:
    US-NN — Short Title
  Each story should be independently valuable and testable.
  Acceptance criteria use [ ] checkboxes — these are checked off during implementation review.
-->

### US-01 — [Story Title]

**As a** [type of user],  
**I want to** [goal or action],  
**So that** [benefit or outcome].

**Acceptance Criteria:**
- [ ] [Criterion 1 — observable, testable]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

---

### US-02 — [Story Title]

**As a** [type of user],  
**I want to** [goal or action],  
**So that** [benefit or outcome].

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]

---

<!-- Add more US-NN sections as needed -->

---

## Data Model Summary

_List key entities and their core fields. Full detail goes in `data-model.md`._

| Entity | Key Fields |
|---|---|
| `EntityName` | field1, field2, field3 |

---

## External Dependencies

| Dependency | Purpose | Key Required | Free Tier |
|---|---|---|---|
| [Service name] | [What it provides] | ✅ / ❌ | [Limit or N/A] |

---

## Out of Scope (this version)

- [Thing that will not be built now]
- [Thing deferred to a future spec]

---

## Review & Acceptance Checklist

- [ ] All user stories have defined, testable acceptance criteria
- [ ] Every failure path has a documented fallback or error state
- [ ] External dependencies are listed with key requirements
- [ ] Out-of-scope items are explicitly listed
- [ ] Data model covers all fields referenced in acceptance criteria
- [ ] No hardcoded secrets appear anywhere in this spec
