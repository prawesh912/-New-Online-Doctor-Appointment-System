import express from 'express';
import {test} from '../controller/test_controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Test
 *   description: API connectivity and diagnostics
 */

/**
 * @swagger
 * /api/test:
 *   get:
 *     tags: [Test]
 *     summary: Simple diagnostics test route
 *     responses:
 *       200:
 *         description: Connection test successful, server is alive
 */
router.get('/', test);

export default router;