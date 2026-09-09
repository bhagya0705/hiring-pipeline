# Plan

## How did you break the work into sessions?

I broke the work into small sessions so that the core requirements are implemented first and there is time for testing and documentation.

### Session 1 — Planning and database design
- Understand the assignment requirements.
- Decide the application architecture and technology stack.
- Design the database tables and relationships.
- Define the main business rules such as pipeline transitions, rejection/reinstatement, interviewer assignments, and stalled applications.

### Session 2 — Project setup and authentication
- Set up the Next.js project with TypeScript and Tailwind CSS.
- Set up Prisma and PostgreSQL.
- Implement user authentication.
- Implement recruiter and interviewer roles with server-side authorization.

### Session 3 — Core hiring workflow
- Implement job openings.
- Implement candidates and applications.
- Implement the application pipeline.
- Implement valid stage transitions, rejection, and reinstatement.
- Add immutable application timeline events.

### Session 4 — Interview workflow
- Implement interviewer assignment.
- Implement interview scheduling.
- Implement interviewer feedback.
- Ensure interviewers can only access applications assigned to them.

### Session 5 — Application management
- Implement server-side search, filtering, sorting, and pagination.
- Implement bulk advance/reject operations.
- Implement CSV export.

### Session 6 — Dashboard and alerts
- Implement dashboard metrics and breakdowns.
- Implement weekly application statistics.
- Implement stalled application detection and recruiter dismissal of alerts.

### Session 7 — Testing, seed data, and deployment
- Test the main workflows and server-side authorization.
- Add realistic demo/seed data.
- Fix bugs and improve the UI.
- Deploy the application.
- Complete the submission documentation.

---

## What order did you build in, and why that order?

I planned to build from the foundation toward the features that depend on it.

1. **Project setup and database** — The rest of the application depends on the database structure and project architecture.
2. **Authentication and roles** — Access control needs to exist before implementing recruiter/interviewer-specific functionality.
3. **Jobs, candidates, and applications** — These are the core entities of the hiring system.
4. **Pipeline and application timeline** — The main hiring workflow depends on applications being available first.
5. **Interviewers, interviews, and feedback** — These features operate on existing applications and users.
6. **Search, filtering, pagination, bulk actions, and CSV export** — These are application-management features built on top of the core workflow.
7. **Dashboard and stalled alerts** — These depend on application, interview, stage, and event data already existing.
8. **Testing, seed data, and deployment** — These are done after the main functionality is complete so the complete workflow can be tested.

This order reduces dependencies and allows the core hiring workflow to be completed before spending time on secondary features.

## What did you estimate versus what it actually took?
## What did you cut when you ran short?