const express = require('express');
const controller = require('./controller');
const validationMiddleware = require('../../middleware/validationMiddleware');
const { createValidation, updateValidation, idValidation } = require('./validation');

const router = express.Router();

router.post('/', createValidation, validationMiddleware, controller.create);
router.get('/', controller.list);
router.get('/:id', idValidation, validationMiddleware, controller.getById);
router.put('/:id', updateValidation, validationMiddleware, controller.updateOne);
router.delete('/:id', idValidation, validationMiddleware, controller.deleteOne);

module.exports = router;
