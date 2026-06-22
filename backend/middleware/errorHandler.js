// Central error handling middleware — mount LAST in server.js
// Usage: app.use(errorHandler);

const errorHandler = (err, req, res, next) => {
  console.error('[SmartQueue+ Error]', err.stack || err.message);

  const status  = err.status  || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
