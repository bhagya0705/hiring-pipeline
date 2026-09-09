# Decisions

Log the decisions that actually shaped this codebase — the ones where a real alternative existed and
you picked one. At least five entries. For each: what you chose, what you rejected, and why. At least
one entry must be a decision you later reversed — say what changed your mind. It can be any entry
below, not necessarily the last one; add a **Later reversed:** line to whichever one it is.

## Decision 1

- **Chose:** Next.js with TypeScript as a full-stack application, using Next.js Route Handlers for the backend/API.
- **Rejected:** React/Vite for the frontend with a separate Express backend.
- **Why:** The assignment has a short time limit, so using Next.js allows the frontend and backend to live in one project and be deployed as a single application. It also reduces setup and deployment overhead while still allowing server-side authorization and business logic.

## Decision 2

- **Chose:** Use a separate `candidates` table and reference candidates from applications using `candidate_id`.
- **Rejected:** Store the candidate's name and email directly in the `applications` table.
- **Why:** The same candidate may apply to multiple job openings. Keeping candidate information separate avoids unnecessarily duplicating the candidate's identity and allows multiple applications to belong to the same candidate.


## Decision 3

- **Chose:**
- **Rejected:**
- **Why:**

## Decision 4

- **Chose:**
- **Rejected:**
- **Why:**

## Decision 5

- **Chose:**
- **Rejected:**
- **Why:**
