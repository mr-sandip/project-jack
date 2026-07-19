const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');

// Static Architectural Module Imports
const LoggerService = require('../services/loggerService');
const EventRouter = require('./eventRouter');
const ActionQueue = require('./actionQueue');

const NavigationService = require('../services/navigationService');
const InventoryService = require('../services/inventoryService');
const ChatService = require('../services/chatService');
const SafetyService = require('../services/safetyService');

const PerceptionSubsystem = require('../subsystems/perception');
const MemorySubsystem = require('../subsystems/memory');
const LearningSubsystem = require('../subsystems/learning');
const GoalManagerSubsystem = require('../subsystems/goalManager');
const PlannerSubsystem = require('../subsystems/planner');
const DecisionEngineSubsystem = require('../subsystems/decisionEngine');
const ActionExecutorSubsystem = require('../subsystems/actionExecutor');
const PersonalitySubsystem = require('../subsystems/personality');
const SafetySubsystem = require('../subsystems/safety');

/**
 * Orchestrates the full sequential boot cycle of the autonomous agent.
 * @param {Object} config - Fully validated runtime configuration dictionary.
 * @returns {Object} Application context structure containing the dynamic bot reference wrapper.
 */
function bootstrap(config) {
    // Requirement 4: Explicitly validate the LoggerService contract before initial use to avoid early crash loops
    if (!LoggerService || 
        typeof LoggerService.initialize !== 'function' || 
        typeof LoggerService.info !== 'function' || 
        typeof LoggerService.warn !== 'function' || 
        typeof LoggerService.error !== 'function') {
        throw new Error('Critical Bootstrap Failure: LoggerService contract interface validation failed or missing required methods.');
    }

    // Phase 1: Initialize fundamental tracing layer instantly
    LoggerService.initialize(config.logging);
    LoggerService.info('Kernel bootstrapping sequence initiated.');

    // Phase 2: Assemble services and subsystem maps
    const services = {
        logger: LoggerService,
        navigation: NavigationService,
        inventory: InventoryService,
        chat: ChatService,
        safety: SafetyService
    };

    const subsystems = {
        perception: PerceptionSubsystem,
        memory: MemorySubsystem,
        learning: LearningSubsystem,
        goalManager: GoalManagerSubsystem,
        planner: PlannerSubsystem,
        decisionEngine: DecisionEngineSubsystem,
        actionExecutor: ActionExecutorSubsystem,
        personality: PersonalitySubsystem,
        safety: SafetySubsystem
    };

    const kernel = {
        eventRouter: EventRouter,
        actionQueue: ActionQueue
    };

    // Central Dependency Injection Registry Setup
    const registry = { config, services, subsystems, kernel };

    // Requirement 1: Validate structural shape of objects upon initialization instead of unreachable top-level null checks
    const requiredServices = ['navigation', 'inventory', 'chat', 'safety'];
    requiredServices.forEach((srvName) => {
        const srv = services[srvName];
        if (!srv || typeof srv.initialize !== 'function' || typeof srv.bindBot !== 'function') {
            throw new Error(`Critical Bootstrap Interface Interception: Required service "${srvName}" has an incomplete contract interface.`);
        }
    });

    if (typeof kernel.actionQueue.initialize !== 'function' || typeof kernel.eventRouter.initialize !== 'function') {
        throw new Error('Critical Bootstrap Interface Interception: Incomplete core kernel contract interface.');
    }

    Object.keys(subsystems).forEach((key) => {
        if (!subsystems[key] || typeof subsystems[key].initialize !== 'function') {
            throw new Error(`Critical Bootstrap Subsystem Interception: Cognitive subsystem "${key}" failed validation check.`);
        }
    });

    LoggerService.info('Injecting application dependency matrices across module registries...');

    // Execute Initial Lifecycle Initializations (.initialize())
    services.navigation.initialize(registry);
    services.inventory.initialize(registry);
    services.chat.initialize(registry);
    services.safety.initialize(registry);
    kernel.actionQueue.initialize(registry);
    kernel.eventRouter.initialize(registry);

    Object.keys(subsystems).forEach((key) => {
        subsystems[key].initialize(registry);
    });

    // Stable Application Context Reference Shell to return to index.js
    const appContext = {
        bot: null,
        registry: registry
    };

    // Tracking flags for lifecycle loops, active sockets, and exponential backoff
    let activeBotInstance = null;
    let cognitiveLoopStarted = false;
    let reconnectAttempts = 0;

    /**
     * Instantiates the raw Mineflayer instance and applies immediate sequential bindings.
     */
    function instantiateAndBindCore() {
        // Requirement 2: Clean up previous bot instance resources and listeners to prevent memory leaks during reconnects
        if (activeBotInstance) {
            try {
                LoggerService.info('Cleaning up active network listeners and resources of the stale bot instance...');
                activeBotInstance.removeAllListeners();
                if (typeof activeBotInstance.quit === 'function' && !activeBotInstance.intentionalShutdown) {
                    activeBotInstance.quit();
                }
            } catch (cleanupError) {
                LoggerService.error('Error encountered during stale bot instance resource cleanup loop:', cleanupError);
            }
            activeBotInstance = null;
        }

        LoggerService.info(`Establishing socket matrix to target host: ${config.server.host}:${config.server.port}`);

        const botInstance = mineflayer.createBot({
            host: config.server.host,
            port: config.server.port,
            username: config.bot.username,
            version: config.server.version,
            auth: config.bot.auth
        });

        // Set state management pointers and index.js visibility references
        activeBotInstance = botInstance;
        appContext.bot = botInstance;

        // Intercept bot.quit() to separate intentional shutdown from unexpected server disconnects
        const originalQuit = botInstance.quit.bind(botInstance);
        botInstance.quit = () => {
            botInstance.intentionalShutdown = true;
            LoggerService.info('Intentional shutdown token signed via bot.quit(). Reconnect protocols bypassed.');
            originalQuit();
        };

        // Phase 3: CRITICAL SINGLE-BLOCK SYNCHRONOUS LATE BINDING
        // Requirement 3: Rebind the existing persistent components to the fresh socket reference safely on reconnect
        services.navigation.bindBot(botInstance);
        services.inventory.bindBot(botInstance);
        services.chat.bindBot(botInstance);
        services.safety.bindBot(botInstance);
        kernel.eventRouter.bindBot(botInstance);

        Object.keys(subsystems).forEach((key) => {
            if (typeof subsystems[key].bindBot === 'function') {
                subsystems[key].bindBot(botInstance);
            }
        });

        // Wrap Mineflayer Plugin loading sequence inside protective walls
        try {
            botInstance.loadPlugin(pathfinder);
            LoggerService.info('Mineflayer pathfinder routing interface attached successfully.');
        } catch (pluginLoadError) {
            LoggerService.error('Critical Plugin Hook Failure! mineflayer-pathfinder could not hook:', pluginLoadError);
            throw pluginLoadError;
        }

        // Phase 4: World Stabilization and Event Routers Setup
        botInstance.once('spawn', () => {
            reconnectAttempts = 0; // Reset network retry metrics upon clear manifestation
            LoggerService.info(`Agent identity [${botInstance.username}] successfully manifested inside the server world.`);

            // Requirement 5: Verify bot.pathfinder exists explicitly before calling setMovements to prevent crashes
            if (botInstance.pathfinder && typeof botInstance.pathfinder.setMovements === 'function') {
                try {
                    const defaultMovements = new Movements(botInstance);
                    defaultMovements.maxNodes = config.pathfinder.maxNodes;
                    botInstance.pathfinder.setMovements(defaultMovements);
                    LoggerService.info(`Pathfinder boundaries active: maxNodes limited to ${config.pathfinder.maxNodes}`);
                } catch (pathfinderInitError) {
                    LoggerService.error('Failed to configure pathfinder boundary constraints safely:', pathfinderInitError);
                }
            } else {
                LoggerService.warn('Pathfinder plugin layer is missing or failed to expose setMovements contract method.');
            }

            // Requirement 3 (Cont.): The DecisionEngine loop survives restarts as a state processor but requires rebound sockets.
            // Fire the main ticker loop exactly once across the global execution lifecycle.
            if (!cognitiveLoopStarted) {
                const chunkStabilizationDelayMs = 2000;
                setTimeout(() => {
                    if (typeof subsystems.decisionEngine.startLoop === 'function') {
                        LoggerService.info('Server chunks stabilized. Activating primary cognitive ticker loop.');
                        subsystems.decisionEngine.startLoop();
                        cognitiveLoopStarted = true;
                    } else {
                        LoggerService.error('Decision Engine execution target interface mapping is completely missing.');
                    }
                }, chunkStabilizationDelayMs);
            } else {
                LoggerService.info('Cognitive tracking execution grid rebound safely. Persistent execution loop continues.');
            }
        });

        // Sockets Fault Isolation Listeners
        botInstance.on('error', (networkError) => {
            LoggerService.error('Mineflayer network socket layer encountered an unhandled fault:', networkError);
        });

        botInstance.on('end', (disconnectReason) => {
            LoggerService.warn(`Mineflayer connection context closed. Reason token: ${disconnectReason}`);

            if (botInstance.intentionalShutdown === true) {
                LoggerService.info('Graceful exit completed. Core bootstrapper engine entering inactive safe decay.');
                return;
            }

            // Enforce Configurable Reconnect Policy with Exponential Backoff Strategy
            const reconPolicy = config.runtime.reconnect;
            if (reconPolicy && reconPolicy.enabled === true) {
                if (reconnectAttempts < reconPolicy.maxAttempts) {
                    reconnectAttempts++;
                    
                    // Compute backoff interval: baseDelay * 2^(attempt - 1), capped cleanly at maxDelayMs
                    const backoffDelayMs = Math.min(
                        reconPolicy.baseDelayMs * Math.pow(2, reconnectAttempts - 1),
                        reconPolicy.maxDelayMs
                    );

                    LoggerService.warn(`Unexpected disconnect sequence. Attempting network re-allocation loop (${reconnectAttempts}/${reconPolicy.maxAttempts}) in ${backoffDelayMs}ms...`);
                    
                    setTimeout(() => {
                        try {
                            instantiateAndBindCore();
                        } catch (reconnectInitializationFault) {
                            LoggerService.error('Failed to execute mid-tier network reconnection sequence:', reconnectInitializationFault);
                        }
                    }, backoffDelayMs);
                } else {
                    LoggerService.error(`Critical Core System Crash: Total connection attempts (${reconPolicy.maxAttempts}) completely exhausted. Core process execution halted.`);
                }
            } else {
                LoggerService.info('Automated network allocation policy is disabled. Standing down core engine components.');
            }
        });
    }

    // Trigger the initial primary instantiation sweep
    instantiateAndBindCore();

    return appContext;
}

module.exports = { bootstrap };
                
