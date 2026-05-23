const { query } = require('../config/db');
const redisClient = require('../config/redis');

// @desc    Invite user to board
// @route   POST /api/boards/:boardId/members
// @access  Private
const inviteMember = async (req, res) => {
  const { boardId } = req.params;
  const { email } = req.body;

  try {
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const newMemberId = userResult.rows[0].id;

    const checkMember = await query(
      'SELECT * FROM board_members WHERE board_id = $1 AND user_id = $2',
      [boardId, newMemberId]
    );
    if (checkMember.rows.length > 0) {
      return res.status(400).json({ message: 'User is already a member of this board' });
    }

    await query(
      'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)',
      [boardId, newMemberId, 'member']
    );

    // Invalidate the invited user's dashboard cache so they see the new board
    await redisClient.del(`boards:${newMemberId}`);

    if (req.io) {
      req.io.to(boardId).emit('member:invited');
    }

    res.status(201).json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all members of a board
// @route   GET /api/boards/:boardId/members
// @access  Private
const getMembers = async (req, res) => {
  const { boardId } = req.params;

  try {
    const result = await query(
      `SELECT u.id, u.username, u.email, u.profile_image, bm.role, bm.joined_at 
       FROM board_members bm
       JOIN users u ON bm.user_id = u.id
       WHERE bm.board_id = $1`,
      [boardId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove a member from a board
// @route   DELETE /api/boards/:boardId/members/:userId
// @access  Private
const removeMember = async (req, res) => {
  const { boardId, userId } = req.params;
  const requesterId = req.user.id;

  try {
    const boardCheck = await query('SELECT owner_id FROM boards WHERE id = $1', [boardId]);
    if (boardCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Board not found' });
    }
    if (boardCheck.rows[0].owner_id !== requesterId) {
      return res.status(403).json({ message: 'Only the board owner can remove members' });
    }

    if (userId === requesterId) {
      return res.status(400).json({ message: 'Owner cannot be removed from the board' });
    }

    const result = await query(
      'DELETE FROM board_members WHERE board_id = $1 AND user_id = $2 RETURNING *',
      [boardId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found on this board' });
    }

    // Invalidate the removed user's caches
    await redisClient.del(`boards:${userId}`);
    await redisClient.del(`board:${boardId}:${userId}`);

    if (req.io) {
      req.io.to(boardId).emit('member:removed');
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  inviteMember,
  getMembers,
  removeMember
};
