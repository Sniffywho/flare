const router = require('express').Router();
const { body, query } = require('express-validator');
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { messageRateLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');

router.use(protect);

// Send a message
router.post('/', messageRateLimiter, [
  body('chatId').notEmpty().withMessage('chatId required'),
  body('content')
    .if(body('attachments').not().isArray({ min: 1 }))
    .notEmpty()
    .withMessage('Content required when no attachments'),
  body('type')
    .optional()
    .isIn(['text', 'image', 'video', 'audio', 'file', 'system'])
    .withMessage('Invalid message type'),
], validate, messageController.sendMessage);

// Get messages for a chat (cursor-based pagination)
router.get('/chat/:chatId', messageController.getMessages);

// Search messages
router.get('/search', [
  query('chatId').notEmpty().withMessage('chatId required'),
  query('q').isLength({ min: 1 }).withMessage('Search query required'),
], validate, messageController.searchMessages);

// Edit a message
router.patch('/:id', [
  body('content').notEmpty().trim().withMessage('Content required'),
], validate, messageController.editMessage);

// Delete a message
router.delete('/:id', messageController.deleteMessage);

// React to a message
router.post('/:id/reactions', [
  body('emoji').notEmpty().withMessage('Emoji required'),
], validate, messageController.reactToMessage);

// Pin / unpin
router.post('/:id/pin', messageController.pinMessage);

// Upload file attachment
router.post('/upload', upload.single('file'), messageController.uploadFile);

module.exports = router;
