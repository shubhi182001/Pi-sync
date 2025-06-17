const fs = require('fs').promises;
const path = require('path');
const Database = require('../src/config/database');

class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname);
    this.migrationsTable = 'migrations';
  }

  async init() {
    // Create migrations table if it doesn't exist
    await Database.query(`
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getExecutedMigrations() {
    const result = await Database.query(
      `SELECT filename FROM ${this.migrationsTable} ORDER BY executed_at`
    );
    return result.rows.map(row => row.filename);
  }

  async getMigrationFiles() {
    const files = await fs.readdir(this.migrationsDir);
    return files
      .filter(file => file.endsWith('.js') && file !== 'migrate.js')
      .sort();
  }

  async runMigration(filename, direction = 'up') {
    const migrationPath = path.join(this.migrationsDir, filename);
    const migration = require(migrationPath);

    if (typeof migration[direction] !== 'function') {
      throw new Error(`Migration ${filename} does not export a ${direction} function`);
    }

    console.log(`\n Running migration: ${filename} (${direction})`);
    await migration[direction]();

    if (direction === 'up') {
      await Database.query(
        `INSERT INTO ${this.migrationsTable} (filename) VALUES ($1)`,
        [filename]
      );
    } else {
      await Database.query(
        `DELETE FROM ${this.migrationsTable} WHERE filename = $1`,
        [filename]
      );
    }
  }

  async up() {
    await this.init();
    
    const executedMigrations = await this.getExecutedMigrations();
    const migrationFiles = await this.getMigrationFiles();
    
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      console.log(' No pending migrations');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migration(s)`);
    
    for (const filename of pendingMigrations) {
      await this.runMigration(filename, 'up');
    }

    console.log('\n All migrations completed successfully!');
  }

  async down(steps = 1) {
    await this.init();
    
    const executedMigrations = await this.getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log(' No migrations to rollback');
      return;
    }

    const migrationsToRollback = executedMigrations
      .slice(-steps)
      .reverse();

    console.log(`Rolling back ${migrationsToRollback.length} migration(s)`);
    
    for (const filename of migrationsToRollback) {
      await this.runMigration(filename, 'down');
    }

    console.log('\n Rollback completed successfully!');
  }

  async status() {
    await this.init();
    
    const executedMigrations = await this.getExecutedMigrations();
    const migrationFiles = await this.getMigrationFiles();
    
    console.log('\n Migration Status:');
    console.log('===================');
    
    for (const filename of migrationFiles) {
      const status = executedMigrations.includes(filename) ? '✅' : '⏳';
      console.log(`${status} ${filename}`);
    }
    
    const pendingCount = migrationFiles.length - executedMigrations.length;
    console.log(`\nExecuted: ${executedMigrations.length}`);
    console.log(`Pending: ${pendingCount}`);
  }
}

// CLI Interface
const runCLI = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const runner = new MigrationRunner();
  
  try {
    switch (command) {
      case 'up':
        await runner.up();
        break;
      case 'down':
        const steps = parseInt(args[1]) || 1;
        await runner.down(steps);
        break;
      case 'status':
        await runner.status();
        break;
      default:
        console.log('Usage:');
        console.log('  node migrations/migrate.js up     - Run pending migrations');
        console.log('  node migrations/migrate.js down [steps] - Rollback migrations');
        console.log('  node migrations/migrate.js status - Show migration status');
        process.exit(1);
    }
  } catch (error) {
    console.error(' Migration error:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

// Run CLI if this file is executed directly
if (require.main === module) {
  runCLI();
}

module.exports = MigrationRunner;