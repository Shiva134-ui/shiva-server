function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required'
      }
    });
  }
  
  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: err.message || 'Permission denied'
      }
    });
  }

  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.isPublic ? err.message : 'An internal server error occurred'
    }
  });
}

module.exports = { errorHandler };
