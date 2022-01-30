import { NextFunction, Request, Response } from 'express';
import { ServerError } from 'lib/error';

/**
 * Catch any error either thrown or passed to the next function across the routes.
 * If the error is not an instance of {@link ServerError}, a 500 response is send.
 */
const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  if (err instanceof ServerError) {
    res.status(err.statusCode).json({
      error: true,
      code: err.code,
      message: err.message,
    });
  } else {
    console.error(err);

    res.status(500).json({
      error: true,
      code: 'unknow',
      message: 'unknow server error',
    });
  }
};

/**
 * 404 response for route request that doesn't match any of the routes used by the API.
 * Override of the default expres response to implement same response type.
 */
const notFound = (req: Request, res: Response) => {
  return res.status(404).json({
    error: true,
    message: `Route not found`,
    code: 'not-found',
  });
};

/**
 * Custom response when an HTTP method doesn't match, but the route matches.
 * Custom response to keep consistency.
 */
const invalidHTTP = (req: Request, res: Response) => {
  return res.status(405).json({
    error: true,
    message: `Invalid HTTP Method: ${req.method}`,
    code: 'invalid-method',
  });
};

export { notFound, invalidHTTP, errorHandler };
