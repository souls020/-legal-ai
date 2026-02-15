import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'legal_docs.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  return db;
}

export async function saveDb(): Promise<void> {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export async function initSchema(): Promise<void> {
  const database = await getDb();

  // Create tables
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT,
      wechat_openid TEXT UNIQUE,
      wechat_unionid TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'banned')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      name TEXT,
      avatar TEXT,
      default_role TEXT DEFAULT 'user' CHECK(default_role IN ('user', 'lawyer', 'admin')),
      bio TEXT,
      last_login_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Document types table
  database.run(`
    CREATE TABLE IF NOT EXISTS document_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Template categories table
  database.run(`
    CREATE TABLE IF NOT EXISTS template_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES template_categories(id)
    )
  `);

  // Templates table
  database.run(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_id INTEGER,
      category_id INTEGER,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      variables TEXT,
      usage_count INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      is_official INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (type_id) REFERENCES document_types(id),
      FOREIGN KEY (category_id) REFERENCES template_categories(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Documents table
  database.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type_id INTEGER,
      title TEXT NOT NULL,
      content TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'generated', 'edited', 'exported', 'archived')),
      version INTEGER DEFAULT 1,
      ai_model TEXT,
      ai_prompt TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (type_id) REFERENCES document_types(id)
    )
  `);

  // Document drafts table for autosave
  database.run(`
    CREATE TABLE IF NOT EXISTS document_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      document_id INTEGER,
      content TEXT NOT NULL,
      auto_saved INTEGER DEFAULT 0,
      last_saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `);

  // Document versions table for version history
  database.run(`
    CREATE TABLE IF NOT EXISTS document_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      title TEXT,
      changed_by INTEGER,
      change_summary TEXT,
      version INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id)
    )
  `);

  // Document history table
  database.run(`
    CREATE TABLE IF NOT EXISTS document_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type_id INTEGER,
      document_id INTEGER,
      title_preview TEXT,
      action TEXT DEFAULT 'created',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (type_id) REFERENCES document_types(id),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for performance
  database.run(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_users_wechat ON users(wechat_openid)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_doc_types_category ON document_types(category)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_drafts_user ON document_drafts(user_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_drafts_document ON document_drafts(document_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_versions_document ON document_versions(document_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_history_user ON document_history(user_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_history_type ON document_history(type_id)`);

  // Subscription plans table
  database.run(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      price REAL DEFAULT 0,
      currency TEXT DEFAULT 'CNY',
      monthly_quota INTEGER DEFAULT 0,
      daily_quota INTEGER DEFAULT 0,
      features TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User subscriptions table
  database.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      plan_id INTEGER NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'cancelled', 'expired')),
      starts_at DATETIME NOT NULL,
      expires_at DATETIME NOT NULL,
      monthly_generations INTEGER DEFAULT 0,
      used_generations INTEGER DEFAULT 0,
      daily_generations INTEGER DEFAULT 0,
      today_generations INTEGER DEFAULT 0,
      auto_renew INTEGER DEFAULT 1,
      payment_method TEXT,
      payment_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    )
  `);

  // Usage records table
  database.run(`
    CREATE TABLE IF NOT EXISTS usage_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subscription_id INTEGER,
      document_id INTEGER,
      action_type TEXT NOT NULL CHECK(action_type IN ('generate', 'regenerate', 'export', 'template_use')),
      quota_used INTEGER DEFAULT 1,
      ai_model TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
      FOREIGN KEY (document_id) REFERENCES documents(id)
    )
  `);

  // Subscription plans indexes
  database.run(`CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_subs_plan ON subscriptions(plan_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_records(user_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_usage_subscription ON usage_records(subscription_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_usage_document ON usage_records(document_id)`);

  // Regulation categories table
  database.run(`
    CREATE TABLE IF NOT EXISTS regulation_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES regulation_categories(id)
    )
  `);

  // Regulations table
  database.run(`
    CREATE TABLE IF NOT EXISTS regulations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category_id INTEGER,
      category TEXT,
      content TEXT NOT NULL,
      chapter TEXT,
      article TEXT,
      effective_date DATE,
      expiry_date DATE,
      jurisdiction TEXT DEFAULT 'national',
      status TEXT DEFAULT 'effective' CHECK(status IN ('effective', 'repealed', 'amended', 'expired')),
      source_name TEXT,
      source_url TEXT,
      version INTEGER DEFAULT 1,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES regulation_categories(id)
    )
  `);

  // Regulation versions table
  database.run(`
    CREATE TABLE IF NOT EXISTS regulation_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      regulation_id INTEGER NOT NULL,
      version_number INTEGER NOT NULL,
      content_snapshot TEXT NOT NULL,
      change_type TEXT CHECK(change_type IN ('amendment', 'repeal', 'new_version')),
      change_description TEXT,
      effective_from DATE,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (regulation_id) REFERENCES regulations(id) ON DELETE CASCADE
    )
  `);

  // Regulation indexes
  database.run(`CREATE INDEX IF NOT EXISTS idx_reg_category ON regulations(category)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_reg_jurisdiction ON regulations(jurisdiction)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_reg_status ON regulations(status)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_reg_effective_date ON regulations(effective_date)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_reg_versions_reg ON regulation_versions(regulation_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_reg_cats_parent ON regulation_categories(parent_id)`);

  // Create migrations tracking table
  database.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await saveDb();
  console.log('Database schema created successfully');
}

// Helper functions for common operations
export function dbRun(sql: string, params?: unknown[]): void {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
}

export function dbGet<T>(sql: string, params?: unknown[]): T | undefined {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params || []);
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result as T;
  }
  stmt.free();
  return undefined;
}

export function dbAll<T>(sql: string, params?: unknown[]): T[] {
  if (!db) throw new Error('Database not initialized');
  const results: T[] = [];
  const stmt = db.prepare(sql);
  stmt.bind(params || []);
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}
