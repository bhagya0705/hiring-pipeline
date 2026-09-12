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

- **Chose:** Use PostgreSQL with the `pg` package for database access.

- **Rejected:** Prisma ORM.

- **Why:** Prisma was initially chosen because it provides type-safe database access and simplifies working with a relational schema. During implementation, the setup and migration workflow added unnecessary complexity for this assignment. Switching to `pg` gave direct SQL control and a smaller database layer, which was faster to work with while keeping PostgreSQL's constraints and relationships in the database.

- **Later reversed:** The original decision was to use Prisma. This was later reversed to `pg` after working through the initial database setup and deciding that direct PostgreSQL access was a better fit for the time-constrained implementation.

## Decision 4

- **Chose:** Represent the hiring pipeline using explicit database stages (`APPLIED`, `SCREENING`, `INTERVIEW`, `OFFER`, `HIRED`, and `REJECTED`) and enforce valid transitions on the server.

- **Rejected:** Allow the client to submit arbitrary stage values and rely on the frontend to prevent invalid transitions.

- **Why:** Pipeline rules are business rules and cannot safely depend on the UI. The server therefore validates that an application moves only one stage forward at a time, handles rejection from any stage, and restores a rejected application to its exact previous stage.

## Decision 5

- **Chose:** Store application history as append-only events in a separate `application_events` table.

- **Rejected:** Store only the application's current state or allow previous timeline entries to be edited when the application changes.

- **Why:** The assignment requires an immutable application timeline showing important actions and who performed them. Keeping events as separate records preserves the history of stage changes, rejection/reinstatement, interviewer assignments, interviews, and feedback without allowing past events to be overwritten.