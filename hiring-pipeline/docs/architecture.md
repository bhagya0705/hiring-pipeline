# Architecture

Answer each of these, in your own words, once the system has taken real shape.

## What are the moving pieces, and how do they talk to each other?

The application is built as a full-stack Next.js application using TypeScript.

The main pieces are:

- **Next.js application** — provides the frontend application and server-side API route handlers.

- **Frontend components** — provide the user interface for authentication, jobs, applications, interviews, dashboard, and alerts. They communicate with the backend through HTTP requests to the Next.js API routes.

- **Route Handlers** — handle authentication, authorization, request validation, business logic, database operations, and API responses.

- **`lib/auth.ts`** — provides shared server-side authentication and role-checking logic for protected operations.

- **`pg`** — provides direct PostgreSQL database access from the server using SQL queries.

- **PostgreSQL (Neon)** — stores users, sessions, jobs, candidates, applications, interviews, feedback, application events, and stalled-alert dismissals.

- **Session authentication** — authenticated users are identified through an HTTP-only `session_id` cookie. The server uses the session to determine the current user and their role.

The overall request flow is:

**Browser → Next.js Route Handler → Authentication/Authorization → Business Logic → PostgreSQL → Route Handler → Browser**

The browser does not connect directly to PostgreSQL.

## Where does each piece run?

- **Next.js application:** runs on the application server and serves both the frontend and API route handlers.

- **Frontend:** runs in the user's browser and communicates with the Next.js backend using HTTP requests.

- **Route Handlers and server-side logic:** run on the server. They perform authentication, authorization, validation, and database operations.

- **PostgreSQL:** hosted on Neon as the application's persistent database.

- **Database access:** performed server-side through the `pg` package.

- **Session cookie:** stored by the browser as an HTTP-only cookie and sent with requests to the application.

The database connection string and other secrets are kept in environment variables and are not exposed to the browser.

## What is the request path for one representative user action, end to end?

For example, when a recruiter advances an application:

1. The recruiter selects a new stage in the browser.

2. The browser sends a request to the application stage API.

3. The Next.js Route Handler reads the `session_id` cookie.

4. The server retrieves the current user and verifies that the user has the required recruiter role.

5. The server validates the requested stage transition against the hiring pipeline rules.

6. The server updates the application's current stage and related stage information in PostgreSQL.

7. The server creates a corresponding application event containing the stage change and actor information.

8. The API returns the result to the browser.

9. The frontend updates the application details and timeline shown to the user.

This keeps authentication, authorization, validation, and business rules on the server rather than relying on the frontend to enforce them.

## What did you decide not to build, and why?

The implementation focuses on the ten required assignment goals rather than optional functionality.

We did not build features such as email notifications, external calendar integrations, advanced analytics, or other non-required integrations. These were excluded to keep the implementation focused and within the assignment's time constraint.

The application also avoids introducing additional infrastructure or abstraction layers that are not necessary for the assignment's scale. The current architecture keeps the frontend, API, business logic, and database access straightforward within the Next.js application.