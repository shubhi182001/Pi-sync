const db = require('../config/database');
const logger = require('../config/logger');

class Device {
  static async findOrCreate(deviceId) {
    try {
      const findQuery = 'SELECT * FROM devices WHERE device_id = $1';
      const findResult = await db.query(findQuery, [deviceId]);
      
      if (findResult.rows.length > 0) {
        return findResult.rows[0];
      }

      const createQuery = `
        INSERT INTO devices (device_id, created_at, updated_at) 
        VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
        RETURNING *
      `;
      const createResult = await db.query(createQuery, [deviceId]);
      
      logger.info(`New device registered: ${deviceId}`);
      return createResult.rows[0];
    } catch (error) {
      logger.error('Error in Device.findOrCreate:', error);
      throw error;
    }
  }

  static async updateLastSeen(deviceId) {
    try {
      const query = `
        UPDATE devices 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE device_id = $1
      `;
      await db.query(query, [deviceId]);
    } catch (error) {
      logger.error('Error updating device last seen:', error);
      throw error;
    }
  }

  static async getDevicesWithRepeatedFailures(threshold = 3) {
    try {
      const query = `
        SELECT 
          d.device_id,
          d.created_at,
          d.updated_at,
          COUNT(se.id) as total_failed_syncs,
          MAX(se.timestamp) as last_failed_sync
        FROM devices d
        INNER JOIN sync_events se ON d.device_id = se.device_id
        WHERE se.total_errors > 0
        GROUP BY d.device_id, d.created_at, d.updated_at
        HAVING COUNT(se.id) >= $1
        ORDER BY total_failed_syncs DESC, last_failed_sync DESC
      `;
      
      const result = await db.query(query, [threshold]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting devices with repeated failures:', error);
      throw error;
    }
  }

  static async getConsecutiveFailures(deviceId, limit = 3) {
    try {
      const query = `
        SELECT * FROM sync_events 
        WHERE device_id = $1 
        ORDER BY timestamp DESC 
        LIMIT $2
      `;
      
      const result = await db.query(query, [deviceId, limit]);
      const recentEvents = result.rows;
      
      // Check if all recent events have errors
      const allHaveErrors = recentEvents.length >= limit && 
                           recentEvents.every(event => event.total_errors > 0);
      
      return {
        hasConsecutiveFailures: allHaveErrors,
        consecutiveFailureCount: allHaveErrors ? recentEvents.length : 0,
        recentEvents
      };
    } catch (error) {
      logger.error('Error checking consecutive failures:', error);
      throw error;
    }
  }
}

module.exports = Device;