# Plan

## How did you break the work into sessions?

I broke the work into small sessions, focusing first on the application foundation and required backend functionality, then building the frontend, testing, and deployment around the completed APIs.

### Session 1 — Planning and database design

- Understand the assignment requirements.
- Decide the application architecture and technology stack.
- Design the database tables and relationships.
- Define the main business rules such as pipeline transitions, rejection/reinstatement, interviewer assignments, feedback, timeline events, and stalled applications.

### Session 2 — Project setup and authentication

- Set up the Next.js project with TypeScript and Tailwind CSS.
- Set up PostgreSQL/Neon and the database schema.
- Initially evaluated Prisma for database access, but later switched to the `pg` package to keep the database layer simpler and more direct.
- Implement user authentication.
- Implement recruiter and interviewer roles with server-side authorization.

### Session 3 — Core hiring workflow

- Implement job openings.
- Implement candidates and applications.
- Implement application editing.
- Implement the hiring pipeline.
- Enforce valid stage transitions on the server.
- Implement rejection and exact-stage reinstatement.
- Record immutable application timeline events.

### Session 4 — Interview workflow

- Implement interviewer assignment.
- Implement interview scheduling and rescheduling.
- Implement interviewer feedback.
- Restrict interviewer access to applications assigned to them.

### Session 5 — Application management

- Implement server-side search, filtering, sorting, and pagination.
- Implement bulk advance/reject operations with per-application results.
- Implement CSV export of open applications.

### Session 6 — Dashboard and alerts

- Implement dashboard summary metrics.
- Implement job/stage breakdowns.
- Implement weekly application statistics.
- Implement stalled application detection.
- Implement recruiter dismissal of stalled alerts.
- Verify that an application can become eligible for a new stalled alert after moving to a new stage.

### Session 7 — Frontend implementation and integration

- Build the frontend around the completed backend APIs.
- Connect the UI to authentication, jobs, applications, pipeline, interview, dashboard, and alert APIs.
- Implement role-aware UI behavior while keeping server-side authorization as the source of access control.
- Add application search, filters, pagination, bulk actions, CSV export, and application detail workflows.
- Add job creation, editing, archiving, and restoration interfaces.

### Session 8 — Final testing, review, and deployment

- Verify seed data and demo credentials.
- Perform final end-to-end testing of the required workflows.
- Review server-side authorization and important edge cases.
- Review the codebase for readability and maintainability.
- Deploy the application.
- Update the final submission documentation with the live URL, credentials, checklist, and final reflection.

---

## What order did you build in, and why that order?

I built from the foundation toward features that depend on it.

1. **Project setup and database** — The rest of the application depends on the project structure and database model.

2. **Authentication and roles** — Access control needs to exist before implementing recruiter/interviewer-specific functionality.

3. **Jobs, candidates, and applications** — These are the core entities of the hiring system.

4. **Pipeline and timeline** — The hiring workflow and history depend on applications existing first.

5. **Interviewers, interviews, and feedback** — These features operate on existing applications and users.

6. **Search, filtering, pagination, bulk actions, and CSV export** — These are application-management features built on top of the core workflow.

7. **Dashboard and stalled alerts** — These depend on application, stage, interview, and event data.

8. **Frontend and integration** — The frontend was built around the completed backend API contracts and business rules, allowing the UI to use the actual implemented workflows.

9. **Testing and deployment** — Final testing and deployment are performed after the application functionality and documentation are ready.

This order reduced dependencies and allowed the core backend business rules to be established before the frontend was connected to them.

## What did you estimate versus what it actually took?

The assignment was planned around the available time limit of approximately 12 hours.

I did not track exact time spent for every individual session, so I am not recording made-up hour estimates. The implementation has remained within the planned time limit, although the order and focus of some sessions changed as development progressed.

Some areas required more attention than initially expected, particularly:

- server-side authorization for different roles,
- strict pipeline transition rules,
- rejection and exact-stage reinstatement,
- immutable application events,
- interviewer-specific visibility,
- bulk operation results,
- dashboard aggregation,
- and stage-specific stalled-alert dismissal/re-alert behavior.

The implementation plan also changed when the initial Prisma database approach was replaced with direct PostgreSQL access using `pg`. This simplified the database layer and allowed development to continue efficiently within the available time.

## What did you cut when you ran short?

I prioritized the ten required assignment goals over optional or non-essential functionality.

Features such as email notifications, external calendar integrations, advanced analytics, and other integrations were not included because they were not required for the core assignment.