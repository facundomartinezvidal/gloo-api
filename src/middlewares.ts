import { NextFunction, Request, Response } from 'express';

import ErrorResponse from './interfaces/ErrorResponse';

export function notFound(req: Request, res: Response, next: NextFunction): void {
  console.log('❌ 404 Debug - Route not found:', req.originalUrl);
  console.log('❌ 404 Debug - Method:', req.method);
  console.log('❌ 404 Debug - Base URL:', req.baseUrl);
  console.log('❌ 404 Debug - Path:', req.path);
  console.log('❌ 404 Debug - Params:', req.params);
  console.log('❌ 404 Debug - Headers:', {
    authorization: req.headers.authorization ? 'Present' : 'Missing',
    'content-type': req.headers['content-type'],
  });
  
  res.status(404);
  const error = new Error(`🔍 - Not Found - ${req.originalUrl}`);
  next(error);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response<ErrorResponse>, next: NextFunction) {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
}
