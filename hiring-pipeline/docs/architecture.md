# Architecture

Answer each of these, in your own words, once the system has taken real shape.
## What are the moving pieces, and how do they talk to each other?

The application is built as a full-stack Next.js application using TypeScript.

The main pieces are:

- **Next.js application** — provides the application and API route handlers.
- **Route Handlers** — handle authentication, authorization, validation, business logic, and API responses.
- **PostgreSQL (Neon)** — stores users, jobs, candidates, applications, interviews, feedback, application events, sessions, and stalled-alert dismissals.
- **`pg`** — provides database access from the server.
- **Session authentication** — authenticated users are identified through an HTTP-only `session_id` cookie.

The browser communicates with the Next.js API. The server checks authentication and role permissions before performing database operations.

## Where does each piece run?

- **Next.js application:** runs on the server and serves the application/API.
- **Frontend:** runs in the user's browser.
- **PostgreSQL:** hosted on Neon.
- **Database access:** performed server-side through the `pg` package.

The database connection string and other secrets are kept in environment variables and are not exposed to the browser.

## What is the request path for one representative user action, end to end?

For example, when a recruiter advances an application:

1. The browser sends a request to the application stage API.
2. The Next.js Route Handler reads the `session_id` cookie.
3. The server retrieves the current user and verifies that the user is a recruiter.
4. The server validates the requested stage transition.
5. The application is updated in PostgreSQL.
6. A corresponding application event is added to the immutable timeline.
7. The API returns the result to the browser.

This keeps authentication, authorization, validation, and business rules on the server rather than relying on the frontend.

## What did you decide not to build, and why?

The implementation focuses on the ten required assignment goals rather than optional functionality.

We did not build features such as email notifications, external calendar integrations, advanced analytics, or other non-required integrations. These were excluded to keep the implementation focused and within the assignment's time constraint.
