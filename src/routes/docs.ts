import { Request, Response } from 'express';

const sendAPIDocumentationFile = (req: Request, res: Response) => {
  const route = `${__dirname}/../..`;

  // TODO: Unsafe headers send here, check
  // Check this -> https://github.com/Redocly/redoc/issues/1427

  res.sendFile('docs/index.html', { root: route });
};

export { sendAPIDocumentationFile };
