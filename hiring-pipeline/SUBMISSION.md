# Submission

Fill this in and commit it. This is the first file we open.

## Links

- **GitHub repository:** [<public repo URL>](https://github.com/bhagya0705/hiring-pipeline)
- **Live application:** [<deployed URL>](https://hiring-pipeline-nine.vercel.app/)

## Notes for the reviewer

The application uses PostgreSQL hosted on Neon. If the deployment or database provider has a cold start or idle wake-up delay, the first request may take longer than subsequent requests.

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Recruiter | recruiter@example.com | recruiter123 |
| Interviewer | interviewer1@example.com | interviewer123 |
| Interviewer | interviewer2@example.com | interviewer123 |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | Next.js, TypeScript, Tailwind CSS | Provides the UI in the same application as the backend and reduces setup/deployment overhead. |
| Backend | Next.js Route Handlers | Keeps authentication, authorization, validation, and business logic on the server within the same Next.js project. |
| Database | PostgreSQL (Neon) with `pg` | Provides relational data integrity and direct SQL access with a simple database layer. |
| Hosting | Vercel | Used for deploying the Next.js application. |

## Goal checklist

Mark each honestly. Partial is fine — say what is partial.

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | Done | Recruiter and interviewer roles are implemented with server-side authorization. |
| 2 | Job openings | Done | Jobs can be created, edited, archived, restored, and viewed without deleting applications. |
| 3 | Applications | Done | Applications support candidate information, source, notes, editing, and viewing applications for a job opening. |
| 4 | Pipeline | Done | Applied → Screening → Interview → Offer → Hired is enforced server-side. Rejection and exact-stage reinstatement are supported. |
| 5 | Interview panel | Done | Multiple interviewers can be assigned to applications, and interviewers can view applications assigned to them. |
| 6 | Search, filter, sort, pagination | Done | Application search, filtering, sorting, pagination, and total-match counts are handled server-side. |
| 7 | Bulk actions and CSV export | Done | Bulk advance/reject provides per-application results, and open applications can be exported as CSV. |
| 8 | Dashboard | Done | Includes open positions, active applications, interviews this week, hires this month, job/stage breakdowns, and weekly application statistics. |
| 9 | Immutable application timeline | Done | Application events record creation, stage changes, rejection/reinstatement, interviewer activity, interviews, and feedback. |
| 10 | Stalled alerts | Done | Applications stalled in a stage for more than 10 days can be surfaced as alerts, dismissed by recruiters, and become eligible again after entering and stalling in a new stage. |

## How much time did you actually spend?

The assignment was completed within the approximately 12-hour time limit.

I did not track exact time spent for each individual session, so I am not providing made-up hour-by-hour figures.

## What would you do next, with another 12 hours?

With another 12 hours, I would focus mainly on improving the maintainability and polish of the existing application rather than adding major new functionality.

I would:

- Refactor the larger frontend components into smaller, focused components where it improves readability.
- Improve shared TypeScript types and reduce unnecessary duplication.
- Review API error handling and loading states across the application.
- Add more automated tests for important server-side business rules and edge cases.
- Improve the UI polish and responsive behavior.
- Review database queries and indexes using realistic larger datasets.
- Improve deployment and production monitoring where useful.

## What are you least happy with in this codebase, and why?

The main area I am least happy with is the size and complexity of some frontend components, particularly the application detail page. It contains several related workflows such as pipeline actions, interviewer assignment, interviews, feedback, editing, rejection/reinstatement, and the timeline.

The functionality is implemented and working, but some of this code could be structured more cleanly into focused components and reusable logic. I would prioritize this refactoring next because it would make the code easier for another developer to understand and maintain without changing the application's behavior.