const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  inviteMember,
  getMembers,
  removeMember
} = require('../controllers/memberController');

router.use(protect);

router.route('/:boardId/members')
  .post(inviteMember)
  .get(getMembers);

router.route('/:boardId/members/:userId')
  .delete(removeMember);

module.exports = router;
