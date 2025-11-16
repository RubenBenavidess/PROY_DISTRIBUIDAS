/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Specific error handling
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = err.message;
    }

    if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized access';
    }

    if (err.code === 'ENOENT') {
        statusCode = 404;
        message = 'File not found';
    }

    // Development vs production error response
    const errorResponse = {
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && {
            error: err.message,
            stack: err.stack
        })
    };

    res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler
 */
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
};

/**
 * Async handler wrapper
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
