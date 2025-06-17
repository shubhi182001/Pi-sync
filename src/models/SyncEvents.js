const db = require('../config/database');
const logger = require('../config/logger');

class SyncEvent {
  static async create(eventData) {
    try {
      const { device_id, timestamp, total_files_synced, total_errors, internet_speed } = eventData;
      
      const query = `
        INSERT INTO sync_events (device_id, timestamp, total_files_synced, total_errors, internet_speed, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const values = [device_id, timestamp, total_files_synced, total_errors, internet_speed];
      const result = await db.query(query, values);
      
      logger.info(`Sync event created for device ${device_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating sync event:', error);
      throw error;
    }
  }

  static async getByDeviceId(deviceId, options = {}) {
    try {
      const { limit = 50, offset = 0, startDate, endDate } = options;
      
      let query = `
        SELECT * FROM sync_events 
        WHERE device_id = $1
      `;
      let values = [deviceId];
      let paramCount = 1;

      if (startDate) {
        paramCount++;
        query += ` AND timestamp >= $${paramCount}`;
        values.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND timestamp <= $${paramCount}`;
        values.push(endDate);
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(limit, offset);

      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching sync events by device ID:', error);
      throw error;
    }
  }

  static async getDeviceStats(deviceId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_syncs,
          SUM(total_files_synced) as total_files_synced,
          SUM(total_errors) as total_errors,
          AVG(internet_speed) as avg_internet_speed,
          MAX(timestamp) as last_sync,
          MIN(timestamp) as first_sync,
          COUNT(CASE WHEN total_errors > 0 THEN 1 END) as failed_syncs,
          COUNT(CASE WHEN total_errors = 0 THEN 1 END) as successful_syncs
        FROM sync_events 
        WHERE device_id = $1
      `;
      
      const result = await db.query(query, [deviceId]);
      const stats = result.rows[0];
      
      const totalSyncs = parseInt(stats.total_syncs);
      const successfulSyncs = parseInt(stats.successful_syncs);
      stats.success_rate = totalSyncs > 0 ? (successfulSyncs / totalSyncs * 100).toFixed(2) : 0;
      
      return stats;
    } catch (error) {
      logger.error('Error calculating device stats:', error);
      throw error;
    }
  }

  static async getBulkStats(limit = 100) {
    try {
      const query = `
        SELECT 
          device_id,
          COUNT(*) as total_syncs,
          SUM(total_files_synced) as total_files_synced,
          SUM(total_errors) as total_errors,
          MAX(timestamp) as last_sync,
          COUNT(CASE WHEN total_errors > 0 THEN 1 END) as failed_syncs
        FROM sync_events 
        GROUP BY device_id
        ORDER BY last_sync DESC
        LIMIT $1
      `;
      
      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching bulk stats:', error);
      throw error;
    }
  }

}

module.exports = SyncEvent;