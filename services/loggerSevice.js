// Centralized Logger State Matrix
const state = {
    enabled: true,
    maxBufferEntries: 50,
    minLogLevel: 'info'
};

// Bounded State Matrix for Continuous Rolling Memory Tracking
const logBuffer = [];

// Enforced Log Severity Weights and Validation Matrix
const LOG_LEVELS = {
    info: 1,
    warn: 2,
    error: 3
};

// Maximum safety ceiling cap to completely shield Render Free Tier (512MB RAM) from out-of-memory overflow
const ABSOLUTE_MAX_BUFFER_CAP = 500;

/**
 * Validates if the requested log level is authorized to write to output streams.
 * @param {string} level - Lowercase log level indicator.
 * @returns {boolean} True if the log level meets the configured threshold criteria.
 */
function shouldLog(level) {
    if (!state.enabled) return false;
    const currentWeight = LOG_LEVELS[level] || 1;
    const targetThresholdWeight = LOG_LEVELS[state.minLogLevel] || 1;
    return currentWeight >= targetThresholdWeight;
}

/**
 * Safely stringifies complex or deep nested context payloads while fully preventing circular reference crash loops.
 * @param {Object|*} obj - Target metadata payload object to serialize.
 * @returns {string} Safe serialized JSON string representation.
 */
function safeJsonSerialize(obj) {
    const seenObjects = new WeakSet();
    try {
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seenObjects.has(value)) {
                    return '[Circular Reference Omitted]';
                }
                seenObjects.add(value);
            }
            return value;
        });
    } catch (serializationFault) {
        return '[Serialization Failure: Unparsable Object Context Matrix]';
    }
}

/**
 * Processes data formatting and writes logs directly to the respective host environment IO streams.
 * @param {string} level - Log severity token level ('info', 'warn', 'error').
 * @param {string} message - Primary narrative trace log string.
 * @param {*} detail - Optional supplementary error stack or metadata dictionary payload.
 */
function processWrite(level, message, detail = null) {
    if (!shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    
    // Fix 1 — Safe Message Normalization: Coerces any payload type safely into a string primitive
    const safeMessage = String(message);
    let structuredLine = `[Jack ${level.toUpperCase()}] [${timestamp}] ${safeMessage}`;

    // Structural formatting and absolute safe extraction boundaries for Error payloads
    if (detail !== null && detail !== undefined) {
        if (detail instanceof Error) {
            structuredLine += ` | FaultMessage: ${detail.message}`;
            if (detail.stack) {
                structuredLine += `\n[Stack Trace]\n${detail.stack}`;
            }
        } else if (typeof detail === 'object') {
            structuredLine += ` | Context Matrix: ${safeJsonSerialize(detail)}`;
        } else {
            structuredLine += ` | Value Payload: ${String(detail)}`;
        }
    }

    // Exclusively controlled central console output delivery matrix
    if (level === 'error') {
        console.error(structuredLine);
    } else if (level === 'warn') {
        console.warn(structuredLine);
    } else {
        console.log(structuredLine);
    }

    // Append to rolling internal telemetry buffer tracking
    logBuffer.push({
        level,
        timestamp,
        message: safeMessage,
        rawOutput: structuredLine
    });

    // Enforce Memory Protection Ceiling constraints dynamically
    while (logBuffer.length > state.maxBufferEntries) {
        logBuffer.shift();
    }
}

/**
 * LoggerService Monolithic Object Module Definition Layer.
 * Provides isolated stateful tracking and console output decoupling under a rigid interface contract.
 */
const LoggerService = {
    /**
     * Instantiates configuration bounds and maps validated parameters onto the local engine variables.
     * @param {Object} loggingConfig - Sub-schema layout configuration properties extracted from settings.json.
     */
    initialize(loggingConfig) {
        // Fix 2 — Reject Arrays During Initialization: Ensures only valid plain configuration objects are parsed
        if (
            loggingConfig &&
            typeof loggingConfig === 'object' &&
            !Array.isArray(loggingConfig)
        ) {
            if (typeof loggingConfig.enabled === 'boolean') {
                state.enabled = loggingConfig.enabled;
            }
            
            if (typeof loggingConfig.maxBufferEntries === 'number' && 
                Number.isInteger(loggingConfig.maxBufferEntries) && 
                loggingConfig.maxBufferEntries > 0) {
                // Safeguard against configuration values exceeding hardware capability allocations
                state.maxBufferEntries = Math.min(loggingConfig.maxBufferEntries, ABSOLUTE_MAX_BUFFER_CAP);
            }

            if (typeof loggingConfig.minLogLevel === 'string') {
                const standardizedLevel = loggingConfig.minLogLevel.toLowerCase().trim();
                if (Object.prototype.hasOwnProperty.call(LOG_LEVELS, standardizedLevel)) {
                    state.minLogLevel = standardizedLevel;
                }
            }
        }
    },

    /**
     * Captures standard diagnostic metrics and informational tracing events.
     * @param {string} message - Primary narrative log message.
     * @param {*} [context] - Optional metadata payload or key-value dictionary structure.
     */
    info(message, context = null) {
        processWrite('info', message, context);
    },

    /**
     * Records mid-tier warning indications or recoverable subsystem anomalies.
     * @param {string} message - Primary warning log narrative.
     * @param {*} [context] - Optional system status payload context matrix.
     */
    warn(message, context = null) {
        processWrite('warn', message, context);
    },

    /**
     * Traps fatal errors or unhandled execution context fractures.
     * @param {string} message - Operational sequence failure summary description.
     * @param {Error|*} [error] - Associated native error instance object or raw fault payload.
     */
    error(message, error = null) {
        processWrite('error', message, error);
    },

    /**
     * Extracts an immutable, decoupled deep snapshot copy array of the historical logging buffer.
     * Fully protects internal memory items from reference tampering leakages.
     * @returns {Array<Object>} Deep isolated array array of active log entries templates.
     */
    getRollingHistory() {
        return logBuffer.map((entry) => ({
            level: entry.level,
            timestamp: entry.timestamp,
            message: entry.message,
            rawOutput: entry.rawOutput
        }));
    },

    /**
     * Completely purges the bounded internal tracking arrays during system maintenance cycles.
     */
    clearHistory() {
        logBuffer.length = 0;
    }
};

// Freeze the service object to protect the architectural contracts integrity from runtime mutability
Object.freeze(LoggerService);
module.exports = LoggerService;
