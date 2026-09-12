# AI prompts

The following are the significant AI prompts used during planning, design, implementation, and review. I have included the prompts that materially influenced the design or helped solve non-trivial implementation problems rather than listing every small coding question.

## Project architecture

### Prompt

"I want to use Next.js instead of React/Vite with a separate Express backend. Can Next.js handle both the frontend and backend for this assignment? Suggest a suitable architecture considering the 12-hour time limit and server-side enforcement requirements."

### What I got

AI suggested using Next.js with TypeScript as a full-stack application, with Next.js Route Handlers handling API requests and server-side business logic, PostgreSQL as the database, and an ORM for database access.

### What I decided

I chose Next.js as the full-stack application because it reduces setup and deployment overhead while still allowing authentication, authorization, and business logic to remain on the server.

---

## Database schema design

### Prompt

"Help me design the database schema for the hiring pipeline assignment. Identify the required tables and relationships while considering applications, candidates, interviewers, interviews, feedback, application history, and stalled alerts."

### What I got

AI proposed a relational schema containing users, candidates, job openings, applications, interview assignments, interviews, feedback, application events, and stalled-alert dismissals. It also identified the many-to-many relationship between applications and interviewers.

### What I decided

I reviewed the proposed relationships against the assignment requirements and kept candidates as a separate entity because one candidate can have multiple applications.

---

## Choosing the database access approach

### Prompt

"I initially planned to use Prisma with PostgreSQL, but the setup is adding complexity for this time-constrained assignment. Compare Prisma with direct PostgreSQL access using the pg package for this project. Focus on development speed, control over SQL, schema constraints, and complexity."

### What I got

AI compared the two approaches and identified that Prisma would provide ORM conveniences and type-safe database access, while `pg` would provide a smaller and more direct database layer with full SQL control.

### What I decided

I initially started with the Prisma approach but later switched to `pg`. The simpler setup and direct SQL control were a better fit for the assignment and allowed me to focus on the required functionality.

### Later reversed

This was a deliberate reversal of an earlier technical decision. I did not keep Prisma simply because it was part of the original plan.

---

## Pipeline business rules

### Prompt

"Design the server-side rules for a hiring pipeline with the stages APPLIED → SCREENING → INTERVIEW → OFFER → HIRED. An application can be rejected from any stage and later reinstated only to the exact stage it was rejected from. How should the server validate these transitions and record the history?"

### What I got

AI recommended treating stage transitions as server-side business rules rather than trusting the client. It also recommended storing the previous stage when rejecting an application and recording the transition as an immutable event.

### What I decided

I implemented the transition validation on the server so that invalid stage skips are rejected even if a client sends an invalid request directly to the API. Rejection stores the previous stage and reinstatement restores that exact stage.

---

## Reviewing the stalled-alert design

### Prompt

"An application should generate a stalled alert when it remains in the same active stage for more than 10 days. A recruiter can dismiss the alert, but the alert must become eligible again when the application moves to a new stage and later stalls there. What should identify a specific stalled period?"

### What I got

AI suggested associating a dismissal with the application, current stage, and the timestamp at which that stage began.

### What I decided

I used `application_id`, `stage`, and `stage_entered_at` to identify a specific stalled stage occurrence. This prevents an old dismissal from suppressing an alert for a later stage occurrence.

During implementation, I also verified the database timestamp used for the dismissal rather than generating a separate application-side timestamp, which avoided a mismatch in the stalled-alert query.

---

## AI output that required correction

### Prompt

"Review the stalled-alert dismissal implementation and check whether dismissing an alert will reliably prevent the same alert from appearing again. Pay particular attention to the stage and stage_entered_at values used by the dismissal query."

### What I got

The initial implementation used values that could differ slightly from the timestamp stored in the application row. This meant the dismissal record could fail to match the stalled-alert query even though the application and stage were the same.

### What I changed

I changed the dismissal insert to copy the exact `stage` and `stage_entered_at` values directly from the `applications` row using an `INSERT ... SELECT`. I then retested the workflow:

1. A stalled application appears.
2. The recruiter dismisses the alert.
3. The alert disappears.
4. The application advances to a new stage.
5. The new stage is made stale for testing.
6. The application becomes eligible for a new stalled alert.

This was an example where I used AI to review the implementation but verified and corrected the result myself.