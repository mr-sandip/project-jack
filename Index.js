const http = require('http');
const fs = require('fs');
const path = require('path');

// Global Application Reference Matrix for Dependency Tracking
let app = null;
let shuttingDown = false;

// ==========================================
// 1. LIGHTWEIGHT KERNEL LOGGING FACADE
// ==========================================
// Centralized internal logger; no direct console calls are allowed anywhere else in this module
const kernelLog = (level, message, error = null) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[Kernel ${level.toUpperCase()}] [${timestamp}] ${message}`;
    if (error) {
        console.error(formattedMessage, error.message);
        if (error.stack) console.error(error.stack);
    } else {
        console.log(formattedMessage);
    }
};

// ==========================================
// 2. RENDER SAFEGUARD: IMMEDIATE PORT BINDING
// ==========================================
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Project Jack Autonomous Agent Core is active.\n');
});

// Handle HTTP server startup errors cleanly instead of crashing unexpectedly
server.on('error', (serverError) => {
    kernelLog('error', 'HTTP Server infrastructure binding failed critically:', serverError);
    process.exit(1);
});

server.listen(PORT, () => {
    kernelLog('info', `HTTP Server bound instantly to port ${PORT}`);
});

// ==========================================
// 3. GRACEFUL SHUTDOWN ORCHESTRATION
// ==========================================
const initiateShutdown = (exitCode = 0) => {
    // Block repeated entry signals if multiple process events fire concurrently
    if (shuttingDown) return;
    shuttingDown = true;

    kernelLog('info', 'Initiating graceful engine decay sequence...');

    // Phase A: Stop accepting new HTTP connections immediately without waiting for flush
    try {
        server.close(() => {
            kernelLog('info', 'HTTP Server shed all active connections and closed safely.');
        });
    } catch (serverError) {
        kernelLog('error', 'Error encountered during HTTP server close sequence:', serverError);
    }

    // Phase B: Disconnect the bot instance safely using late-bound references
    if (app && app.bot && typeof app.bot.quit === 'function') {
        try {
            kernelLog('info', 'Disconnecting Mineflayer bot instance safely from server...');
            app.bot.quit();
        } catch (botError) {
            kernelLog('error', 'Error encountered during bot instance cleanup:', botError);
        }
    }

    // Phase C: Enforce a definitive exit grace timer so keep-alive connections cannot hang the cloud process
    const gracePeriodMs = 5000;
    setTimeout(() => {
        kernelLog('info', `Shutdown grace period of ${gracePeriodMs}ms completed. Exiting process safely.`);
        process.exit(exitCode);
    }, gracePeriodMs).unref();
};

// ==========================================
// 4. GLOBAL SYSTEM FAULT ISOLATION HOOKS
// ==========================================
process.on('uncaughtException', (error) => {
    kernelLog('error', 'Critical Uncaught Exception detected! Triggering emergency teardown.', error);
    initiateShutdown(1);
});

process.on('unhandledRejection', (reason, promise) => {
    // Refined Rejection Policy: Differentiates between startup core failure vs non-fatal runtime glitch
    const isUnrecoverable = !app || (reason && reason.fatal === true);

    if (isUnrecoverable) {
        kernelLog('error', `Critical Unrecoverable Promise Rejection caught: ${reason}. Instigating teardown.`, reason instanceof Error ? reason : null);
        initiateShutdown(1);
    } else {
        kernelLog('warn', `Recoverable Runtime Promise Rejection isolated safely: ${reason}`);
    }
});

process.on('SIGTERM', () => {
    kernelLog('info', 'SIGTERM container signal received. Executing ordered exit routine.');
    initiateShutdown(0);
});

process.on('SIGINT', () => {
    kernelLog('info', 'SIGINT local interrupt signal received (Ctrl+C). Executing ordered exit routine.');
    initiateShutdown(0);
});

// ==========================================
// 5. CONFIGURATION LOADING & ENV OVERRIDES
// ==========================================
const configPath = path.join(__dirname, 'config', 'settings.json');
let config = {};

try {
    const rawData = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(rawData);
} catch (error) {
    kernelLog('error', 'Failed to read or parse config/settings.json context schema:', error);
    process.exit(1);
}

// Applying environment variable adaptive overrides with strict validation logic
if (process.env.SERVER_HOST) {
    const envHost = process.env.SERVER_HOST.trim();
    if (envHost === '') {
        kernelLog('error', 'Configuration Validation Error: SERVER_HOST environment variable cannot be empty or only spaces.');
        process.exit(1);
    }
    config.server.host = envHost;
}
if (process.env.BOT_USERNAME) {
    config.bot.username = process.env.BOT_USERNAME;
}

// Intercept unconfigured default placeholders early
if (config.server.host === 'CHANGE_ME') {
    kernelLog('error', 'server.host is set to CHANGE_ME. Set SERVER_HOST environment variable or update config/settings.json.');
    process.exit(1);
}

// Strict Data Type & Boundary Range Checks (Fail-Early Engine Guards)
const portNum = config.server.port;
if (typeof portNum !== 'number' || !Number.isInteger(portNum) || portNum <= 0 || portNum > 65535) {
    kernelLog('error', 'Configuration Validation Error: server.port must be a valid integer between 1 and 65535.');
    process.exit(1);
}
if (typeof config.server.version !== 'string' || !config.server.version.trim()) {
    kernelLog('error', 'Configuration Validation Error: server.version must be a non-empty string.');
    process.exit(1);
}
if (typeof config.bot.username !== 'string' || !config.bot.username.trim()) {
    kernelLog('error', 'Configuration Validation Error: bot.username must be a non-empty string.');
    process.exit(1);
}

// ==========================================
// 6. KERNEL BOOTSTRAPPING EXECUTION
// ==========================================
const { bootstrap } = require('./core/bootstrapper');

kernelLog('info', `Configuration verified for agent identity: ${config.bot.username}. Initializing bootstrapper layer.`);

try {
    app = bootstrap(config);
    
    // Protect bootstrap return boundaries by validating the required structural interface contract safely
    if (typeof app !== 'object' || app === null) {
        throw new Error('Bootstrap execution failed to return a valid application context object structure.');
    }
    if (!Object.prototype.hasOwnProperty.call(app, 'bot')) {
        throw new Error('Bootstrap context contract violation: Missing required "bot" property interface abstraction.');
    }
    if (app.bot && (typeof app.bot !== 'object' || app.bot === null)) {
        throw new Error('Bootstrap returned an invalid or broken bot instance reference allocation.');
    }
} catch (bootstrapError) {
    kernelLog('error', 'Bootstrap initialization phase failed critically! Triggering emergency teardown.', bootstrapError);
    initiateShutdown(1);
}

