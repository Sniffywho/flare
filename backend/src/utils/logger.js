const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;

const isProd = process.env.NODE_ENV === 'production';

// Custom log line format
const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: isProd ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),      // capture stack traces
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    isProd
      ? format.json()             // structured JSON in production
      : combine(colorize(), logFormat) // human-readable in dev
  ),
  transports: [
    new transports.Console(),
    // In production you'd typically add a File or external transport here
    ...(isProd
      ? [
          new transports.File({ filename: 'logs/error.log', level: 'error' }),
          new transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
  exitOnError: false,
});

// Expose http level for Morgan integration
logger.http = (message) => logger.log('http', message);

module.exports = logger;
