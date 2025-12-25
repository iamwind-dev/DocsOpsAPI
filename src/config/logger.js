const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = {
  info: (message, data = {}) => {
    const log = `[${new Date().toISOString()}] INFO: ${message} ${JSON.stringify(data)}\n`;
    console.log(log.trim());
    try {
      fs.appendFileSync(path.join(logsDir, 'info.log'), log);
    } catch(e) {}
  },
  error: (message, error = {}) => {
    const log = `[${new Date().toISOString()}] ERROR: ${message} ${JSON.stringify(error)}\n`;
    console.error(log.trim());
    try {
      fs.appendFileSync(path.join(logsDir, 'error.log'), log);
    } catch(e) {}
  },
  warn: (message, data = {}) => {
    const log = `[${new Date().toISOString()}] WARN: ${message} ${JSON.stringify(data)}\n`;
    console.warn(log.trim());
    try {
      fs.appendFileSync(path.join(logsDir, 'warn.log'), log);
    } catch(e) {}
  },
};

module.exports = logger;
