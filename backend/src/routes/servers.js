const router = require('express').Router();
const { body } = require('express-validator');
const serverController = require('../controllers/serverController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);

// CRUD
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Server name must be 2–100 chars'),
], validate, serverController.createServer);

router.get('/', serverController.getMyServers);
router.get('/:id', serverController.getServerById);

router.patch('/:id', [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
], validate, serverController.updateServer);

router.delete('/:id', serverController.deleteServer);

// Invite system
router.get('/join/:inviteCode', serverController.joinByInvite);
router.post('/:id/invite/regenerate', serverController.regenerateInvite);

// Membership
router.post('/:id/leave', serverController.leaveServer);

// Member management
router.delete('/:id/members/:userId/kick', serverController.kickMember);
router.delete('/:id/members/:userId/ban', serverController.banMember);
router.patch('/:id/members/:userId/role', [
  body('role').isIn(['admin', 'moderator', 'member']).withMessage('Invalid role'),
], validate, serverController.updateMemberRole);

module.exports = router;
