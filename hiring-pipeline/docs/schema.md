# Schema

Answer each of these, in your own words.

## Table by table: what columns and types does each one have?
## Tables

### 1. users

Stores users of the system.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR | User's name |
| email | VARCHAR | Login email |
| password_hash | VARCHAR | Hashed password |
| role | ENUM | RECRUITER or INTERVIEWER |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last update time |

---

### 2. candidates

Stores candidate information separately from applications because the
same candidate can apply to multiple job openings.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR | Candidate's name |
| email | VARCHAR | Candidate's email |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

---

### 3. job_openings

Stores job openings created by recruiters.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| title | VARCHAR | Job title |
| department | VARCHAR | Department |
| description | TEXT | Job description |
| status | ENUM | OPEN or ARCHIVED |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

---

### 4. applications

Represents a candidate applying to a particular job opening.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| candidate_id | UUID | Foreign key to candidates |
| job_opening_id | UUID | Foreign key to job_openings |
| source | VARCHAR | Application source |
| notes | TEXT | Recruiter notes |
| current_stage | ENUM | Current pipeline stage |
| stage_entered_at | TIMESTAMP | Time when the current stage started |
| created_at | TIMESTAMP | Application creation time |
| updated_at | TIMESTAMP | Last update time |

The pipeline stages are:

- APPLIED
- SCREENING
- INTERVIEW
- OFFER
- HIRED
- REJECTED

---

### 5. application_interviewers

Junction table for assigning interviewers to applications.

| Column | Type | Description |
|---|---|---|
| application_id | UUID | Foreign key to applications |
| interviewer_id | UUID | Foreign key to users |
| assigned_at | TIMESTAMP | Assignment time |

The combination of `application_id` and `interviewer_id` will be
unique.

---

### 6. interviews

Stores scheduled interviews for applications.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| application_id | UUID | Foreign key to applications |
| scheduled_at | TIMESTAMP | Scheduled interview time |
| duration_minutes | INTEGER | Interview duration |
| created_by | UUID | Foreign key to users |
| created_at | TIMESTAMP | Creation time |

---

### 7. feedback

Stores feedback given by interviewers.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| application_id | UUID | Foreign key to applications |
| interviewer_id | UUID | Foreign key to users |
| rating | INTEGER | Feedback rating |
| comment | TEXT | Feedback comment |
| created_at | TIMESTAMP | Creation time |

---

### 8. application_events

Stores the immutable history of an application.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| application_id | UUID | Foreign key to applications |
| actor_id | UUID | User who performed the action |
| event_type | ENUM | Type of event |
| from_stage | ENUM | Previous stage, when applicable |
| to_stage | ENUM | New stage, when applicable |
| metadata | JSONB | Additional event information |
| created_at | TIMESTAMP | Event creation time |

Examples of events:

- APPLICATION_CREATED
- STAGE_CHANGED
- REJECTED
- REINSTATED
- FEEDBACK_ADDED
- INTERVIEW_SCHEDULED
- INTERVIEWER_ASSIGNED
- INTERVIEWER_REMOVED

Application events are append-only. Existing history should not be
edited or deleted.

---

### 9. stalled_alert_dismissals

Stores dismissal information for a specific stalled period.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| application_id | UUID | Foreign key to applications |
| stage | ENUM | Stage for which the alert was dismissed |
| stage_entered_at | TIMESTAMP | Start of that stage period |
| dismissed_by | UUID | Recruiter who dismissed the alert |
| dismissed_at | TIMESTAMP | Dismissal time |

This allows an alert to be dismissed for one stalled period without
permanently hiding future stalled alerts.

---

## Which relationships are one-to-many, and which are many-to-many?
# Relationships

## One-to-many relationships

### Candidate → Applications
One candidate can submit multiple applications, while each application
belongs to exactly one candidate.

### Job Opening → Applications
One job opening can have multiple applications, while each application
belongs to exactly one job opening.

### Application → Interviews
One application can have multiple scheduled interviews, while each
interview belongs to one application.

### Application → Feedback
One application can have multiple feedback records, while each feedback
record belongs to one application.

### Application → Application Events
One application can have multiple events in its history, while each
event belongs to one application.

### User → Feedback
One user can submit multiple feedback records, while each feedback
record is submitted by one user.

### User → Application Events
One user can perform multiple actions that are recorded as events,
while each event is associated with one user.

### User → Interviews
One user can schedule multiple interviews, while each interview is
created by one user.

---

## Many-to-many relationship

### Applications ↔ Interviewers

An application can be assigned to multiple interviewers, and an
interviewer can be assigned to multiple applications.

This many-to-many relationship is implemented using the
`application_interviewers` junction table.

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


- Which constraints are enforced by the database, and which by application code — and why did you draw the line there?
- What did you deliberately denormalise?
- What would break first if this had 100x the data?
