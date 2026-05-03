import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';

/**
 * SQLite database manager for desktop app using better-sqlite3
 * Placeholder implementation - will be fully implemented when business logic is added
 */

export class DesktopDatabase {
  private db: Database.Database | null = null;

  constructor() {
    // Database will be stored in user data directory
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'cashmgr.db');

    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize() {
    if (!this.db) return;

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Placeholder: Schema initialization will use @cashmgr/db package
    console.log('Database initialized at:', this.db.name);
  }

  query(sql: string, params: unknown[] = []): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  execute(sql: string, params: unknown[] = []): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
