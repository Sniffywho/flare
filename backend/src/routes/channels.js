const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const channelController = require('../controllers/channelController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);

// All channel routes are scoped under /api/channels (serverId passed in body/param)

// GET /api/channels/server/:serverId
router.get('/server/:serverId', channelController.getServerChannels);

// POST /api/channels/server/:serverId
router.post('/server/:serverId', [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Channel name required')
    .matches(/^[a-z0-9-_]+$/)
    .withMessage('Channel name: lowercase letters, numbers, hyphens, underscores only'),
  body('type').optional().isIn(['text', 'voice', 'announcement']).withMessage('Invalid type'),
], validate, channelController.createChannel);

// GET /api/channels/:channelId
router.get('/:channelId', channelController.getChannelById);

// PATCH /api/channels/:channelId
router.patch('/:channelId', [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('slowMode').optional().isInt({ min: 0, max: 21600 }),
], validate, channelController.updateChannel);

// DELETE /api/channels/:channelId
router.delete('/:channelId', channelController.deleteChannel);

// GET /api/channels/:channelId/messages
router.get('/:channelId/messages', channelController.getChannelMessages);

module.exports = router;
