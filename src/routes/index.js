const express = require('express');
const SyncController = require('../controllers/syncController');
const {
  validateSyncEvent,
  validateDeviceId,
  validateQueryParams,
  validateRepeatedFailures
} = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /api/sync-event:
 *   post:
 *     summary: Create a new sync event
 *     tags: [Sync Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device_id
 *               - timestamp
 *               - total_files_synced
 *               - total_errors
 *             properties:
 *               device_id:
 *                 type: string
 *                 description: Unique identifier for the device
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: When the sync event occurred
 *               total_files_synced:
 *                 type: integer
 *                 minimum: 0
 *                 description: Number of files successfully synced
 *               total_errors:
 *                 type: integer
 *                 minimum: 0
 *                 description: Number of errors during sync
 *               internet_speed:
 *                 type: number
 *                 minimum: 0
 *                 description: Internet speed in Mbps (optional)
 *     responses:
 *       201:
 *         description: Sync event created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/sync-event', validateSyncEvent, SyncController.createSyncEvent);

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to PiSync Backend API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      'POST /api/sync-event': 'Create a new sync event',
      'GET /api/device/:id/sync-history': 'Get sync history for a device',
      'GET /api/devices/repeated-failures': 'Get devices with repeated failures',
      'GET /api/stats': 'Get system statistics'
    }
  });
}
);

/**
 * @swagger
 * /api/device/{id}/sync-history:
 *   get:
 *     summary: Get sync history for a specific device
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 50
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of records to skip
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter events from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter events until this date
 *     responses:
 *       200:
 *         description: Sync history retrieved successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Device not found
 *       500:
 *         description: Server error
 */
router.get('/device/:id/sync-history', 
  validateDeviceId, 
  validateQueryParams, 
  SyncController.getDeviceSyncHistory
);

/**
 * @swagger
 * /api/devices/repeated-failures:
 *   get:
 *     summary: Get devices with repeated sync failures
 *     tags: [Devices]
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 3
 *         description: Minimum number of failures to consider
 *     responses:
 *       200:
 *         description: Devices with repeated failures retrieved successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.get('/devices/repeated-failures', 
  validateRepeatedFailures, 
  SyncController.getDevicesWithRepeatedFailures
);

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Get system-wide statistics
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/stats', SyncController.getSystemStats);




module.exports = router;