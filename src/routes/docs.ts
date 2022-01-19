import { Request, Response } from 'express';

/**
 * Send the OAS file with the endpoint specification
 */
const sendAPIDocumentationFile = (req: Request, res: Response) => {
  res.sendFile('openapi.json', { root: __dirname });
};

export { sendAPIDocumentationFile };
