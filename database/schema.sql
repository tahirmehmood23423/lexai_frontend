-- ═══════════════════════════════════════════════════════════════
-- LexAI — PostgreSQL Database Schema
-- Run this in Supabase SQL editor (supabase.com → free tier)
-- Or the SQLAlchemy models auto-create these tables on startup
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS ──
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    role          VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'lawyer', 'admin')),
    phone         VARCHAR(20),
    city          VARCHAR(100),
    avatar_url    TEXT,
    is_active     BOOLEAN DEFAULT TRUE,
    is_verified   BOOLEAN DEFAULT FALSE,
    google_id     VARCHAR(255) UNIQUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ── LAWYER PROFILES ──
CREATE TABLE lawyer_profiles (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bar_council_no    VARCHAR(100),
    specializations   JSONB DEFAULT '[]',
    experience_years  INTEGER DEFAULT 0,
    education         JSONB DEFAULT '[]',
    languages         JSONB DEFAULT '["Urdu", "English"]',
    consultation_fee  DECIMAL(10,2) DEFAULT 0,
    bio               TEXT,
    office_address    TEXT,
    city              VARCHAR(100),
    province          VARCHAR(100),
    court_types       JSONB DEFAULT '[]',
    is_verified       BOOLEAN DEFAULT FALSE,
    is_available      BOOLEAN DEFAULT TRUE,
    rating_avg        DECIMAL(3,2) DEFAULT 0,
    rating_count      INTEGER DEFAULT 0,
    profile_photo_url TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_lawyer_city ON lawyer_profiles(city);
CREATE INDEX idx_lawyer_rating ON lawyer_profiles(rating_avg DESC);

-- ── CASES ──
CREATE TABLE cases (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title             VARCHAR(500) NOT NULL,
    description       TEXT,
    case_number       VARCHAR(100),
    case_type         VARCHAR(100) NOT NULL,
    court_name        VARCHAR(255),
    status            VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','active','on_hold','closed','won','lost')),
    client_id         UUID REFERENCES users(id),
    lawyer_id         UUID REFERENCES lawyer_profiles(id),
    filing_date       TIMESTAMPTZ,
    next_hearing_date TIMESTAMPTZ,
    notes             TEXT,
    opposing_party    VARCHAR(255),
    opposing_lawyer   VARCHAR(255),
    judge_name        VARCHAR(255),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cases_client ON cases(client_id);
CREATE INDEX idx_cases_lawyer ON cases(lawyer_id);
CREATE INDEX idx_cases_status ON cases(status);

-- ── CASE UPDATES (timeline) ──
CREATE TABLE case_updates (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id                UUID REFERENCES cases(id) ON DELETE CASCADE,
    author_id              UUID REFERENCES users(id),
    content                TEXT NOT NULL,
    is_visible_to_client   BOOLEAN DEFAULT TRUE,
    created_at             TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_updates_case ON case_updates(case_id);

-- ── HEARINGS ──
CREATE TABLE hearings (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id       UUID REFERENCES cases(id) ON DELETE CASCADE,
    date          TIMESTAMPTZ NOT NULL,
    court_room    VARCHAR(100),
    court_name    VARCHAR(255),
    purpose       VARCHAR(255),
    status        VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','adjourned','cancelled')),
    outcome       TEXT,
    next_date     TIMESTAMPTZ,
    reminder_sent BOOLEAN DEFAULT FALSE,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hearings_case ON hearings(case_id);
CREATE INDEX idx_hearings_date ON hearings(date);

-- ── DOCUMENTS ──
CREATE TABLE documents (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id     UUID REFERENCES cases(id) ON DELETE SET NULL,
    uploader_id UUID REFERENCES users(id),
    file_name   VARCHAR(500) NOT NULL,
    file_url    TEXT NOT NULL,
    file_size   INTEGER,
    file_type   VARCHAR(20),
    category    VARCHAR(100),
    description VARCHAR(500),
    is_private  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_docs_case ON documents(case_id);

-- ── MESSAGE THREADS ──
CREATE TABLE message_threads (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id    UUID REFERENCES cases(id) ON DELETE SET NULL,
    client_id  UUID REFERENCES users(id),
    lawyer_id  UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── MESSAGES ──
CREATE TABLE messages (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id  UUID REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_id  UUID REFERENCES users(id),
    content    TEXT,
    file_url   TEXT,
    file_name  VARCHAR(500),
    is_read    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- ── BOOKINGS ──
CREATE TABLE bookings (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id         UUID REFERENCES users(id),
    lawyer_id         UUID REFERENCES lawyer_profiles(id),
    consultation_type VARCHAR(20) DEFAULT 'video' CHECK (consultation_type IN ('video','in_person','phone')),
    scheduled_at      TIMESTAMPTZ NOT NULL,
    duration_minutes  INTEGER DEFAULT 30,
    status            VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
    notes             TEXT,
    fee               DECIMAL(10,2),
    meet_link         TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_lawyer ON bookings(lawyer_id);
CREATE INDEX idx_bookings_date   ON bookings(scheduled_at);

-- ── REVIEWS ──
CREATE TABLE reviews (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id  UUID REFERENCES users(id),
    lawyer_id  UUID REFERENCES lawyer_profiles(id),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SUPABASE STORAGE BUCKETS (run in Supabase dashboard) ──
-- Storage > New bucket > Name: "case-documents" > Public: OFF
-- Storage > New bucket > Name: "lawyer-profiles" > Public: ON
-- Storage > New bucket > Name: "client-uploads"  > Public: OFF

-- ── ROW LEVEL SECURITY (Supabase) ──
-- Users can only read their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own user record
CREATE POLICY "Users read own record" ON users FOR SELECT USING (auth.uid()::text = id::text);
