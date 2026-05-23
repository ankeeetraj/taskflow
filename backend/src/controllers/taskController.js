const { query, pool } = require('../config/db');
const redisClient = require('../config/redis');

const invalidateBoardCache = async (columnId, req = null, eventName = null, payload = null) => {
  try {
    const res = await query('SELECT board_id FROM columns WHERE id = $1', [columnId]);
    if (res.rows.length > 0) {
      const boardId = res.rows[0].board_id;
      const keys = await redisClient.keys(`board:${boardId}:*`);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      if (req && req.io && eventName) {
        req.io.to(boardId).emit(eventName, payload);
      }
    }
  } catch (err) {
    console.error('Cache invalidation error:', err);
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  const { column_id, title, description, deadline, priority } = req.body;

  try {
    // Determine the next position
    const positionResult = await query(
      'SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM tasks WHERE column_id = $1',
      [column_id]
    );
    const position = positionResult.rows[0].next_position;

    const result = await query(
      `INSERT INTO tasks (column_id, title, description, deadline, priority, position) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [column_id, title, description, deadline, priority || 'medium', position]
    );

    await invalidateBoardCache(column_id, req, 'task:created', result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all tasks for a column
// @route   GET /api/tasks/column/:columnId
// @access  Private
const getTasks = async (req, res) => {
  const { columnId } = req.params;

  try {
    const result = await query(
      'SELECT * FROM tasks WHERE column_id = $1 ORDER BY position ASC',
      [columnId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  const taskId = req.params.id;
  const { title, description, deadline, priority, status } = req.body;

  try {
    const result = await query(
      `UPDATE tasks 
       SET title = COALESCE($1, title), 
           description = COALESCE($2, description), 
           deadline = COALESCE($3, deadline), 
           priority = COALESCE($4, priority), 
           status = COALESCE($5, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [title, description, deadline, priority, status, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await invalidateBoardCache(result.rows[0].column_id, req, 'task:updated', result.rows[0]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  const taskId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get task details to adjust positions of remaining tasks
    const taskResult = await client.query('SELECT column_id, position FROM tasks WHERE id = $1', [taskId]);
    
    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Task not found' });
    }

    const { column_id, position } = taskResult.rows[0];

    // Delete the task
    await client.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    // Update positions of subsequent tasks in the same column
    await client.query(
      'UPDATE tasks SET position = position - 1 WHERE column_id = $1 AND position > $2',
      [column_id, position]
    );

    await client.query('COMMIT');
    
    await invalidateBoardCache(column_id, req, 'task:deleted', { id: taskId, column_id: column_id });
    
    res.json({ message: 'Task removed' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// @desc    Move a task (drag and drop)
// @route   PUT /api/tasks/:id/move
// @access  Private
const moveTask = async (req, res) => {
  const taskId = req.params.id;
  const { new_column_id, new_position } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current task details
    const taskResult = await client.query('SELECT column_id, position FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Task not found' });
    }

    const current_column_id = taskResult.rows[0].column_id;
    const current_position = taskResult.rows[0].position;

    if (current_column_id === new_column_id) {
      // Moving within the same column
      if (current_position < new_position) {
        // Moving down: shift items between current+1 and new_position up by 1
        await client.query(
          'UPDATE tasks SET position = position - 1 WHERE column_id = $1 AND position > $2 AND position <= $3',
          [current_column_id, current_position, new_position]
        );
      } else if (current_position > new_position) {
        // Moving up: shift items between new_position and current-1 down by 1
        await client.query(
          'UPDATE tasks SET position = position + 1 WHERE column_id = $1 AND position >= $2 AND position < $3',
          [current_column_id, new_position, current_position]
        );
      }
    } else {
      // Moving to a different column
      // 1. Shift items in old column up by 1
      await client.query(
        'UPDATE tasks SET position = position - 1 WHERE column_id = $1 AND position > $2',
        [current_column_id, current_position]
      );
      // 2. Shift items in new column down by 1
      await client.query(
        'UPDATE tasks SET position = position + 1 WHERE column_id = $1 AND position >= $2',
        [new_column_id, new_position]
      );
    }

    // Update the moved task
    const updateResult = await client.query(
      'UPDATE tasks SET column_id = $1, position = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [new_column_id, new_position, taskId]
    );

    await client.query('COMMIT');
    
    await invalidateBoardCache(current_column_id, req, 'task:moved', updateResult.rows[0]);
    if (current_column_id !== new_column_id) {
      await invalidateBoardCache(new_column_id);
    }

    res.json(updateResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Move task error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  moveTask
};
