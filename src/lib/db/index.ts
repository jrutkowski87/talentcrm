import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const PROJECT_ROOT = process.cwd();
const DB_DIR = path.join(PROJECT_ROOT, 'data');
const DB_PATH = path.join(DB_DIR, 'talent-crm.db');
const SCHEMA_PATH = path.join(PROJECT_ROOT, 'src', 'lib', 'db', 'schema.sql');

let _db: Database.Database | null = null;

function initDb(): Database.Database {
  if (_db) return _db;

  // Ensure the data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Create or open the database
  _db = new Database(DB_PATH);

  // Set a busy timeout so concurrent access doesn't immediately fail
  _db.pragma('busy_timeout = 5000');

  // Enable WAL mode for better concurrent read performance
  _db.pragma('journal_mode = WAL');

  // Enable foreign key enforcement
  _db.pragma('foreign_keys = ON');

  // Initialize the schema if the database is new (no tables exist)
  const tableCheck = _db
    .prepare(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    .get() as { count: number };

  if (tableCheck.count === 0) {
    if (fs.existsSync(SCHEMA_PATH)) {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      _db.exec(schema);
    } else {
      console.warn(
        `Schema file not found at ${SCHEMA_PATH}. Database will be empty until schema is applied.`
      );
    }
  }

  // Run migrations for existing databases
  ensureMigrations(_db);

  return _db;
}

/**
 * Run schema migrations for tables that may not exist in older databases.
 */
function ensureMigrations(db: Database.Database): void {
  // Migration: deal_documents table
  const hasDealDocs = db
    .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='deal_documents'")
    .get() as { count: number };

  if (hasDealDocs.count === 0) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS deal_documents (
          id              TEXT PRIMARY KEY,
          deal_id         TEXT NOT NULL,
          filename        TEXT NOT NULL,
          original_name   TEXT NOT NULL,
          file_type       TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt', 'doc')),
          doc_category    TEXT NOT NULL DEFAULT 'other'
                          CHECK (doc_category IN ('creative_brief', 'casting_brief', 'deal_sheet', 'contract', 'amendment', 'other')),
          file_size       INTEGER NOT NULL,
          extracted_text  TEXT,
          parsed_data     TEXT,
          upload_status   TEXT NOT NULL DEFAULT 'uploaded'
                          CHECK (upload_status IN ('uploaded', 'extracting', 'extracted', 'parsing', 'parsed', 'applied', 'error')),
          error_message   TEXT,
          created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_deal_documents_deal_id ON deal_documents(deal_id);
      CREATE INDEX IF NOT EXISTS idx_deal_documents_status  ON deal_documents(upload_status);
      CREATE TRIGGER IF NOT EXISTS trg_deal_documents_updated_at
          AFTER UPDATE ON deal_documents FOR EACH ROW
      BEGIN
          UPDATE deal_documents SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
      END;
    `);
  }

  // Migration: Add stage gates, offer snapshot, fulfillment, and admin columns to deals table
  const dealsColumns = db
    .prepare("PRAGMA table_info('deals')")
    .all() as { name: string }[];
  const columnNames = new Set(dealsColumns.map((c) => c.name));

  const newDealColumns: [string, string][] = [
    ['approval_to_engage_at', 'DATETIME'],
    ['approval_to_engage_by', 'TEXT'],
    ['approval_notes', 'TEXT'],
    ['offer_snapshot', 'TEXT'],
    ['usage_start_date', 'DATE'],
    ['usage_end_date', 'DATE'],
    ['deliverables_status', 'TEXT'],
    ['admin_checklist', 'TEXT'],
    ['w9_received', 'INTEGER NOT NULL DEFAULT 0'],
    ['w9_received_date', 'DATE'],
    ['invoice_received', 'INTEGER NOT NULL DEFAULT 0'],
    ['invoice_received_date', 'DATE'],
  ];

  for (const [colName, colDef] of newDealColumns) {
    if (!columnNames.has(colName)) {
      try {
        db.exec(`ALTER TABLE deals ADD COLUMN ${colName} ${colDef}`);
      } catch {
        // Column may already exist via schema — swallow
      }
    }
  }

  // Migration: Music licensing columns on deals table
  const musicDealColumns: [string, string][] = [
    ['deal_type', "TEXT NOT NULL DEFAULT 'talent'"],
    ['song_id', 'TEXT'],
    ['license_type', 'TEXT'],
    ['usage_type', 'TEXT'],
    ['territory', 'TEXT'],
    ['media', 'TEXT'],
    ['fee_per_side', 'REAL'],
    ['master_fee_override', 'REAL'],
  ];

  // Re-read column names in case the first migration added columns
  const dealsColumnsRefresh = db
    .prepare("PRAGMA table_info('deals')")
    .all() as { name: string }[];
  const columnNamesRefresh = new Set(dealsColumnsRefresh.map((c) => c.name));

  for (const [colName, colDef] of musicDealColumns) {
    if (!columnNamesRefresh.has(colName)) {
      try {
        db.exec(`ALTER TABLE deals ADD COLUMN ${colName} ${colDef}`);
      } catch {
        // Column may already exist via schema — swallow
      }
    }
  }

  // Migration: music_status column for dual-pipeline tracking on "Both" deals
  if (!columnNamesRefresh.has('music_status')) {
    try {
      db.exec(`ALTER TABLE deals ADD COLUMN music_status TEXT DEFAULT NULL`);
    } catch {
      // Column may already exist
    }
  }

  // Migration: Remove restrictive CHECK constraint on deals.status that blocks music statuses.
  // SQLite CHECK constraints can only be changed by recreating the table.
  // We detect the old constraint by checking the CREATE TABLE SQL for the restricted IN() list.
  const dealsSql = (db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='deals'")
    .get() as { sql: string } | undefined)?.sql ?? '';
  const hasRestrictiveCheck = dealsSql.includes("'creative_brief', 'outreach', 'shortlist'") &&
    !dealsSql.includes("'music_brief'");

  if (hasRestrictiveCheck) {
    // Rebuild the deals table without the restrictive status CHECK.
    // SQLite requires table recreation to modify constraints.
    db.exec('PRAGMA foreign_keys = OFF');
    db.transaction(() => {
      // 1. Read all column names from the current table
      const colInfo = db.prepare("PRAGMA table_info('deals')").all() as { name: string }[];
      const colNames = colInfo.map((c) => c.name);
      const colList = colNames.join(', ');

      // 2. Copy data to temp table
      db.exec(`CREATE TABLE deals_backup AS SELECT ${colList} FROM deals`);

      // 3. Drop old table
      db.exec('DROP TABLE deals');

      // 4. Recreate without CHECK on status — strip the CHECK(...) block including
      //    its multiline content. The regex must handle nested parens in the IN() list.
      let newCreateSql = dealsSql;
      // Match: CHECK followed by balanced parens (the IN list is inside nested parens)
      newCreateSql = newCreateSql.replace(
        /\bCHECK\s*\(status\s+IN\s*\([\s\S]*?\)\s*\)/i,
        ''
      );
      // Clean up any resulting double commas or trailing comma before closing paren
      newCreateSql = newCreateSql.replace(/,\s*,/g, ',');
      newCreateSql = newCreateSql.replace(/,\s*\)/g, ')');

      db.exec(newCreateSql);

      // 5. Copy data back
      db.exec(`INSERT INTO deals (${colList}) SELECT ${colList} FROM deals_backup`);

      // 6. Drop backup
      db.exec('DROP TABLE deals_backup');
    })();
    db.exec('PRAGMA foreign_keys = ON');
  }

  // Migration: songs table
  const hasSongs = db
    .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='songs'")
    .get() as { count: number };

  if (hasSongs.count === 0) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS songs (
          id                TEXT PRIMARY KEY,
          title             TEXT NOT NULL,
          artist_name       TEXT NOT NULL,
          album             TEXT,
          release_year      INTEGER,
          genre             TEXT,
          duration_seconds  INTEGER,
          isrc              TEXT,
          spotify_url       TEXT,
          apple_music_url   TEXT,
          notes             TEXT,
          created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
      CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist_name);
      CREATE TRIGGER IF NOT EXISTS trg_songs_updated_at
          AFTER UPDATE ON songs FOR EACH ROW
      BEGIN
          UPDATE songs SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
      END;
    `);
  }

  // Migration: rights_holders table
  const hasRightsHolders = db
    .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='rights_holders'")
    .get() as { count: number };

  if (hasRightsHolders.count === 0) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS rights_holders (
          id                TEXT PRIMARY KEY,
          name              TEXT NOT NULL,
          type              TEXT NOT NULL DEFAULT 'publisher'
                            CHECK (type IN ('label', 'publisher', 'administrator', 'songwriter', 'other')),
          parent_company    TEXT,
          pro_affiliation   TEXT,
          ipi_number        TEXT,
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
      CREATE INDEX IF NOT EXISTS idx_rights_holders_name ON rights_holders(name);
      CREATE INDEX IF NOT EXISTS idx_rights_holders_type ON rights_holders(type);
      CREATE TRIGGER IF NOT EXISTS trg_rights_holders_updated_at
          AFTER UPDATE ON rights_holders FOR EACH ROW
      BEGIN
          UPDATE rights_holders SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
      END;
    `);
  }

  // Migration: song_rights_holders table
  const hasSongRights = db
    .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='song_rights_holders'")
    .get() as { count: number };

  if (hasSongRights.count === 0) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS song_rights_holders (
          id                TEXT PRIMARY KEY,
          song_id           TEXT NOT NULL,
          rights_holder_id  TEXT NOT NULL,
          side              TEXT NOT NULL CHECK (side IN ('master', 'publishing')),
          share_percentage  REAL NOT NULL DEFAULT 100,
          role              TEXT NOT NULL DEFAULT 'other'
                            CHECK (role IN ('label', 'publisher', 'songwriter', 'administrator', 'sub_publisher', 'other')),
          controlled_by_id  TEXT,
          territory         TEXT,
          notes             TEXT,
          created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (song_id)          REFERENCES songs(id)          ON DELETE CASCADE,
          FOREIGN KEY (rights_holder_id) REFERENCES rights_holders(id) ON DELETE CASCADE,
          FOREIGN KEY (controlled_by_id) REFERENCES rights_holders(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_song_rights_holders_song_id ON song_rights_holders(song_id);
      CREATE INDEX IF NOT EXISTS idx_song_rights_holders_rh_id   ON song_rights_holders(rights_holder_id);
      CREATE TRIGGER IF NOT EXISTS trg_song_rights_holders_updated_at
          AFTER UPDATE ON song_rights_holders FOR EACH ROW
      BEGIN
          UPDATE song_rights_holders SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
      END;
    `);
  }

  // Migration: deal_music_licenses table
  const hasMusicLicenses = db
    .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='deal_music_licenses'")
    .get() as { count: number };

  if (hasMusicLicenses.count === 0) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS deal_music_licenses (
          id                TEXT PRIMARY KEY,
          deal_id           TEXT NOT NULL,
          song_id           TEXT NOT NULL,
          rights_holder_id  TEXT NOT NULL,
          side              TEXT NOT NULL CHECK (side IN ('master', 'publishing')),
          share_percentage  REAL NOT NULL DEFAULT 100,
          fee_amount        REAL,
          fee_override      REAL,
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
      CREATE INDEX IF NOT EXISTS idx_deal_music_licenses_deal_id ON deal_music_licenses(deal_id);
      CREATE INDEX IF NOT EXISTS idx_deal_music_licenses_song_id ON deal_music_licenses(song_id);
      CREATE INDEX IF NOT EXISTS idx_deal_music_licenses_rh_id   ON deal_music_licenses(rights_holder_id);
      CREATE TRIGGER IF NOT EXISTS trg_deal_music_licenses_updated_at
          AFTER UPDATE ON deal_music_licenses FOR EACH ROW
      BEGIN
          UPDATE deal_music_licenses SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
      END;
    `);
  }

  // Migration: deal_song_pitchlist table
  const hasPitchlist = db
    .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='deal_song_pitchlist'")
    .get() as { count: number };

  if (hasPitchlist.count === 0) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS deal_song_pitchlist (
          id              TEXT PRIMARY KEY,
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
      CREATE INDEX IF NOT EXISTS idx_deal_song_pitchlist_deal_id ON deal_song_pitchlist(deal_id);
      CREATE INDEX IF NOT EXISTS idx_deal_song_pitchlist_song_id ON deal_song_pitchlist(song_id);
      CREATE TRIGGER IF NOT EXISTS trg_deal_song_pitchlist_updated_at
          AFTER UPDATE ON deal_song_pitchlist FOR EACH ROW
      BEGIN
          UPDATE deal_song_pitchlist SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
      END;
    `);
  }

  // FK fix migration completed — child tables rebuilt to fix stale FK references
  // after deals table was recreated to remove CHECK constraint. (2024)

  // Migration: deal_notes table
  const hasDealNotes = db
    .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='deal_notes'")
    .get() as { count: number };

  if (hasDealNotes.count === 0) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS deal_notes (
          id          TEXT PRIMARY KEY,
          deal_id     TEXT NOT NULL,
          content     TEXT NOT NULL,
          created_by  TEXT,
          created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_deal_notes_deal_id ON deal_notes(deal_id);
      CREATE INDEX IF NOT EXISTS idx_deal_notes_created_at ON deal_notes(created_at);
      CREATE TRIGGER IF NOT EXISTS trg_deal_notes_updated_at
          AFTER UPDATE ON deal_notes FOR EACH ROW
      BEGIN
          UPDATE deal_notes SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
      END;
    `);
  }
}

/**
 * Generate a new UUID v4 string for use as a primary key.
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Get the current timestamp as an ISO 8601 datetime string.
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Return the database instance for direct query access.
 * Lazily initializes the database on first call.
 */
export function getDb(): Database.Database {
  return initDb();
}

export default { getDb, generateId, getCurrentTimestamp };
