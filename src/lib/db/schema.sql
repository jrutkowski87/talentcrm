-- ============================================================================
-- Celebrity Talent Partnership CRM - SQLite Database Schema
-- ============================================================================
-- Generated: 2026-01-28
-- Engine: SQLite 3.x
-- ============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================================
-- 1. CLIENTS - Brand / company profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
    id                    TEXT PRIMARY KEY,                -- UUID
    name                  TEXT NOT NULL,                   -- e.g. "Walmart", "NYON", "Lotto"
    dba_name              TEXT,                            -- doing business as, e.g. "New York or Nowhere"
    legal_entity          TEXT,                            -- e.g. "Knowlita, LLC"
    agency                TEXT,                            -- e.g. "Sylvain"
    confidentiality_level TEXT NOT NULL DEFAULT 'standard' -- "standard" | "proprietary_confidential"
                          CHECK (confidentiality_level IN ('standard', 'proprietary_confidential')),
    key_contacts          TEXT,                            -- JSON array of contact objects
    notes                 TEXT,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_name ON clients(name);

-- ============================================================================
-- 2. SUB_BRANDS - Sub-brands within a client
-- ============================================================================
CREATE TABLE IF NOT EXISTS sub_brands (
    id                    TEXT PRIMARY KEY,                -- UUID
    client_id             TEXT NOT NULL,
    name                  TEXT NOT NULL,                   -- e.g. "Scoop", "Free Assembly"
    positioning_statement TEXT,
    brand_idea            TEXT,
    contract_template_id  TEXT,                            -- FK to document_templates (nullable)
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX idx_sub_brands_client_id ON sub_brands(client_id);

-- ============================================================================
-- 3. CASTING_FRAMEWORKS - Casting philosophy / lens per sub-brand
-- ============================================================================
CREATE TABLE IF NOT EXISTS casting_frameworks (
    id                    TEXT PRIMARY KEY,                -- UUID
    sub_brand_id          TEXT NOT NULL,
    lens_name             TEXT NOT NULL,                   -- e.g. "Fashion-Forward", "Contemporary Relevance"
    pillars               TEXT,                            -- JSON: [{name, description, criteria[]}]
    demographics          TEXT,                            -- JSON: {age_primary, age_secondary, sizes, shooting_sizes, gender_policy, ethnicity_policy, ability_policy}
    tier_system           TEXT,                            -- JSON: [{name, role, description}]
    north_star_references TEXT,                            -- JSON: [{name, category, notes}]
    data_points           TEXT,                            -- JSON: supporting research stats
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sub_brand_id) REFERENCES sub_brands(id) ON DELETE CASCADE
);

CREATE INDEX idx_casting_frameworks_sub_brand_id ON casting_frameworks(sub_brand_id);

-- ============================================================================
-- 4. TALENT - Individual talent profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS talent (
    id                TEXT PRIMARY KEY,                    -- UUID
    name              TEXT NOT NULL,
    category          TEXT NOT NULL DEFAULT 'other'
                      CHECK (category IN ('actor', 'musician', 'athlete', 'influencer', 'model', 'creator', 'comedian', 'chef', 'photographer', 'artist', 'other')),
    bio               TEXT,
    notes             TEXT,
    social_handles    TEXT,                                -- JSON: {instagram, tiktok, x, youtube, ...}
    social_followers  TEXT,                                -- JSON: {instagram: number, ...}
    location          TEXT,
    loan_out_company  TEXT,                                -- e.g. "Companyfellow Inc."
    loan_out_address  TEXT,
    rate_range        TEXT,                                -- e.g. "$25K-$35K"
    categories_worked TEXT,                                -- JSON: array of strings
    rating            INTEGER CHECK (rating BETWEEN 1 AND 5),  -- 1-5 stars
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_talent_name ON talent(name);
CREATE INDEX idx_talent_category ON talent(category);

-- ============================================================================
-- 5. REPS - Talent representatives (agents, managers, publicists, lawyers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reps (
    id                TEXT PRIMARY KEY,                    -- UUID
    name              TEXT NOT NULL,
    email             TEXT,
    phone             TEXT,
    agency            TEXT,                                -- e.g. "WME", "UTA", "CAA"
    role              TEXT NOT NULL DEFAULT 'agent'
                      CHECK (role IN ('agent', 'manager', 'publicist', 'lawyer', 'other')),
    notes             TEXT,
    avg_response_days REAL,
    deals_offered     INTEGER NOT NULL DEFAULT 0,
    deals_closed      INTEGER NOT NULL DEFAULT 0,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reps_agency ON reps(agency);
CREATE INDEX idx_reps_role ON reps(role);

-- ============================================================================
-- 6. TALENT_REPS - Many-to-many: talent <-> reps
-- ============================================================================
CREATE TABLE IF NOT EXISTS talent_reps (
    talent_id         TEXT NOT NULL,
    rep_id            TEXT NOT NULL,
    relationship_type TEXT NOT NULL
                      CHECK (relationship_type IN ('agent', 'manager', 'publicist', 'lawyer')),
    is_primary        INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),

    PRIMARY KEY (talent_id, rep_id),
    FOREIGN KEY (talent_id) REFERENCES talent(id) ON DELETE CASCADE,
    FOREIGN KEY (rep_id)    REFERENCES reps(id)   ON DELETE CASCADE
);

CREATE INDEX idx_talent_reps_rep_id ON talent_reps(rep_id);

-- ============================================================================
-- 7. DEALS - The core deal record (source of truth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS deals (
    id                    TEXT PRIMARY KEY,                -- UUID
    client_id             TEXT NOT NULL,
    sub_brand_id          TEXT,                            -- nullable

    -- Identity
    deal_name             TEXT NOT NULL,
    campaign_name         TEXT,
    status                TEXT NOT NULL DEFAULT 'creative_brief',
    music_status          TEXT,                              -- secondary music pipeline status for talent_and_music deals
    talent_id             TEXT,                            -- set when talent is selected

    -- Brief
    brief_raw_text        TEXT,                            -- original brief, pasted/uploaded
    brief_parsed_data     TEXT,                            -- JSON: AI-extracted fields

    -- Deal Terms
    effective_date        DATE,
    service_days          TEXT,                            -- JSON: [{type, quantity, hours, location, location_detail, date_or_window, conditions, status}]
    social_posts          TEXT,                            -- JSON: {quantity, platforms[], window_start, window_end, partners, archive_minimum, notes}
    media_opportunities   TEXT,                            -- JSON: {quantity, types[], approval_required, notes}
    ambassador_duties     TEXT,                            -- JSON: {duties[], notes}
    approval_rights       TEXT,                            -- JSON: {scope, threshold_pct, turnaround_hours, silence_deemed_approval, approval_contact_name, approval_contact_email}
    image_rights          TEXT,                            -- JSON: {max_count, edits_allowed, text_overlays_allowed, notes}
    permitted_usage       TEXT,                            -- JSON: {digital[], pr, retail[], ooh[], internal, photographer, paid_media, notes}
    post_term_rules       TEXT,

    -- Term
    term_duration         TEXT,
    term_duration_weeks   INTEGER,
    term_start_trigger    TEXT,
    term_start_date       DATE,
    term_end_date         DATE,

    -- Fee
    fee_total             REAL,
    fee_currency          TEXT NOT NULL DEFAULT 'USD',
    fee_structure         TEXT,                            -- "flat" | "pay_or_play" | "revenue_share" | "hybrid"
    fee_payments          TEXT,                            -- JSON: [{percentage, milestone, status, paid_date, invoice_received, w9_received}]
    fee_net_terms         TEXT,
    fee_mfn              INTEGER NOT NULL DEFAULT 0 CHECK (fee_mfn IN (0, 1)),
    fee_mfn_details       TEXT,
    fee_revenue_share     TEXT,                            -- JSON: {percentage, minimum_guarantee, product_scope, notes}
    fee_ancillary         TEXT,

    -- Exclusivity
    exclusivity_category  TEXT,
    exclusivity_brands    TEXT,                            -- JSON: array of excluded brand names
    exclusivity_duration  TEXT,

    -- Production / Logistics
    travel                TEXT,                            -- JSON: {ground_transport, flights, hotel, per_diem, plus_one, notes}
    hmu                   TEXT,                            -- JSON: {hair, makeup, wardrobe, styling, styling_discretion, consultation_right, notes}

    -- Talent Criteria
    talent_criteria       TEXT,                            -- JSON: {categories[], gender, description, energy_notes, restrictions[], requirements[]}

    -- Legal
    governing_law         TEXT NOT NULL DEFAULT 'California',
    non_union             INTEGER NOT NULL DEFAULT 1 CHECK (non_union IN (0, 1)),
    confidential          INTEGER NOT NULL DEFAULT 1 CHECK (confidential IN (0, 1)),

    -- Contract
    lender_entity         TEXT,
    lender_address        TEXT,
    company_signatory     TEXT,
    talent_signatory      TEXT,
    notice_emails         TEXT,                            -- plain text: rep contact info
    termination_cure_days INTEGER NOT NULL DEFAULT 30,
    morals_clause         INTEGER NOT NULL DEFAULT 1 CHECK (morals_clause IN (0, 1)),
    morals_clause_details TEXT,
    pro_rata_formula      TEXT,

    -- Materials
    materials_stills_count          INTEGER,              -- number of stills allowed
    materials_videos                TEXT,                  -- JSON: [{count, length}] e.g. [{count:4,length:":30"},{count:2,length:":60"}]
    materials_edits_versions        INTEGER NOT NULL DEFAULT 1 CHECK (materials_edits_versions IN (0, 1)),  -- includes edits, versions, cutdowns and lifts
    materials_alternate_assets      TEXT,                  -- free-text for alternate assets / layouts

    -- Music Licensing
    deal_type             TEXT NOT NULL DEFAULT 'talent'
                          CHECK (deal_type IN ('talent', 'music', 'talent_and_music')),
    song_id               TEXT,                              -- FK to songs (set when song is selected)
    license_type          TEXT,                              -- 'master' | 'sync' | 'master_and_sync'
    usage_type            TEXT,                              -- JSON array: ['commercial','film','tv','digital','trailer','promo']
    territory             TEXT,                              -- e.g. 'Worldwide', 'US Only'
    media                 TEXT,                              -- JSON array: ['broadcast','digital','social','cinema','radio']
    fee_per_side          REAL,                              -- fee per side (e.g. 100000)
    master_fee_override   REAL,                              -- null = MFN (same as fee_per_side)
    usage_description     TEXT,                              -- custom usage/media description for license (overrides auto-generated)

    -- Stage Gates
    approval_to_engage_at DATETIME,
    approval_to_engage_by TEXT,
    approval_notes        TEXT,

    -- Offer Snapshot
    offer_snapshot        TEXT,                              -- JSON: snapshot of offer at acceptance

    -- Fulfillment
    usage_start_date      DATE,
    usage_end_date        DATE,
    deliverables_status   TEXT,                              -- JSON: [{type, description, status, due_date, completed_date}]

    -- Admin
    admin_checklist       TEXT,                              -- JSON: [{item, status, completed_at}]
    w9_received           INTEGER NOT NULL DEFAULT 0 CHECK (w9_received IN (0, 1)),
    w9_received_date      DATE,
    invoice_received      INTEGER NOT NULL DEFAULT 0 CHECK (invoice_received IN (0, 1)),
    invoice_received_date DATE,

    -- Versioning
    offer_sheet_version   INTEGER NOT NULL DEFAULT 1,
    longform_version      INTEGER NOT NULL DEFAULT 1,
    offer_accepted_at     DATETIME,
    contract_executed_at  DATETIME,

    -- Timestamps
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (client_id)    REFERENCES clients(id)   ON DELETE RESTRICT,
    FOREIGN KEY (sub_brand_id) REFERENCES sub_brands(id) ON DELETE SET NULL,
    FOREIGN KEY (talent_id)    REFERENCES talent(id)     ON DELETE SET NULL,
    FOREIGN KEY (song_id)      REFERENCES songs(id)      ON DELETE SET NULL
);

CREATE INDEX idx_deals_client_id    ON deals(client_id);
CREATE INDEX idx_deals_sub_brand_id ON deals(sub_brand_id);
CREATE INDEX idx_deals_talent_id    ON deals(talent_id);
CREATE INDEX idx_deals_status       ON deals(status);
CREATE INDEX idx_deals_created_at   ON deals(created_at);

-- ============================================================================
-- 8. DEAL_TALENT_SHORTLIST - Talent consideration cards per deal
-- ============================================================================
CREATE TABLE IF NOT EXISTS deal_talent_shortlist (
    id                  TEXT PRIMARY KEY,                  -- UUID
    deal_id             TEXT NOT NULL,
    talent_id           TEXT NOT NULL,
    submitted_by_rep_id TEXT,                              -- nullable
    estimated_rate      TEXT,
    availability        TEXT,
    availability_status TEXT NOT NULL DEFAULT 'unknown'
                        CHECK (availability_status IN ('confirmed', 'checking', 'unavailable', 'unknown')),
    interest_level      TEXT NOT NULL DEFAULT 'unknown'
                        CHECK (interest_level IN ('high', 'medium', 'low', 'unknown')),
    rep_notes           TEXT,
    your_notes          TEXT,
    red_flags           TEXT,
    fit_score           INTEGER CHECK (fit_score BETWEEN 1 AND 5),  -- 1-5
    fit_scorecard       TEXT,                              -- JSON: per-pillar scores if client has casting framework
    status              TEXT NOT NULL DEFAULT 'considering'
                        CHECK (status IN ('considering', 'reached_out', 'interested', 'approved', 'in_negotiation', 'confirmed', 'passed', 'on_hold')),
    passed_reason       TEXT,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (deal_id)             REFERENCES deals(id)  ON DELETE CASCADE,
    FOREIGN KEY (talent_id)           REFERENCES talent(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by_rep_id) REFERENCES reps(id)   ON DELETE SET NULL
);

CREATE INDEX idx_deal_talent_shortlist_deal_id   ON deal_talent_shortlist(deal_id);
CREATE INDEX idx_deal_talent_shortlist_talent_id ON deal_talent_shortlist(talent_id);
CREATE INDEX idx_deal_talent_shortlist_status    ON deal_talent_shortlist(status);

-- ============================================================================
-- 9. DEAL_TIMELINE - Activity feed per deal
-- ============================================================================
CREATE TABLE IF NOT EXISTS deal_timeline (
    id          TEXT PRIMARY KEY,                          -- UUID
    deal_id     TEXT NOT NULL,
    event_type  TEXT NOT NULL
                CHECK (event_type IN (
                    'stage_change', 'status_change', 'field_change',
                    'email_sent', 'email_received',
                    'document_generated', 'document_signed', 'document_uploaded',
                    'talent_added', 'talent_selected',
                    'payment_made', 'note_added',
                    'discrepancy_flagged', 'discrepancy_resolved',
                    'approval_granted', 'offer_accepted',
                    'deliverable_completed', 'usage_expired',
                    'song_pitched', 'song_selected',
                    'license_status_change', 'license_sent', 'license_signed',
                    'fee_recalculated',
                    'task_created', 'task_completed'
                )),
    title       TEXT,
    description TEXT,
    old_value   TEXT,
    new_value   TEXT,
    metadata    TEXT,                                      -- JSON
    created_by  TEXT,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

CREATE INDEX idx_deal_timeline_deal_id    ON deal_timeline(deal_id);
CREATE INDEX idx_deal_timeline_event_type ON deal_timeline(event_type);
CREATE INDEX idx_deal_timeline_created_at ON deal_timeline(created_at);

-- ============================================================================
-- 10. DEAL_CHANGES - Change log for document sync
-- ============================================================================
CREATE TABLE IF NOT EXISTS deal_changes (
    id          TEXT PRIMARY KEY,                          -- UUID
    deal_id     TEXT NOT NULL,
    field_name  TEXT NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    source      TEXT NOT NULL
                CHECK (source IN ('offer_sheet', 'long_form', 'manual', 'brief_parser')),
    status      TEXT NOT NULL DEFAULT 'pending_review'
                CHECK (status IN ('pending_review', 'approved', 'reverted')),
    reviewed_by TEXT,
    reviewed_at DATETIME,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

CREATE INDEX idx_deal_changes_deal_id ON deal_changes(deal_id);
CREATE INDEX idx_deal_changes_status  ON deal_changes(status);

-- ============================================================================
-- 11. DOCUMENT_TEMPLATES - Uploaded contract templates per client
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_templates (
    id               TEXT PRIMARY KEY,                     -- UUID
    client_id        TEXT NOT NULL,
    sub_brand_id     TEXT,                                 -- nullable
    template_name    TEXT NOT NULL,
    template_type    TEXT NOT NULL
                     CHECK (template_type IN ('offer_sheet', 'long_form', 'sow', 'amendment')),
    template_content TEXT,                                 -- raw template text
    field_mappings   TEXT,                                 -- JSON: maps template placeholders to deal record fields
    is_active        INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (client_id)    REFERENCES clients(id)    ON DELETE CASCADE,
    FOREIGN KEY (sub_brand_id) REFERENCES sub_brands(id) ON DELETE SET NULL
);

CREATE INDEX idx_document_templates_client_id ON document_templates(client_id);

-- ============================================================================
-- 12. EMAIL_LOG - Emails sent/received in context of a deal
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_log (
    id            TEXT PRIMARY KEY,                        -- UUID
    deal_id       TEXT,                                    -- nullable
    talent_id     TEXT,                                    -- nullable
    rep_id        TEXT,                                    -- nullable
    direction     TEXT NOT NULL
                  CHECK (direction IN ('sent', 'received')),
    subject       TEXT,
    body          TEXT,
    to_email      TEXT,
    from_email    TEXT,
    template_used TEXT,
    sent_at       DATETIME,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (deal_id)   REFERENCES deals(id)  ON DELETE SET NULL,
    FOREIGN KEY (talent_id) REFERENCES talent(id)  ON DELETE SET NULL,
    FOREIGN KEY (rep_id)    REFERENCES reps(id)    ON DELETE SET NULL
);

CREATE INDEX idx_email_log_deal_id   ON email_log(deal_id);
CREATE INDEX idx_email_log_talent_id ON email_log(talent_id);
CREATE INDEX idx_email_log_rep_id    ON email_log(rep_id);

-- ============================================================================
-- Add deferred FK for sub_brands.contract_template_id -> document_templates
-- (created after document_templates table exists)
-- ============================================================================
-- Note: SQLite does not support ALTER TABLE ... ADD CONSTRAINT for foreign keys.
-- The contract_template_id on sub_brands is enforced at the application level.
-- If needed, recreate the table with the FK in a migration.

-- ============================================================================
-- TRIGGERS - Auto-update updated_at timestamps
-- ============================================================================

CREATE TRIGGER trg_clients_updated_at
    AFTER UPDATE ON clients
    FOR EACH ROW
BEGIN
    UPDATE clients SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER trg_sub_brands_updated_at
    AFTER UPDATE ON sub_brands
    FOR EACH ROW
BEGIN
    UPDATE sub_brands SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER trg_casting_frameworks_updated_at
    AFTER UPDATE ON casting_frameworks
    FOR EACH ROW
BEGIN
    UPDATE casting_frameworks SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER trg_talent_updated_at
    AFTER UPDATE ON talent
    FOR EACH ROW
BEGIN
    UPDATE talent SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER trg_reps_updated_at
    AFTER UPDATE ON reps
    FOR EACH ROW
BEGIN
    UPDATE reps SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER trg_deals_updated_at
    AFTER UPDATE ON deals
    FOR EACH ROW
BEGIN
    UPDATE deals SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER trg_deal_talent_shortlist_updated_at
    AFTER UPDATE ON deal_talent_shortlist
    FOR EACH ROW
BEGIN
    UPDATE deal_talent_shortlist SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER trg_document_templates_updated_at
    AFTER UPDATE ON document_templates
    FOR EACH ROW
BEGIN
    UPDATE document_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- ============================================================================
-- 13. DEAL_DOCUMENTS - Uploaded documents (briefs, deal sheets, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS deal_documents (
    id              TEXT PRIMARY KEY,
    deal_id         TEXT NOT NULL,
    filename        TEXT NOT NULL,
    original_name   TEXT NOT NULL,
    file_type       TEXT NOT NULL
                    CHECK (file_type IN ('pdf', 'docx', 'txt', 'doc')),
    doc_category    TEXT NOT NULL DEFAULT 'other'
                    CHECK (doc_category IN (
                        'creative_brief', 'casting_brief', 'deal_sheet',
                        'contract', 'amendment', 'other'
                    )),
    file_size       INTEGER NOT NULL,
    extracted_text  TEXT,
    parsed_data     TEXT,
    upload_status   TEXT NOT NULL DEFAULT 'uploaded'
                    CHECK (upload_status IN (
                        'uploaded', 'extracting', 'extracted',
                        'parsing', 'parsed', 'applied', 'error'
                    )),
    error_message   TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

CREATE INDEX idx_deal_documents_deal_id ON deal_documents(deal_id);
CREATE INDEX idx_deal_documents_status  ON deal_documents(upload_status);

CREATE TRIGGER trg_deal_documents_updated_at
    AFTER UPDATE ON deal_documents
    FOR EACH ROW
BEGIN
    UPDATE deal_documents SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- ============================================================================
-- 14. SONGS - Music catalog
-- ============================================================================
CREATE TABLE IF NOT EXISTS songs (
    id                TEXT PRIMARY KEY,                    -- UUID
    title             TEXT NOT NULL,
    artist_name       TEXT NOT NULL,
    album             TEXT,
    release_year      INTEGER,
    genre             TEXT,
    duration_seconds  INTEGER,
    isrc              TEXT,                                -- International Standard Recording Code
    spotify_url       TEXT,
    apple_music_url   TEXT,
    notes             TEXT,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_songs_artist ON songs(artist_name);

CREATE TRIGGER trg_songs_updated_at
    AFTER UPDATE ON songs
    FOR EACH ROW
BEGIN
    UPDATE songs SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- ============================================================================
-- 15. RIGHTS_HOLDERS - Labels, publishers, administrators, songwriters
-- ============================================================================
CREATE TABLE IF NOT EXISTS rights_holders (
    id                TEXT PRIMARY KEY,                    -- UUID
    name              TEXT NOT NULL,
    type              TEXT NOT NULL DEFAULT 'publisher'
                      CHECK (type IN ('label', 'publisher', 'administrator', 'songwriter', 'other')),
    parent_company    TEXT,
    pro_affiliation   TEXT,                                -- ASCAP, BMI, SESAC, etc.
    ipi_number        TEXT,                                -- Interested Parties Information number
    email             TEXT,
    phone             TEXT,
    contact_name      TEXT,
    contact_title     TEXT,
    address           TEXT,
    notes             TEXT,
    avg_response_days REAL,
    deals_offered     INTEGER NOT NULL DEFAULT 0,
    deals_closed      INTEGER NOT NULL DEFAULT 0,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rights_holders_name ON rights_holders(name);
CREATE INDEX idx_rights_holders_type ON rights_holders(type);

CREATE TRIGGER trg_rights_holders_updated_at
    AFTER UPDATE ON rights_holders
    FOR EACH ROW
BEGIN
    UPDATE rights_holders SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- ============================================================================
-- 16. SONG_RIGHTS_HOLDERS - M2M: songs <-> rights holders with side/share
-- ============================================================================
CREATE TABLE IF NOT EXISTS song_rights_holders (
    id                TEXT PRIMARY KEY,                    -- UUID
    song_id           TEXT NOT NULL,
    rights_holder_id  TEXT NOT NULL,
    side              TEXT NOT NULL
                      CHECK (side IN ('master', 'publishing')),
    share_percentage  REAL NOT NULL DEFAULT 100,           -- 0-100
    role              TEXT NOT NULL DEFAULT 'other'
                      CHECK (role IN ('label', 'publisher', 'songwriter', 'administrator', 'sub_publisher', 'other')),
    controlled_by_id  TEXT,                                -- FK to another rights_holder (administrator)
    territory         TEXT,                                -- e.g. 'Worldwide'
    notes             TEXT,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (song_id)          REFERENCES songs(id)          ON DELETE CASCADE,
    FOREIGN KEY (rights_holder_id) REFERENCES rights_holders(id) ON DELETE CASCADE,
    FOREIGN KEY (controlled_by_id) REFERENCES rights_holders(id) ON DELETE SET NULL
);

CREATE INDEX idx_song_rights_holders_song_id ON song_rights_holders(song_id);
CREATE INDEX idx_song_rights_holders_rh_id   ON song_rights_holders(rights_holder_id);

CREATE TRIGGER trg_song_rights_holders_updated_at
    AFTER UPDATE ON song_rights_holders
    FOR EACH ROW
BEGIN
    UPDATE song_rights_holders SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- ============================================================================
-- 17. DEAL_MUSIC_LICENSES - Per-party license tracking for music deals
-- ============================================================================
CREATE TABLE IF NOT EXISTS deal_music_licenses (
    id                TEXT PRIMARY KEY,                    -- UUID
    deal_id           TEXT NOT NULL,
    song_id           TEXT NOT NULL,
    rights_holder_id  TEXT NOT NULL,
    side              TEXT NOT NULL
                      CHECK (side IN ('master', 'publishing')),
    share_percentage  REAL NOT NULL DEFAULT 100,
    fee_amount        REAL,                                -- calculated: side_fee × (share% / 100)
    fee_override      REAL,                                -- manual override
    license_status    TEXT NOT NULL DEFAULT 'pending'
                      CHECK (license_status IN (
                          'pending', 'contacted', 'negotiating', 'agreed',
                          'license_sent', 'license_signed', 'rejected', 'expired'
                      )),
    contact_name      TEXT,
    contact_email     TEXT,
    notes             TEXT,
    sent_at           DATETIME,
    signed_at         DATETIME,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (deal_id)          REFERENCES deals(id)          ON DELETE CASCADE,
    FOREIGN KEY (song_id)          REFERENCES songs(id)          ON DELETE CASCADE,
    FOREIGN KEY (rights_holder_id) REFERENCES rights_holders(id) ON DELETE CASCADE
);

CREATE INDEX idx_deal_music_licenses_deal_id ON deal_music_licenses(deal_id);
CREATE INDEX idx_deal_music_licenses_song_id ON deal_music_licenses(song_id);
CREATE INDEX idx_deal_music_licenses_rh_id   ON deal_music_licenses(rights_holder_id);

CREATE TRIGGER trg_deal_music_licenses_updated_at
    AFTER UPDATE ON deal_music_licenses
    FOR EACH ROW
BEGIN
    UPDATE deal_music_licenses SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- ============================================================================
-- 18. DEAL_SONG_PITCHLIST - Songs pitched per deal
-- ============================================================================
CREATE TABLE IF NOT EXISTS deal_song_pitchlist (
    id              TEXT PRIMARY KEY,                      -- UUID
    deal_id         TEXT NOT NULL,
    song_id         TEXT NOT NULL,
    pitch_status    TEXT NOT NULL DEFAULT 'considering'
                    CHECK (pitch_status IN (
                        'considering', 'pitched', 'client_reviewing',
                        'selected', 'rejected', 'on_hold'
                    )),
    client_notes    TEXT,
    internal_notes  TEXT,
    fit_score       INTEGER CHECK (fit_score BETWEEN 1 AND 5),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE INDEX idx_deal_song_pitchlist_deal_id ON deal_song_pitchlist(deal_id);
CREATE INDEX idx_deal_song_pitchlist_song_id ON deal_song_pitchlist(song_id);

CREATE TRIGGER trg_deal_song_pitchlist_updated_at
    AFTER UPDATE ON deal_song_pitchlist
    FOR EACH ROW
BEGIN
    UPDATE deal_song_pitchlist SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
