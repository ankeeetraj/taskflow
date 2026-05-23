const { query, pool } = require('../config/db');
const redisClient = require('../config/redis');

// @desc    Create a new board
// @route   POST /api/boards
// @access  Private
const createBoard = async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user.id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create board
    const boardResult = await client.query(
      'INSERT INTO boards (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description, userId]
    );
    const newBoard = boardResult.rows[0];
    const boardId = newBoard.id;

    // 2. Add creator to board_members
    await client.query(
      'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)',
      [boardId, userId, 'admin']
    );

    // 3. Create default columns
    const columnsQuery = `
      INSERT INTO columns (board_id, name, position) VALUES 
      ($1, 'To Do', 1),
      ($1, 'In Progress', 2),
      ($1, 'Done', 3)
      RETURNING *
    `;
    const columnsResult = await client.query(columnsQuery, [boardId]);

    await client.query('COMMIT');

    // Invalidate boards list cache for this user
    await redisClient.del(`boards:${userId}`);

    res.status(201).json({
      board: newBoard,
      columns: columnsResult.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create board error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// @desc    Get all boards for logged-in user
// @route   GET /api/boards
// @access  Private
const getBoards = async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `boards:${userId}`;

  try {
    // Check cache
    const cachedBoards = await redisClient.get(cacheKey);
    if (cachedBoards) {
      return res.json(JSON.parse(cachedBoards));
    }

    const result = await query(
      `SELECT b.* FROM boards b 
       WHERE b.owner_id = $1 OR EXISTS (
         SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = $1
       )
       ORDER BY b.created_at DESC`,
      [userId]
    );

    // Set cache for 5 minutes (300 seconds)
    await redisClient.setex(cacheKey, 300, JSON.stringify(result.rows));

    res.json(result.rows);
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get a single board with columns and tasks
// @route   GET /api/boards/:id
// @access  Private
const getBoardById = async (req, res) => {
  const boardId = req.params.id;
  const userId = req.user.id;
  const cacheKey = `board:${boardId}:${userId}`;

  try {
    // Check cache
    const cachedBoard = await redisClient.get(cacheKey);
    if (cachedBoard) {
      return res.json(JSON.parse(cachedBoard));
    }
    // 1. Check if user has access to board
    const accessCheck = await query(
      `SELECT b.* 
       FROM boards b 
       LEFT JOIN board_members bm ON b.id = bm.board_id 
       WHERE b.id = $1 AND (b.owner_id = $2 OR bm.user_id = $2)`,
      [boardId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Board not found or unauthorized' });
    }

    const board = accessCheck.rows[0];

    // 2. Fetch columns
    const columnsResult = await query(
      'SELECT * FROM columns WHERE board_id = $1 ORDER BY position ASC',
      [boardId]
    );
    let columns = columnsResult.rows;

    // 3. Fetch tasks for all columns
    if (columns.length > 0) {
      const columnIds = columns.map(c => c.id);
      const tasksResult = await query(
        'SELECT * FROM tasks WHERE column_id = ANY($1::uuid[]) ORDER BY position ASC',
        [columnIds]
      );
      
      const tasks = tasksResult.rows;

      // Map tasks to their respective columns
      columns = columns.map(column => {
        return {
          ...column,
          tasks: tasks.filter(task => task.column_id === column.id)
        };
      });
    } else {
      // If no columns, ensure tasks is still an array for consistency
      columns = columns.map(c => ({...c, tasks: []}));
    }

    // 4. Return nested structure
    const responsePayload = {
      ...board,
      columns
    };

    // Set cache for 5 minutes (300 seconds)
    await redisClient.setex(cacheKey, 300, JSON.stringify(responsePayload));

    res.json(responsePayload);

  } catch (error) {
    console.error('Get board by id error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a board
// @route   PUT /api/boards/:id
// @access  Private (Owner only)
const updateBoard = async (req, res) => {
  const boardId = req.params.id;
  const userId = req.user.id;
  const { name, description } = req.body;

  try {
    const result = await query(
      'UPDATE boards SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND owner_id = $4 RETURNING *',
      [name, description, boardId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Board not found or unauthorized' });
    }

    // Invalidate caches
    await redisClient.del(`boards:${userId}`);
    await redisClient.del(`board:${boardId}:${userId}`);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a board
// @route   DELETE /api/boards/:id
// @access  Private (Owner only)
const deleteBoard = async (req, res) => {
  const boardId = req.params.id;
  const userId = req.user.id;

  try {
    const result = await query(
      'DELETE FROM boards WHERE id = $1 AND owner_id = $2 RETURNING id',
      [boardId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Board not found or unauthorized' });
    }

    // Invalidate caches
    await redisClient.del(`boards:${userId}`);
    await redisClient.del(`board:${boardId}:${userId}`);

    res.json({ message: 'Board removed' });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard
};
