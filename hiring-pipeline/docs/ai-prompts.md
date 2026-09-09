# AI prompts

The following are the significant AI prompts used during the planning and design phase. More prompts will be added as implementation progresses.

## Project architecture

### Prompt

"I want to use Next.js instead of React/Vite with a separate Express backend. Can Next.js handle both the frontend and backend for this assignment? Suggest a suitable architecture considering the 12-hour time limit and server-side enforcement requirements."

### What you got

AI suggested using Next.js with TypeScript as a full-stack application, with Next.js Route Handlers handling API requests and server-side business logic, Prisma for database access, and PostgreSQL as the database.

### What you corrected

The initial plan considered a separate React/Vite frontend and Express backend. I changed this to Next.js to reduce setup and deployment overhead and keep the project in a single application.

---

## Database schema design

### Prompt

"Help me design the database schema for the hiring pipeline assignment. Identify the required tables and relationships while considering applications, candidates, interviewers, interviews, feedback, application history, and stalled alerts."

### What you got

AI proposed a relational schema with tables for users, candidates, job openings, applications, interviewers, interviews, feedback, application events, and stalled-alert dismissals. It also identified the many-to-many relationship between applications and interviewers.

### What you corrected

The candidate information was initially considered as part of the application. After considering that the same candidate can apply to multiple jobs, I chose to keep candidates in a separate table and reference them from applications.