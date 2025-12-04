const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config');
const routes = require('./routes');
const { errorConverter, errorHandler } = require('./middlewares');
const { ApiError, httpStatus } = require('./common');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// API Routes
app.use('/api/v1', routes);

// 404 handler
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// Error handling
app.use(errorConverter);
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🔗 N8N URL: ${config.n8n.baseUrl}`);
});

module.exports = app;
