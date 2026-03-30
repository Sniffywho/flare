const router = require('express').Router();
const { body, query } = require('express-validator');
const userController = require('../controllers/userController');
const friendController = require('../controllers/friendController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All user routes require authentication
router.use(protect);

router.get('/me', userController.getMe);

// Friend routes (must be before /:id catch-alls)
router.get('/friends', friendController.getFriends);
router.get('/friend-requests', friendController.getFriendRequests);
router.post('/friend-request/:id/accept', friendController.acceptRequest);
router.delete('/friend-request/:id', friendController.declineRequest);

router.get('/search', [
  query('q').isString().isLength({ min: 2 }).withMessage('Query must be at least 2 chars'),
], validate, userController.searchUsers);

router.get('/:id', userController.getUserById);
router.get('/:id/status', userController.getUserStatus);

router.patch('/me', [
  body('displayName').optional().isLength({ max: 50 }).withMessage('Display name too long'),
  body('bio').optional().isLength({ max: 200 }).withMessage('Bio too long'),
  body('status').optional().isIn(['online', 'offline', 'away', 'do_not_disturb']).withMessage('Invalid status'),
], validate, userController.updateProfile);

router.post('/:id/block', userController.blockUser);
router.post('/:id/friend-request', friendController.sendRequest);
router.delete('/:id/friend', friendController.removeFriend);

module.exports = router;
