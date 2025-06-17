/**
 * Migration: Create devices and sync_events tables
 * Created: 2025-06-17
 */

const Database = require('../src/config/database'); // Adjust the path as necessary

const up = async () => {
  console.log('Running migration: Create devices and sync_events tables');

  try {
    // Create devices table
    await Database.query(`
      CREATE TABLE devices (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created devices table');

    // Create sync_events table
    await Database.query(`
      CREATE TABLE sync_events (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        total_files_synced INTEGER NOT NULL DEFAULT 0,
        total_errors INTEGER NOT NULL DEFAULT 0,
        internet_speed DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
      )
    `);
    console.log('Created sync_events table');

    // Create indexes for better performance
    await Database.query(`
      CREATE INDEX idx_sync_events_device_id ON sync_events(device_id)
    `);
    console.log('Created index on sync_events.device_id');

    await Database.query(`
      CREATE INDEX idx_sync_events_timestamp ON sync_events(timestamp)
    `);
    console.log('Created index on sync_events.timestamp');

    await Database.query(`
      CREATE INDEX idx_sync_events_created_at ON sync_events(created_at)
    `);
    console.log('Created index on sync_events.created_at');

    // Create function to automatically update updated_at timestamp
    await Database.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    console.log('Created update_updated_at_column function');

    // Create triggers to automatically update updated_at
    await Database.query(`
      CREATE TRIGGER update_devices_updated_at 
          BEFORE UPDATE ON devices 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('Created trigger for devices table');

    await Database.query(`
      CREATE TRIGGER update_sync_events_updated_at 
          BEFORE UPDATE ON sync_events 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('Created trigger for sync_events table');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

const down = async () => {
  console.log('Rolling back migration: Create devices and sync_events tables');

  try {
    // Drop triggers
    await Database.query('DROP TRIGGER IF EXISTS update_sync_events_updated_at ON sync_events');
    console.log('Dropped sync_events trigger');

    await Database.query('DROP TRIGGER IF EXISTS update_devices_updated_at ON devices');
    console.log('Dropped devices trigger');

    // Drop function
    await Database.query('DROP FUNCTION IF EXISTS update_updated_at_column()');
    console.log('Dropped update_updated_at_column function');

    // Drop indexes
    await Database.query('DROP INDEX IF EXISTS idx_sync_events_created_at');
    await Database.query('DROP INDEX IF EXISTS idx_sync_events_timestamp');
    await Database.query('DROP INDEX IF EXISTS idx_sync_events_device_id');
    console.log('Dropped indexes');

    // Drop tables (order matters due to foreign key)
    await Database.query('DROP TABLE IF EXISTS sync_events');
    console.log('Dropped sync_events table');

    await Database.query('DROP TABLE IF EXISTS devices');
    console.log('Dropped devices table');

    console.log('Rollback completed successfully!');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
};

module.exports = {
  up,
  down
};