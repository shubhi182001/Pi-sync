const SyncEvent = require('../models/SyncEvents');
const Device = require('../models/Device');
const logger = require('../config/logger');

class SyncService {
  static async processSyncEvent(eventData) {
    try {
      // Ensure device exists
      await Device.findOrCreate(eventData.device_id);
      
      // Create sync event
      const syncEvent = await SyncEvent.create(eventData);
      
      // Update device last seen
      await Device.updateLastSeen(eventData.device_id);
      
      logger.info(`Sync event processed successfully for device: ${eventData.device_id}`);
      return syncEvent;
    } catch (error) {
      logger.error('Error processing sync event:', error);
      throw error;
    }
  }

  static async getDeviceSyncHistory(deviceId, options = {}) {
    try {
      const [syncEvents, stats] = await Promise.all([
        SyncEvent.getByDeviceId(deviceId, options),
        SyncEvent.getDeviceStats(deviceId)
      ]);

      return {
        device_id: deviceId,
        stats,
        sync_history: syncEvents,
        pagination: {
          limit: options.limit || 50,
          offset: options.offset || 0,
          total_events: parseInt(stats.total_syncs)
        }
      };
    } catch (error) {
      logger.error('Error fetching device sync history:', error);
      throw error;
    }
  }

  static async getDevicesWithRepeatedFailures(threshold = 3) {
    try {
      const devices = await Device.getDevicesWithRepeatedFailures(threshold);
      if (!devices || devices.length === 0) {
        return {
          threshold,
          total_devices: 0,
          devices: []
        };
      }
      
      return {
        threshold,
        total_devices: devices.length,
        devices: devices?.map(device => ({
          device_id: device.device_id,
          total_failed_syncs: parseInt(device.total_failed_syncs),
          last_failed_sync: device.last_failed_sync,
          device_registered: device.created_at,
          last_seen: device.updated_at
        }))
      };
    } catch (error) {
      logger.error('Error fetching devices with repeated failures:', error);
      throw error;
    }
  }

  static async getSystemStats() {
    try {
      const stats = await SyncEvent.getBulkStats();
      
      const totalDevices = stats.length;
      const totalSyncs = stats.reduce((sum, device) => sum + parseInt(device.total_syncs), 0);
      const totalFailures = stats.reduce((sum, device) => sum + parseInt(device.failed_syncs), 0);
      const totalFilesSync = stats.reduce((sum, device) => sum + parseInt(device.total_files_synced || 0), 0);
      
      return {
        total_devices: totalDevices,
        total_sync_events: totalSyncs,
        total_failures: totalFailures,
        total_files_synced: totalFilesSync,
        overall_success_rate: totalSyncs > 0 ? ((totalSyncs - totalFailures) / totalSyncs * 100).toFixed(2) : 0,
        recent_devices: stats.slice(0, 10) // Top 10 most recent
      };
    } catch (error) {
      logger.error('Error fetching system stats:', error);
      throw error;
    }
  }

  static async cleanupOldEvents(daysToKeep = 90) {
    try {
      const deletedCount = await SyncEvent.deleteOldEvents(daysToKeep);
      logger.info(`Cleanup completed: ${deletedCount} old events deleted`);
      return deletedCount;
    } catch (error) {
      logger.error('Error during cleanup:', error);
      throw error;
    }
  }
}

module.exports = SyncService;