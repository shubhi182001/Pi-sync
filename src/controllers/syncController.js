const SyncService = require('../services/syncService');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../config/logger');

class SyncController {
  /**
   * @desc    Create a new sync event
   * @route   POST /api/sync-event
   * @access  Public
   */
  static createSyncEvent = catchAsync(async (req, res) => {
    const syncEvent = await SyncService.processSyncEvent(req.body);
    console.log('Sync event created:', syncEvent);
    
    logger.info('Sync event created successfully', {
      device_id: req.body.device_id,
      sync_event_id: syncEvent.id
    });

    res.status(201).json({
      success: true,
      message: 'Sync event processed successfully',
      data: {
        id: syncEvent.id,
        device_id: syncEvent.device_id,
        timestamp: syncEvent.timestamp,
        total_files_synced: syncEvent.total_files_synced,
        total_errors: syncEvent.total_errors,
        internet_speed: syncEvent.internet_speed,
        created_at: syncEvent.created_at
      }
    });
  });

  static testCreateSyncEvent = async (req, res) => {
  console.log('=== testCreateSyncEvent started ===');
  console.log('Request body:', req.body);
  
  try {
    console.log('About to call SyncService.processSyncEvent');
    const syncEvent = await SyncService.processSyncEvent(req.body);
    
    console.log('SyncService returned:', syncEvent);
    
    res.status(201).json({
      success: true,
      message: 'Test sync event processed successfully',
      data: syncEvent
    });
    
    console.log('=== Response sent successfully ===');
  } catch (error) {
    console.error('=== Error in testCreateSyncEvent ===', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    });
  }
};

  /**
   * @desc    Get sync history for a specific device
   * @route   GET /api/device/:id/sync-history
   * @access  Public
   */
  static getDeviceSyncHistory = catchAsync(async (req, res) => {
    const { id: deviceId } = req.params;
    const options = {
      limit: req.query.limit,
      offset: req.query.offset,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const syncHistory = await SyncService.getDeviceSyncHistory(deviceId, options);

    res.status(200).json({
      success: true,
      message: 'Sync history retrieved successfully',
      data: syncHistory
    });
  });

  /**
   * @desc    Get devices with repeated sync failures
   * @route   GET /api/devices/repeated-failures
   * @access  Public
   */
  static getDevicesWithRepeatedFailures = catchAsync(async (req, res) => {
    const { threshold } = req.query;
    
    const result = await SyncService.getDevicesWithRepeatedFailures(threshold);

    res.status(200).json({
      success: true,
      message: 'Devices with repeated failures retrieved successfully',
      data: result
    });
  });

  /**
   * @desc    Get system-wide statistics
   * @route   GET /api/stats
   * @access  Public
   */
  static getSystemStats = catchAsync(async (req, res) => {
    const stats = await SyncService.getSystemStats();

    res.status(200).json({
      success: true,
      message: 'System statistics retrieved successfully',
      data: stats
    });
  });
}

module.exports = SyncController;