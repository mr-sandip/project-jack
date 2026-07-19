// Centralized Dependency Injection Registry Reference Holder
let envRegistry = null;
let boundBotInstance = null;

// Registry tracking matrix for active event listeners to prevent duplicate hook injection memory leaks
const activeListeners = {};

/**
 * Safely routes logs to the central LoggerService if it is initialized and fully available.
 * Prevents early initialization race condition crashes.
 * @param {string} level - Lowercase log severity type ('info', 'warn', 'error').
 * @param {string} message - Primary narrative log string.
 * @param {*} [error] - Optional error context payload structure.
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
 * Registers a safe event listener wrap to the active bot instance context.
 * Automatically tracks the reference to ensure clean removal during rebinds.
 * @param {Object} bot - The active Mineflayer bot target.
 * @param {string} eventName - Standard Mineflayer protocol event token.
 * @param {Function} handler - The custom structural routing logic callback.
 */
function registerEvent(bot, eventName, handler) {
    // Fix 1 — Prevent duplicate registration: Avoid adding a new listener if one is already active for this event
    if (activeListeners[eventName]) return;

    // Encapsulate execution inside defensive walls to prevent unhandled async loop crashes
    const safeWrapper = (...args) => {
        try {
            handler(...args);
        } catch (routingFault) {
            safeLog('error', `EventRouter encountered an execution fault on event "${eventName}":`, routingFault);
        }
    };

    bot.on(eventName, safeWrapper);
    activeListeners[eventName] = safeWrapper;
}

/**
 * Event core listener execution algorithms mapping.
 * Routes raw server packets to the respective cognitive subsystems and services safely.
 */
const handlers = {
    /**
     * Handles incoming server-wide textual communication packets.
     * @param {string} username - The sender's Minecraft username.
     * @param {string} message - The broadcasted text payload.
     */
    onChat(username, message) {
        // Anti-loop security firewall: Prevent the agent from processing its own broadcast outputs
        if (boundBotInstance && username === boundBotInstance.username) return;

        if (envRegistry && 
            envRegistry.subsystems && 
            envRegistry.subsystems.perception && 
            typeof envRegistry.subsystems.perception.processChat === 'function') {
            envRegistry.subsystems.perception.processChat(username, message);
        }
    },

    /**
     * Captures private direct DMs routed exclusively to the bot context.
     * Verified Event Mapping against Mineflayer v4.22.x specifications.
     * @param {string} username - The sender's Minecraft username.
     * @param {string} message - The private text payload.
     */
    onWhisper(username, message) {
        if (boundBotInstance && username === boundBotInstance.username) return;

        if (envRegistry && 
            envRegistry.subsystems && 
            envRegistry.subsystems.perception && 
            typeof envRegistry.subsystems.perception.processWhisper === 'function') {
            envRegistry.subsystems.perception.processWhisper(username, message);
        }
    },

    /**
     * Evaluates biological metric parameter shifts instantly upon modification.
     */
    onHealth() {
        if (boundBotInstance && 
            envRegistry && 
            envRegistry.subsystems && 
            envRegistry.subsystems.safety && 
            typeof envRegistry.subsystems.safety.processHealthUpdate === 'function') {
            envRegistry.subsystems.safety.processHealthUpdate(boundBotInstance.health, boundBotInstance.food);
        }
    },

    /**
     * High frequency structural ticker firing exactly every 50ms.
     * Guaranteed to remain lightweight and non-blocking to protect the primary event loop thread.
     */
    onPhysicsTick() {
        if (envRegistry && 
            envRegistry.subsystems && 
            envRegistry.subsystems.safety && 
            typeof envRegistry.subsystems.safety.evaluatePhysicalSurroundings === 'function') {
            // Execution route delegated directly to safety subsystem without introducing procedural overhead here
            envRegistry.subsystems.safety.evaluatePhysicalSurroundings();
        }
    }
};

/**
 * EventRouter Monolithic Module Export Interface.
 * Manages the reactive pipeline linking network protocol triggers to the DI architecture frame.
 */
const EventRouter = {
    /**
     * Hooks the top-level dependency container registry into local module memory safely.
     * @param {Object} registry - Central application reference matrix framework.
     */
    initialize(registry) {
        if (!registry || !registry.services || !registry.subsystems) {
            throw new Error('EventRouter Initialization Failure: Malformed dependency injection registry contract mapping.');
        }
        envRegistry = registry;
    },

    /**
     * Binds the core listeners to the newly allocated socket framework reference.
     * Automatically cleans up any previous bindings to eliminate memory leak hazards.
     * @param {Object} bot - Concrete instantiated Mineflayer bot object instance.
     */
    bindBot(bot) {
        if (!envRegistry) {
            throw new Error('EventRouter Integration Violation: bindBot called before module execution setup initialization.');
        }

        if (!bot) {
            throw new Error('EventRouter Integration Violation: Cannot bind an empty or non-existent bot instance reference allocation.');
        }

        // Fix 2 — Validate bot interface: Reject fake or malformed bot structures missing required core events contract API
        if (
            typeof bot.on !== 'function' ||
            typeof bot.removeListener !== 'function'
        ) {
            throw new Error(
                'EventRouter Integration Violation: Invalid Mineflayer bot interface.'
            );
        }

        // Phase A: Memory Leak Eraser Routine - Wipe stale hooks clean if re-binding after unexpected disconnects
        if (boundBotInstance) {
            safeLog('info', 'Purging outdated network event registry matrices to isolate new sockets allocations...');
            Object.keys(activeListeners).forEach((eventName) => {
                try {
                    if (typeof boundBotInstance.removeListener === 'function') {
                        boundBotInstance.removeListener(eventName, activeListeners[eventName]);
                    }
                } catch (detachError) {
                    // Fail silently during extraction to guarantee sequence runtime continuation
                }
                delete activeListeners[eventName];
            });
        }

        // Assign the clean active system pointers
        boundBotInstance = bot;

        safeLog('info', 'Mounting new reactive event pipeline routing descriptors onto bot instance.');

        // Phase B: Execution Hooks Setup Binding with Duplicate Registration Prevention
        registerEvent(bot, 'chat', handlers.onChat);
        registerEvent(bot, 'whisper', handlers.onWhisper);
        registerEvent(bot, 'health', handlers.onHealth);
        registerEvent(bot, 'physicsTick', handlers.onPhysicsTick);
    }
};

// Freeze the interface registry layer to protect system methods behavior attributes changes
Object.freeze(EventRouter);
module.exports = EventRouter;
  
