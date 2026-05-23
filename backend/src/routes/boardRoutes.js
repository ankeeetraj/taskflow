const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard
} = require('../controllers/boardController');

router.use(protect);

router.route('/')
  .post(createBoard)
  .get(getBoards);

router.route('/:id')
  .get(getBoardById)
  .put(updateBoard)
  .delete(deleteBoard);

module.exports = router;
