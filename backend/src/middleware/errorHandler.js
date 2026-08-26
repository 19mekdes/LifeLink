import { Prisma } from '@prisma/client';
export class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}


export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);


  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;


  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    message = getPrismaErrorMessage(err);
  }


  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
  }


  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please login again.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired. Please login again.';
  }


  if (err.name === 'ValidationError' || err.array) {
    statusCode = 400;
    message = 'Validation error';
    errors = err.array ? err.array() : err.errors;
  }


  if (err.code === 'P2002') {
    statusCode = 409;
    message = `Duplicate field: ${err.meta?.target?.join(', ') || 'Unknown'}`;
  }


  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
  }


  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      code: err.code,
    }),
  });
};


function getPrismaErrorMessage(err) {
  const errorMessages = {
    P2000: 'The provided value is too long for the field',
    P2001: 'The record you are looking for does not exist',
    P2002: 'Duplicate entry. This value already exists.',
    P2003: 'Foreign key constraint failed',
    P2004: 'A constraint failed on the database',
    P2005: 'Invalid value for the field',
    P2006: 'The provided value is not valid for the field type',
    P2007: 'Data validation error',
    P2008: 'Failed to parse the query',
    P2009: 'Failed to validate the query',
    P2010: 'Raw query failed',
    P2011: 'Null constraint violation',
    P2012: 'Missing required field',
    P2013: 'Missing required argument',
    P2014: 'The change you are trying to make would violate the required relation',
    P2015: 'A related record could not be found',
    P2016: 'Query interpretation error',
    P2017: 'The records for the relation could not be connected',
    P2018: 'The required connected records were not found',
    P2019: 'Input error',
    P2020: 'Value out of range for the type',
    P2021: 'The table does not exist in the current database',
    P2022: 'The column does not exist in the current database',
    P2023: 'Inconsistent column data',
    P2024: 'Timed out fetching a new connection from the connection pool',
    P2025: 'Record not found',
    P2026: 'The current database provider does not support the requested operation',
    P2027: 'Multiple errors occurred',
    P2028: 'Transaction API error',
    P2029: 'Query parameter limit exceeded',
    P2030: 'Cannot find a fulltext index to use for the search',
    P2031: 'Prisma needs to perform transactions, which requires your database to support transactions',
    P2032: 'The request was aborted due to a timeout',
    P2033: 'The number of parameters exceeds the maximum allowed',
    P2034: 'Transaction failed due to a write conflict or a deadlock',
    P2035: 'The current database provider does not support the requested operation',
    P2036: 'The provided value is not valid for the field type',
    P2037: 'The provided value is too long for the field',
  };

  return errorMessages[err.code] || `Database error: ${err.message}`;
}


export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.method} ${req.path}`);
  next(error);
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};


export const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new ApiError(400, 'Validation Error', errors.array());
    return next(error);
  }

  next();
};


export const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
  });
};

export default {
  ApiError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleValidationErrors,
  rateLimitHandler,
};