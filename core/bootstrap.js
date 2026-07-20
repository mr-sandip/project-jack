/**
 * @file core/bootstrap.js
 * @description System startup entry point. Constructs the centralized Dependency Injection (DI) registry,
 * maps all core services, subsystems, and the primary engine controller, hooks process lifecycle event streams,
 * and coordinates a clean fault-isolated runtime start and shutdown footprint for Render Free Tier nodes.
 */

const path = require('path');

// Module-private state to enforce atomic singleton shutdown execution
let isShuttingDown = false;

/**
 * Safely dispatches logs to the centralized LoggerService if fully available within the registry framework.
 * @param {Object} registry - The central dependency injection container reference.
 * @param {string} level - Lowercase log severity token level ('info', 'warn', 'error').
 * @param {string} message - Primary narrative log text payload string.
 * @param {*} [error] - Optional supplementary error context matrix or stack trace.
 */
function safeLog(registry, level, message, error = null) {
    if (registry &&
        registry.services &&
        registry.services.logger &&
        typeof registry.services.logger[level] === 'function') {
        registry.services.logger[level](message, error);
    }
}

/**
 * Cascades process shutdown commands through all subsystems to purge dangling resources.
 * Guarantees that asynchronous tick intervals or network listeners are wiped before exit.
 * @param {Object} registry - Central dependency application registry matrix framework.
 * @param {number} exitCode - Native operating system termination status integer code.
 */
function executeGracefulShutdown(registry, exitCode = 0) {
    if (isShuttingDown) {
        return;
    }
    isShuttingDown = true;

    try {
        if (registry && registry.core && registry.core.brain) {
            safeLog(registry, 'info', 'System intercept event triggered. Halting core cognitive components cleanly...');
            if (typeof registry.core.brain.stop === 'function') {
                registry.core.brain.stop();
            }
        }
        
        if (registry && registry.core && registry.core.actionQueue && typeof registry.core.actionQueue.clear === 'function') {
            registry.core.actionQueue.clear();
        }
    } catch (shutdownFault) {
        if (registry && registry.services && registry.services.logger) {
            safeLog(registry, 'error', 'An error occurred while cleaning up background resources:', shutdownFault);
        }
    } finally {
        // Enforce process termination on a clean next tick boundary to decouple from active execution frames
        process.nextTick(() => {
            process.exit(exitCode);
        });
    }
}

/**
 * Builds the runtime dependency architecture configuration frames, binds the bot socket layer,
 * and engages the unified execution brain orchestrator.
 * @param {Object} bot - Instantiated Mineflayer protocol bot object container instance.
 * @returns {Object} Fully compiled application DI registry matrix framework.
 * @throws {Error} If initial parameters validation or setup execution chains fail.
 */
function bootstrap(bot) {
    if (!bot) {
        throw new Error('Bootstrap Failure: Cannot instantiate system without a valid active Mineflayer bot target.');
    }
    if (typeof bot.on !== 'function') {
        throw new Error('Bootstrap Failure: Invalid Mineflayer bot instance interface provided.');
    }

    // Phase 1: Dynamic fallback schema layout loading for systemic config parameters
    let configurationMatrix = {};
    try {
        configurationMatrix = require(path.join(__dirname, '../config/settings.json'));
    } catch (configLoadFault) {
        // Fall back gracefully to internal default schemas if configuration storage file is missing
        configurationMatrix = {
            runtime: { maxQueueLength: 100 },
            personality: { cognitiveTickIntervalMs: 1000 },
            safety: { lowHealthThreshold: 6 }
        };
    }

    // Phase 2: Monolithic structural dependency layer assembly injection construction
    const registry = {
        config: configurationMatrix,
        services: {},
        subsystems: {},
        core: {}
    };

    try {
        // Core layer wiring
        registry.core.actionQueue = require('./actionQueue');
        registry.core.brain = require('./brain');

        // Services mapping layer contracts
        registry.services.logger = require('../services/loggerService');
        registry.services.safety = require('../services/safetyService');
        registry.services.perception = require('../services/perceptionService');
        registry.services.navigation = require('../services/navigationService');
        registry.services.inventory = require('../services/inventoryService');

        // Subsystems cognitive evaluation architecture controllers
        registry.subsystems.safety = require('../subsystems/safety');
        registry.subsystems.perception = require('../subsystems/perception');
        registry.subsystems.goalManager = require('../subsystems/goalManager');
        registry.subsystems.planner = require('../subsystems/planner');
        registry.subsystems.actionExecutor = require('../subsystems/actionExecutor');
        registry.subsystems.decisionEngine = require('../subsystems/decisionEngine');

        // Mirror decisionEngine map pointer alignment to guarantee brain dual-path lookup options
        registry.core.decisionEngine = registry.subsystems.decisionEngine;

    } catch (requireFault) {
        throw new Error(`Bootstrap Component Link Failure: Module resolution path broke inside mapping layer: ${requireFault.message}`);
    }

    // Phase 3: Synchronous centralized logger initialization initialization 
    if (registry.services.logger && typeof registry.services.logger.initialize === 'function') {
        if (registry.config && registry.config.logging) {
            registry.services.logger.initialize(registry.config.logging);
        } else {
            registry.services.logger.initialize({ enabled: true, minLogLevel: 'info', maxBufferEntries: 50 });
        }
    }

    safeLog(registry, 'info', 'DI Registry map compilation successful. Engaging component activation paths...');

    // Phase 4: Setting up global operational environment lifecycles and event monitoring guards
    process.on('SIGINT', () => {
        safeLog(registry, 'warn', 'System context caught SIGINT signal loop vector termination protocol.');
        executeGracefulShutdown(registry, 0);
    });

    process.on('SIGTERM', () => {
        safeLog(registry, 'warn', 'System context caught SIGTERM hosting signal loop eviction.');
        executeGracefulShutdown(registry, 0);
    });

    process.on('uncaughtException', (fatalError) => {
        safeLog(registry, 'error', 'CRITICAL FIREWALL BOUNDARY INTRUSION: Trapped uncaught runtime exception inside host process:', fatalError);
        executeGracefulShutdown(registry, 1);
    });

    process.on('unhandledRejection', (unresolvedPromiseReason) => {
        safeLog(registry, 'error', 'ASYNC COGNITIVE LOOP COLLAPSE: Trapped an unhandled promise rejection tracking chain:', unresolvedPromiseReason);
        executeGracefulShutdown(registry, 1);
    });

    // Phase 5: Sequential bootstrapping engine operational execution 
    try {
        // Mount action queue parameters first to absorb initialization sequence items mapping telemetry traces
        if (registry.core.actionQueue && typeof registry.core.actionQueue.initialize === 'function') {
            registry.core.actionQueue.initialize(registry);
        }

        // Initialize Brain tracking routines (cascades initializations out down across components elements)
        if (registry.core.brain && typeof registry.core.brain.initialize === 'function') {
            registry.core.brain.initialize(registry);
        }

        // Bind application sockets pointer registries mapping elements structures
        if (registry.core.brain && typeof registry.core.brain.bindBot === 'function') {
            registry.core.brain.bindBot(bot);
        }

        // Engage primary scheduler loops execution ticks
        if (registry.core.brain && typeof registry.core.brain.start === 'function') {
            registry.core.brain.start();
        }

        safeLog(registry, 'info', 'Bootstrap initialization cycle completed successfully. System pipeline fully functional.');
    } catch (bootFault) {
        safeLog(registry, 'error', 'Fatal configuration initialization crash experienced during bootstrap sequencing:', bootFault);
        executeGracefulShutdown(registry, 1);
        throw bootFault;
    }

    // Freeze top-level containers configuration mappings attributes data fields objects definitions
    Object.freeze(registry.services);
    Object.freeze(registry.subsystems);
    Object.freeze(registry.core);
    Object.freeze(registry);

    return registry;
}

module.exports = bootstrap;
      
