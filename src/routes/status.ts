import express from 'express';
const statusRouter = express.Router();

/**
 * Status endpoint, currently doesn't check anything, just return ok
 * which means that the server is active and can recieve requests
 */
statusRouter.get('/status', (req, res) => res.json({ ok: true }));

export { statusRouter };
