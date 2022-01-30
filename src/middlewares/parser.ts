import express, { NextFunction, Request, Response } from 'express';

const jsonParser = express.json();

/**
 * Parse the body of the file, according with the needs of the content type, return error
 * if an unsupported type is passed
 */
const parser = (req: Request, res: Response, next: NextFunction) => {
  // const type = req.headers['content-type'];
  jsonParser(req, res, next);
};

export { parser };
