/**
 * @file subsystems/perception.js
 * @description Coordinates incoming sensory data streams, including environmental updates 
 * and conversational text events. Maintains a bounded in-memory cache of critical context data 
 * to shield the engine against memory exhaustion on Render Free Tier runtime instances.
 */

// Module-private state tracking boundaries
let envRegistry = null;
let boundBotInstance = null;
const chatHistoryLog = [];

// Production safety limits to safeguard the heap allocation matrix
const MAX_CHAT_LOG_ENTRIES = 25;

/**
 * Safely routes logs to the centralized LoggerService through the DI framework.
 * @param {string} level - Lowercase log severity type ('info', 'warn', 'error').
 * @param {string} message - Primary log narrative text.
 * @param {*} [error] - Supplementary error stack or object context structure.
 */
function safeLog(level, message, error = null) {
    if (envRegistry &&
        envRegistry.services &&
        envRegistry.services.logger &&
        typeof envRegistry.services.logger[level] === 'function') {
        envRegistry.services.logger[level](message, error);
    }
}

/**
 * Perception Subsystem Interface Layer.
 * Manages reactive text event collection and coordinates environmental sampling summaries.
 */
const PerceptionSubsystem = {
    /**
     * Mounts the global dependency injection container onto the module private context memory.
     * @param {Object} registry - Top-level central application mapping matrix reference.
     */
    initialize(registry) {
        if (!registry || !registry.services || !registry.subsystems) {
            throw new Error('PerceptionSubsystem Initialization Failure: Malformed dependency injection registry contract mapping.');
        }
        envRegistry = registry;
        safeLog('info', 'Perception cognitive subsystem layer successfully initialized.');
    },

    /**
     * Binds the subsystem processing routes to the active live network socket wrapper instance.
     * Resets local temporal state tracking metrics to clear out historical leak profiles.
     * @param {Object} bot - Concrete instantiated Mineflayer bot object instance.
     */
    bindBot(bot) {
        if (!envRegistry) {
            throw new Error('PerceptionSubsystem Integration Violation: bindBot called prior to module initialization.');
        }
        if (!bot) {
            throw new Error('PerceptionSubsystem Integration Violation: Cannot bind an empty or non-existent bot reference allocation.');
        }
        boundBotInstance = bot;
        
        // Wipe historical memory allocations cleanly on connection lifecycle shifts
        chatHistoryLog.length = 0;
        
        safeLog('info', 'Perception cognitive subsystem successfully attached to live bot network context.');
    },

    /**
     * Periodically samples the ambient world matrix to refresh tactical intelligence structures.
     * Invoked downstream by the core DecisionEngine orchestrator frame.
     * @returns {Promise<void>} Resolves when the world state extraction pass finishes processing.
     */
    async updateWorldState() {
        try {
            if (!boundBotInstance || !envRegistry.services.perception) {
                return;
            }

            // Execute zero-overhead extraction matrices through the lower interface layer
            const perceptionService = envRegistry.services.perception;
            if (typeof perceptionService.getNearbyEntities === 'function') {
                const immediateMobs = perceptionService.getNearbyMobs(16);
                if (immediateMobs.length > 0) {
                    safeLog('info', `Perception scanned ${immediateMobs.length} active mobile entities within proximity boundaries.`);
                }
            }
        } catch (fault) {
            safeLog('error', 'Exception trapped during updateWorldState synchronization frame pass:', fault);
        }
    },

    /**
     * Processes public server broadcast communication lines channeled from the EventRouter firewall.
     * @param {string} username - Incoming message author classification tag.
     * @param {string} message - Unfiltered core text payload token.
     */
    processChat(username, message) {
        try {
            if (!username || !message || typeof username !== 'string' || typeof message !== 'string') {
                return;
            }

            const cleanUsername = username.trim();
            const cleanMessage = message.trim();

            safeLog('info', `Perception subsystem recorded public log thread entry from [${cleanUsername}].`);

            // Push bounded structure footprint into memory array tracking metrics
            chatHistoryLog.push({
                sender: cleanUsername,
                text: cleanMessage,
                timestamp: Date.now(),
                isPrivate: false
            });

            // Prevent memory exhaustion via strict array shifting limits
            while (chatHistoryLog.length > MAX_CHAT_LOG_ENTRIES) {
                chatHistoryLog.shift();
            }
        } catch (fault) {
            safeLog('error', 'Exception caught during processChat context mapping path:', fault);
        }
    },

    /**
     * Processes targeted private messages sent directly to the agent runtime instance interface.
     * @param {string} username - Incoming message sender identity identifier.
     * @param {string} message - Secretive core command or text payload string.
     */
    processWhisper(username, message) {
        try {
            if (!username || !message || typeof username !== 'string' || typeof message !== 'string') {
                return;
            }

            const cleanUsername = username.trim();
            const cleanMessage = message.trim();

            safeLog('info', `Perception subsystem tracked incoming discrete whisper loop thread from [${cleanUsername}].`);

            chatHistoryLog.push({
                sender: cleanUsername,
                text: cleanMessage,
                timestamp: Date.now(),
                isPrivate: true
            });

            while (chatHistoryLog.length > MAX_CHAT_LOG_ENTRIES) {
                chatHistoryLog.shift();
            }
        } catch (fault) {
            safeLog('error', 'Exception caught during processWhisper context mapping path:', fault);
        }
    },

    /**
     * Provides an isolated snapshot of historical textual communication logs.
     * Fully preserves memory-safety parameters by keeping reference allocations localized.
     * @returns {Array<Object>} Lightweight structural copies array of recent chat parameters.
     */
    getRecentChatLogs() {
        return chatHistoryLog.map((log) => ({
            sender: log.sender,
            text: log.text,
            timestamp: log.timestamp,
            isPrivate: log.isPrivate
        }));
    }
};

Object.freeze(PerceptionSubsystem);
module.exports = PerceptionSubsystem;
