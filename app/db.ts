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

`)

export default db