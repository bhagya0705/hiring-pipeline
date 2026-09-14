# Hiring Pipeline

A full-stack hiring pipeline application built with **Next.js, TypeScript, Tailwind CSS, and PostgreSQL**. It supports recruiter and interviewer workflows, application tracking, interview management, bulk actions, reporting, immutable timelines, and stalled-application alerts.

## Features

- **Authentication & role-based access**
  - Recruiter and interviewer roles
  - Server-side authorization for protected operations
  - HTTP-only session cookie authentication

- **Job openings**
  - Create and edit job openings
  - Open / archive / restore positions
  - View applications belonging to a job

- **Applications**
  - Create and edit candidate applications
  - Candidate name, email, source, and notes
  - Server-side search, filtering, sorting, and pagination
  - Total matching application count

- **Hiring pipeline**
  - Applied → Screening → Interview → Offer → Hired
  - Reject an application from any stage
  - Reinstate a rejected application to its exact previous stage
  - Server-side validation prevents illegal stage jumps

- **Interview management**
  - Assign multiple interviewers to an application
  - Interviewers can be assigned to multiple applications
  - Schedule and reschedule interviews
  - Interviewer feedback with rating and comments
  - Interviewers can view their assigned applications

- **Bulk operations**
  - Select multiple candidates
  - Bulk advance or reject applications
  - Per-application success/refusal results with reasons

- **CSV export**
  - Export open applications with their current pipeline stage

- **Recruiter dashboard**
  - Open positions
  - Active applications
  - Interviews scheduled this week
  - Hires this month
  - Job/stage breakdown
  - Weekly applications over the last quarter

- **Immutable application timeline**
  - Application creation
  - Stage changes
  - Rejections and reinstatements
  - Interviewer feedback
  - Actor and timestamp recorded for events

- **Stalled application alerts**
  - Applications remaining in the same stage for more than 10 days
  - Recruiters can dismiss individual alerts
  - Alerts can reappear when an application advances and later stalls again

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | Next.js Route Handlers |
| Database | PostgreSQL |
| Database provider | Neon |
| Database client | `pg` |
| Hosting | Vercel |
| Authentication | HTTP-only session cookie |

## Architecture

The application uses a full-stack Next.js architecture:

```text
Browser
   │
   ▼
Next.js UI
   │
   ▼
Route Handlers
   │
   ├── Authentication
   ├── Role authorization
   ├── Validation
   └── Business rules
   │
   ▼
PostgreSQL (Neon)
```

Business rules such as role restrictions and pipeline transitions are enforced on the server rather than relying only on the UI.

For more detail, see:

- `docs/architecture.md`
- `docs/decisions.md`
- `docs/plan.md`
- `docs/schema.md`
- `docs/ai-prompts.md`

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL database (Neon can be used)

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd hiring-pipeline
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file:

```env
DATABASE_URL=your_postgresql_connection_string
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
```

`DATABASE_URL` must be kept secret and should never be committed to Git.

### 4. Set up the database

Run the SQL schema/setup scripts included in the repository according to `docs/schema.md`.

If seed data is available in the project, run the corresponding seed script to create the demo users and sample hiring data.

### 5. Start the development server

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

## Demo Accounts

The application includes demo accounts for testing the different roles.

| Role | Email | Password |
|---|---|---|
| Recruiter | `recruiter@example.com` | `recruiter123` |
| Interviewer | `interviewer1@example.com` | `interviewer123` |
| Interviewer 2 | `interviewer2@example.com` | `interviewer123` |

The recruiter account can access recruiter-only functionality such as job mutations, dashboard data, and stalled-alert dismissal.

Interviewers can access applications assigned to them and perform interviewer-specific actions such as providing feedback.

## Production Demo

**Live application:**  
https://hiring-pipeline-nine.vercel.app

The production deployment uses Vercel for hosting and Neon PostgreSQL for the database.

## API Overview

The backend is implemented using Next.js Route Handlers under `app/api`.

Major API areas include:

```text
/api/auth/*
/api/jobs/*
/api/applications/*
/api/dashboard
/api/stalled-alerts/*
```

The application API supports authentication, job management, application CRUD, pipeline transitions, interviewer assignment, interview scheduling, feedback, timelines, bulk operations, dashboard metrics, stalled alerts, and CSV export.

## Security & Authorization

Authorization is enforced server-side.

Examples:

- Recruiter-only operations cannot be performed by an interviewer through direct API requests.
- Interviewer feedback requires the interviewer to be assigned to the application.
- Pipeline transitions are validated on the server.
- Applications cannot be moved through illegal stage jumps.
- Session authentication uses an HTTP-only `session_id` cookie.
- Database credentials are stored in environment variables rather than source control.

## Development Notes

This project was built incrementally, with meaningful Git commits for major features and fixes.

AI tools were used as part of the development process for architecture exploration, implementation, frontend development, debugging, refactoring, and documentation. AI-generated changes were reviewed, tested, and corrected where necessary.

The project's AI usage and examples of prompts are documented in:

```text
docs/ai-prompts.md
```

## Project Documentation

| Document | Purpose |
|---|---|
| `docs/architecture.md` | Application architecture and request flow |
| `docs/decisions.md` | Important engineering decisions and trade-offs |
| `docs/plan.md` | Implementation plan and development sequence |
| `docs/schema.md` | Database schema and data model |
| `docs/ai-prompts.md` | Significant AI prompts and corrections |
| `SUBMISSION.md` | Assignment submission details and final checklist |

## Assignment Scope

The implementation covers the required hiring-pipeline functionality, including:

1. Accounts and roles
2. Job openings
3. Applications
4. Pipeline transitions and rejection/reinstatement
5. Interview panel
6. Search, filtering, sorting, and pagination
7. Bulk actions and CSV export
8. Recruiter dashboard
9. Immutable application timeline
10. Stalled-application alerts

Optional integrations such as email notifications, external calendar integrations, and advanced analytics were not required for the core implementation.

## License

This project was created as a hiring assignment / portfolio project.
