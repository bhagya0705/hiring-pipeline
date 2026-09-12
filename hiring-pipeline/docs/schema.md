# Schema

## Table by table: what columns and types does each one have?

## Tables

### 1. users

Stores users of the system and their roles.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR | User's name |
| email | VARCHAR | Unique login email |
| password_hash | VARCHAR | Hashed password |
| role | ENUM | RECRUITER or INTERVIEWER |
| created_at | TIMESTAMPTZ | Account creation time |
| updated_at | TIMESTAMPTZ | Last update time |

### 2. sessions

Stores authenticated user sessions.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key and session identifier |
| user_id | UUID | Foreign key to users |
| expires_at | TIMESTAMPTZ | Session expiration time |
| created_at | TIMESTAMPTZ | Session creation time |

Sessions are used with an HTTP-only `session_id` cookie.

### 3. candidates

Stores candidate information separately from applications because the same candidate can apply to multiple job openings.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR | Candidate's name |
| email | VARCHAR | Candidate's email |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update time |

### 4. job_openings

Stores job openings created by recruiters.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| title | VARCHAR | Job title |
| department | VARCHAR | Department |
| description | TEXT | Job description |
| status | ENUM | OPEN or ARCHIVED |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update time |

Archiving changes the status rather than deleting the job opening, so existing applications remain available.

### 5. applications

Represents a candidate applying to a particular job opening.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| candidate_id | UUID | Foreign key to candidates |
| job_opening_id | UUID | Foreign key to job_openings |
| source | VARCHAR | Application source |
| notes | TEXT | Application/recruiter notes |
| current_stage | ENUM | Current pipeline stage |
| rejected_from_stage | ENUM | Previous stage before rejection |
| stage_entered_at | TIMESTAMPTZ | Time when the current stage started |
| created_at | TIMESTAMPTZ | Application creation time |
| updated_at | TIMESTAMPTZ | Last update time |

The pipeline stages are:

- APPLIED
- SCREENING
- INTERVIEW
- OFFER
- HIRED
- REJECTED

An application has a unique candidate/job-opening combination, preventing the same candidate from having duplicate applications for the same opening.

`rejected_from_stage` is used to restore a rejected application to the exact stage from which it was rejected.

### 6. application_interviewers

Junction table for assigning interviewers to applications.

| Column | Type | Description |
|---|---|---|
| application_id | UUID | Foreign key to applications |
| interviewer_id | UUID | Foreign key to users |
| assigned_at | TIMESTAMPTZ | Assignment time |

The combination of `application_id` and `interviewer_id` is the primary key, so the same interviewer cannot be assigned to the same application twice.

The application layer also verifies that assigned users have the `INTERVIEWER` role.

### 7. interviews

Stores the scheduled interview for an application.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| application_id | UUID | Foreign key to applications |
| scheduled_at | TIMESTAMPTZ | Scheduled interview time |
| duration_minutes | INTEGER | Interview duration |
| created_by | UUID | Foreign key to users |
| created_at | TIMESTAMPTZ | Creation time |

`application_id` is unique, so the current implementation allows one scheduled interview per application.

The server validates that the scheduled time is in the future and that the duration is positive.

### 8. feedback

Stores feedback given by interviewers.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| application_id | UUID | Foreign key to applications |
| interviewer_id | UUID | Foreign key to users |
| rating | INTEGER | Rating from 1 to 5 |
| comment | TEXT | Feedback comment |
| created_at | TIMESTAMPTZ | Creation time |

The combination of `application_id` and `interviewer_id` is unique, so an interviewer can submit one feedback record for a particular application.

The server also verifies that the interviewer is assigned to the application before allowing feedback.

### 9. application_events

Stores the immutable history of an application.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| application_id | UUID | Foreign key to applications |
| actor_id | UUID | User who performed the action |
| event_type | ENUM | Type of event |
| from_stage | ENUM | Previous stage, when applicable |
| to_stage | ENUM | New stage, when applicable |
| metadata | JSONB | Additional event-specific information |
| created_at | TIMESTAMPTZ | Event creation time |

Event types currently include:

- APPLICATION_CREATED
- STAGE_CHANGED
- REJECTED
- REINSTATED
- FEEDBACK_ADDED
- INTERVIEW_SCHEDULED
- INTERVIEW_RESCHEDULED
- INTERVIEWER_ASSIGNED
- INTERVIEWER_REMOVED

Application events are append-only through the application API. There are no update or delete endpoints for timeline events.

### 10. stalled_alert_dismissals

Stores dismissal information for a specific stalled stage occurrence.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| application_id | UUID | Foreign key to applications |
| stage | ENUM | Stage for which the alert was dismissed |
| stage_entered_at | TIMESTAMPTZ | Start of that particular stage period |
| dismissed_by | UUID | Recruiter who dismissed the alert |
| dismissed_at | TIMESTAMPTZ | Dismissal time |

The combination of `application_id`, `stage`, and `stage_entered_at` is unique.

This means dismissing an alert only dismisses that particular stalled period. If the application later moves to another stage and becomes stalled again, a new alert can be generated.

---

## Which relationships are one-to-many, and which are many-to-many?

## One-to-many relationships

### User → Sessions

One user can have multiple sessions, while each session belongs to one user.

### Candidate → Applications

One candidate can have multiple applications, while each application belongs to exactly one candidate.

### Job Opening → Applications

One job opening can have multiple applications, while each application belongs to exactly one job opening.

### Application → Application Events

One application can have multiple events in its history, while each event belongs to one application.

### Application → Feedback

An application can have feedback records from multiple interviewers, while each feedback record belongs to one application.

The database currently allows one feedback record per interviewer per application.

### User → Feedback

One interviewer can submit feedback for multiple applications, while each feedback record belongs to one user.

### User → Application Events

One user can perform multiple actions recorded as events, while each event is associated with one user.

### User → Interviews

One recruiter can create multiple interviews, while each interview has one creating user.

### User → Stalled Alert Dismissals

One recruiter can dismiss multiple stalled alerts, while each dismissal is associated with one recruiter.

### Application → Stalled Alert Dismissals

One application can have multiple dismissal records over its lifetime, representing different stalled stage occurrences.

---

## One-to-one relationship

### Application → Interview

The current implementation allows one scheduled interview per application.

This is enforced by a unique constraint on `interviews.application_id`.

---

## Many-to-many relationship

### Applications ↔ Interviewers

An application can be assigned to multiple interviewers, and an interviewer can be assigned to multiple applications.

This many-to-many relationship is implemented using the `application_interviewers` junction table.

```text
Application
     │
     │
     ↓
application_interviewers
     ↑
     │
     │
   User
```

## Which constraints are enforced by the database, and which by application code — and why did you draw the line there?

The database enforces structural data integrity, while application code enforces business rules that depend on the current user or application state.

### Database-enforced constraints

The database enforces:

- Primary keys.
- Foreign key relationships.
- Unique user emails.
- Unique candidate/job-opening application combinations.
- Unique application/interviewer assignments.
- One interview per application.
- One feedback record per interviewer per application.
- Unique stalled-alert dismissal for a specific application/stage/stage occurrence.
- Valid enum values.
- Positive interview duration.
- Feedback rating between 1 and 5.
- Required fields where appropriate.

These constraints protect data integrity even when multiple requests reach the database.

### Application-enforced constraints

The server handles rules such as:

- Which roles can create or modify jobs.
- Which roles can modify applications.
- Which applications an interviewer can access.
- Only assigned interviewers can submit feedback.
- Applications can move only one stage forward at a time.
- Rejection can happen from any active stage.
- A rejected application can only be reinstated to its exact previous stage.
- Interview schedules must be in the future.
- Stalled alerts apply only to eligible active stages.
- Recruiters can dismiss stalled alerts.

These rules depend on the authenticated user and/or current application state, so they are enforced in server-side business logic rather than only in the database.

---

## What did you deliberately denormalise?

The main relational data is kept normalized.

The application does not duplicate candidate identity information inside `applications`; instead, applications reference the `candidates` table.

The `metadata` JSONB column in `application_events` is deliberately flexible because different event types can require different additional information.

The current application stage is stored directly on `applications` even though stage changes are also recorded in `application_events`. This avoids reconstructing the current state from the complete event history for every request, while the event table preserves the immutable history.

---

## What would break first if this had 100x the data?

The main pressure point would likely be application listing and reporting queries rather than the basic relational structure.

Search, filtering, sorting, pagination, dashboard aggregations, timeline queries, and CSV export would process substantially more rows. Relevant fields are already indexed for the common queries.

At a much larger scale, I would first review query plans and indexing, then consider:

- Additional or composite indexes based on actual query patterns.
- More efficient reporting queries or pre-aggregated data.
- Background processing for large CSV exports.
- More efficient pagination for very large result sets.
- Separating heavy analytics/reporting workloads from normal transactional queries.

The current schema is designed for the assignment's scale without introducing that additional infrastructure prematurely.