const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  moveTask
} = require('../controllers/taskController');

router.use(protect);

router.route('/')
  .post(createTask);

router.route('/column/:columnId')
  .get(getTasks);

router.route('/:id')
  .put(updateTask)
  .delete(deleteTask);

router.route('/:id/move')
  .put(moveTask);

module.exports = router;
