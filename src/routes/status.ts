import express from 'express';
import { statusCheck } from 'controllers/status.controller';

/**
 * Status endpoint, currently doesn't check anything, just return ok
 * which means that the server is active and can recieve requests
 */
const statusRouter = express.Router();

statusRouter.get('/status', statusCheck);

export { statusRouter };
