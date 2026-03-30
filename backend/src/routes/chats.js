const router = require('express').Router();
const { body } = require('express-validator');
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);

// List all chats for current user
router.get('/', chatController.getMyChats);

// Get or create private DM chat with another user
router.get('/private/:userId', chatController.getOrCreatePrivateChat);

// Create a group chat
router.post('/group', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Group name required (max 100 chars)'),
  body('participantIds').isArray({ min: 1 }).withMessage('At least one other participant required'),
], validate, chatController.createGroupChat);

// CRUD on a specific chat
router.get('/:id', chatController.getChatById);
router.patch('/:id', chatController.updateGroupChat);

// Member management
router.post('/:id/members', [
  body('userId').notEmpty().withMessage('userId required'),
], validate, chatController.addMember);

router.delete('/:id/members/:userId', chatController.removeMember);

// Mark chat messages as read
router.post('/:id/read', chatController.markAsRead);

module.exports = router;
