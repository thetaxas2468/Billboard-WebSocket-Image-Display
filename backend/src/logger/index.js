// Logger that writes to BOTH the terminal AND a log file.
// The /logs folder is created automatically on first run.


const fs   = require("fs");
const path = require("path");

// ── Set up the logs folder ────────────────────────────────────────────────────

// __dirname is the folder this file lives in (src/logger)
// We go up two levels to get to the project root, then into /logs
const LOGS_DIR = path.join(__dirname, "..", "..", "logs");

// Create the /logs folder if it doesn't already exist
// { recursive: true } means it won't throw an error if the folder is already there
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Open both log files in "append" mode (flag "a")
// Append mode means new lines are added to the end — old logs are never deleted
const appLogPath   = path.join(LOGS_DIR, "app.log");
const errorLogPath = path.join(LOGS_DIR, "error.log");

const appLogStream   = fs.createWriteStream(appLogPath,   { flags: "a" });
const errorLogStream = fs.createWriteStream(errorLogPath, { flags: "a" });


//Helpers
function getTimestamp() {
  // Returns date + time, e.g. "2024-01-15 14:03:22"
  // More useful in a file than just the time, because the file persists across days
  const now = new Date();
  const date = now.toISOString().slice(0, 10);         // "2024-01-15"
  const time = now.toTimeString().slice(0, 8);         // "14:03:22"
  return `${date} ${time}`;
}

// Writes one line to a file stream
// We add \n at the end so each message is on its own line
function writeToFile(stream, line) {
  stream.write(line + "\n");
}

// The single function that every level calls
// It prints to the terminal AND writes to the log file
function log(level, message, consoleMethod) {
  const line = `[${getTimestamp()}] [${level}] ${message}`;

  // Print to the terminal (same as before)
  consoleMethod(line);

  // Write to app.log (every message goes here)
  writeToFile(appLogStream, line);
}

//Logger object

const logger = {
  info: function (message) {
    log("INFO ", message, console.log);
  },

  warn: function (message) {
    log("WARN ", message, console.warn);
  },

  error: function (message) {
    log("ERROR", message, console.error);

    // Errors also go to error.log so you have a focused file just for problems
    const line = `[${getTimestamp()}] [ERROR] ${message}`;
    writeToFile(errorLogStream, line);
  },
};

module.exports = logger;