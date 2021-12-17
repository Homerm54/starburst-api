import { Request, Response } from 'express';
import { db } from 'database';

export const statusCheck = (req: Request, res: Response) => {
  if (db.connected) res.json({ ok: true });
  else res.status(500).json({ ok: false });
};