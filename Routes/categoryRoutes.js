const express = require('express');
const router = express.Router();
const categoryController = require('../Controller/categoryController');
const auth = require('../Middleware/auth');
const requireProductManager = require('../Middleware/requireProductManager');

router.get('/', categoryController.getCategories);

router.post('/', auth, requireProductManager, categoryController.createCategory);

router.delete('/:id', auth, requireProductManager, categoryController.deleteCategory);

module.exports = router;
