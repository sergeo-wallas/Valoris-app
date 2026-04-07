import Database from "better-sqlite3"
import path from "path"

const db = new Database(path.join(process.cwd(), "prisma", "dev.db"))

db.exec(`

  -- Table 1 : Identité entreprise
  CREATE TABLE IF NOT EXISTS Company (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    siren       TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    type        TEXT,
    sector      TEXT,
    naf_code    TEXT,
    country     TEXT DEFAULT 'France',
    headcount   INTEGER,
    legal_form  TEXT,
    owner_email TEXT,
    createdAt   TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Table 2 : États financiers par année
  CREATE TABLE IF NOT EXISTS FinancialStatement (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id       INTEGER NOT NULL,
    fiscal_year      INTEGER NOT NULL,
    revenue          REAL,
    gross_margin     REAL,
    ebitda           REAL,
    ebit             REAL,
    net_income       REAL,
    tax_rate         REAL DEFAULT 0.25,
    total_assets     REAL,
    equity           REAL,
    net_debt         REAL,
    working_capital  REAL,
    capex            REAL,
    delta_wc         REAL,
    fcf              REAL,
    FOREIGN KEY (company_id) REFERENCES Company(id)
  );

  -- Table 3 : Paramètres WACC
  CREATE TABLE IF NOT EXISTS WACCParameters (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id          INTEGER NOT NULL,
    beta_unlevered      REAL,
    beta_relevered      REAL,
    debt_equity_ratio   REAL,
    risk_free_rate      REAL,
    market_premium      REAL,
    size_premium        REAL DEFAULT 0.03,
    illiquidity_premium REAL DEFAULT 0.025,
    ke                  REAL,
    kd_gross            REAL,
    kd_net              REAL,
    wacc                REAL,
    scenario            TEXT DEFAULT 'base',
    createdAt           TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES Company(id)
  );

  -- Table 4 : Résultats DCF
  CREATE TABLE IF NOT EXISTS DCFModel (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id            INTEGER NOT NULL,
    wacc_id               INTEGER,
    projection_years      INTEGER DEFAULT 5,
    terminal_growth_rate  REAL DEFAULT 0.02,
    pv_fcf                REAL,
    terminal_value        REAL,
    enterprise_value      REAL,
    equity_value          REAL,
    ev_ebitda             REAL,
    scenario              TEXT DEFAULT 'base',
    createdAt             TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES Company(id),
    FOREIGN KEY (wacc_id) REFERENCES WACCParameters(id)
  );

  -- Table 5 : Critères ESG (flexible EAV)
  CREATE TABLE IF NOT EXISTS ESGCriteria (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id     INTEGER NOT NULL,
    fiscal_year    INTEGER NOT NULL,
    pillar         TEXT NOT NULL,
    criterion_code TEXT NOT NULL,
    criterion_name TEXT NOT NULL,
    score          REAL DEFAULT 0,
    max_score      REAL DEFAULT 2,
    FOREIGN KEY (company_id) REFERENCES Company(id)
  );

  -- Table 6 : Cibles de sourcing (investisseur)
  CREATE TABLE IF NOT EXISTS Target (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    siren         TEXT NOT NULL,
    name          TEXT NOT NULL,
    sector        TEXT,
    legal_form    TEXT,
    naf_code      TEXT,
    headcount     TEXT,
    status        TEXT DEFAULT 'prospect',
    note          TEXT,
    owner_email   TEXT,
    createdAt     TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Table 7 : Positions portefeuille (investisseur)
  CREATE TABLE IF NOT EXISTS Position (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    sector        TEXT,
    date_entree   TEXT NOT NULL,
    date_sortie   TEXT,
    mise          REAL NOT NULL,
    valeur        REAL,
    statut        TEXT DEFAULT 'actif',
    note          TEXT,
    owner_email   TEXT,
    createdAt     TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Table 8 : Comparables personnalisés (investisseur)
  CREATE TABLE IF NOT EXISTS Comparable (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    sector      TEXT,
    ev_ebitda   REAL,
    ev_revenue  REAL,
    pe          REAL,
    ev_ebit     REAL,
    note        TEXT,
    owner_email TEXT,
    createdAt   TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Table 8 : Deals pipeline (investisseur)
  CREATE TABLE IF NOT EXISTS Deal (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    siren         TEXT,
    sector        TEXT,
    stage         TEXT DEFAULT 'analyse',
    ev_cible      REAL,
    note          TEXT,
    owner_email   TEXT,
    createdAt     TEXT DEFAULT CURRENT_TIMESTAMP
  );

`)

// Migration : ajoute owner_email si la colonne n'existe pas encore
const cols = db.prepare("PRAGMA table_info(Company)").all() as { name: string }[]
if (!cols.some(c => c.name === "owner_email")) {
  db.exec("ALTER TABLE Company ADD COLUMN owner_email TEXT")
}

export default db