CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM (
    'RECRUITER',
    'INTERVIEWER'
);

CREATE TYPE job_opening_status AS ENUM (
    'OPEN',
    'ARCHIVED'
);

CREATE TYPE application_stage AS ENUM (
    'APPLIED',
    'SCREENING',
    'INTERVIEW',
    'OFFER',
    'HIRED',
    'REJECTED'
);

CREATE TYPE application_event_type AS ENUM (
    'APPLICATION_CREATED',
    'STAGE_CHANGED',
    'REJECTED',
    'REINSTATED',
    'FEEDBACK_ADDED',
    'INTERVIEW_SCHEDULED',
    'INTERVIEWER_ASSIGNED',
    'INTERVIEWER_REMOVED'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_openings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status job_opening_status NOT NULL DEFAULT 'OPEN',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    candidate_id UUID NOT NULL,
    job_opening_id UUID NOT NULL,

    source VARCHAR(255) NOT NULL,
    notes TEXT,

    current_stage application_stage NOT NULL DEFAULT 'APPLIED',
    rejected_from_stage application_stage,
    stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_application_candidate
        FOREIGN KEY (candidate_id)
        REFERENCES candidates(id),

    CONSTRAINT fk_application_job
        FOREIGN KEY (job_opening_id)
        REFERENCES job_openings(id)
);

CREATE TABLE application_interviewers (
    application_id UUID NOT NULL,
    interviewer_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (application_id, interviewer_id),

    CONSTRAINT fk_assignment_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignment_interviewer
        FOREIGN KEY (interviewer_id)
        REFERENCES users(id)
);

CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id UUID NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    created_by UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_interview_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_interview_creator
        FOREIGN KEY (created_by)
        REFERENCES users(id),

    CONSTRAINT chk_interview_duration
        CHECK (duration_minutes > 0)
);

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id UUID NOT NULL,
    interviewer_id UUID NOT NULL,

    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_feedback_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_feedback_interviewer
        FOREIGN KEY (interviewer_id)
        REFERENCES users(id),

    CONSTRAINT chk_feedback_rating
        CHECK (rating BETWEEN 1 AND 5)
);

CREATE TABLE application_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id UUID NOT NULL,
    actor_id UUID NOT NULL,

    event_type application_event_type NOT NULL,
    from_stage application_stage,
    to_stage application_stage,
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_event_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_event_actor
        FOREIGN KEY (actor_id)
        REFERENCES users(id)
);

CREATE TABLE stalled_alert_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id UUID NOT NULL,
    stage application_stage NOT NULL,
    stage_entered_at TIMESTAMPTZ NOT NULL,

    dismissed_by UUID NOT NULL,
    dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_dismissal_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_dismissal_user
        FOREIGN KEY (dismissed_by)
        REFERENCES users(id),

    CONSTRAINT uq_dismissal_period
        UNIQUE (application_id, stage, stage_entered_at)
);

-- Application search and filtering
CREATE INDEX idx_candidates_name
    ON candidates(name);

CREATE INDEX idx_candidates_email
    ON candidates(email);

CREATE INDEX idx_applications_job
    ON applications(job_opening_id);

CREATE INDEX idx_applications_stage
    ON applications(current_stage);

CREATE INDEX idx_applications_source
    ON applications(source);

CREATE INDEX idx_applications_created_at
    ON applications(created_at);

CREATE INDEX idx_applications_updated_at
    ON applications(updated_at);

CREATE INDEX idx_applications_stage_entered_at
    ON applications(stage_entered_at);

-- Interview and feedback lookups
CREATE INDEX idx_interviews_scheduled_at
    ON interviews(scheduled_at);

CREATE INDEX idx_feedback_application
    ON feedback(application_id);

-- Timeline lookups
CREATE INDEX idx_application_events_application_created
    ON application_events(application_id, created_at);

-- Interviewer assignment lookups
CREATE INDEX idx_application_interviewers_interviewer
    ON application_interviewers(interviewer_id);