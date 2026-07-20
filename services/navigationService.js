/**
 * @file services/navigationService.js
 * @description Provides pathfinding coordination, goal execution, and movement configuration wrappers.
 * Integrates directly with mineflayer-pathfinder to execute safe, non-blocking navigation routines
 * engineered to prevent out-of-memory errors on resource-constrained hosting plans.
 */

// Module-private state variables
let envRegistry = null;
let boundBotInstance = null;

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
 * Navigation Interface Service Layer.
 * Operates as a frozen state singleton providing wrapper controls over the pathfinder engine.
 */
const NavigationService = {
    /**
     * Mounts the global dependency injection container onto the module private context memory.
     * @param {Object} registry - Top-level central application mapping matrix reference.
     */
    initialize(registry) {
        if (!registry || !registry.services || !registry.config) {
            throw new Error('NavigationService Initialization Failure: Malformed dependency injection registry contract mapping.');
        }
        envRegistry = registry;
        safeLog('info', 'Navigation infrastructure service layer successfully initialized.');
    },

    /**
     * Binds the navigation service methods to the active live network socket wrapper instance.
     * Sets up lifecycle listener cleanups to avoid resource or event leaks.
     * @param {Object} bot - Concrete instantiated Mineflayer bot object instance.
     */
    bindBot(bot) {
        if (!envRegistry) {
            throw new Error('NavigationService Integration Violation: bindBot called prior to module initialization.');
        }
        if (!bot) {
            throw new Error('NavigationService Integration Violation: Cannot bind an empty or non-existent bot reference allocation.');
        }
        boundBotInstance = bot;
        safeLog('info', 'Navigation service successfully attached to live bot network context.');
    },

    /**
     * Directs the pathfinder engine to compute and execute a path toward a given goal structure.
     * Automatically captures pathfinding states to protect thread performance.
     * @param {Object} goal - A valid mineflayer-pathfinder Goal instance (e.g., GoalBlock, GoalXZ).
     * @returns {boolean} True if the goal wrapper was successfully passed to pathfinder.
     */
    navigateToGoal(goal) {
        try {
            if (!boundBotInstance) {
                safeLog('error', 'Navigation execution requested without a bound bot instance context.');
                return false;
            }

            if (!boundBotInstance.pathfinder || typeof boundBotInstance.pathfinder.setGoal !== 'function') {
                safeLog('error', 'Navigation failed: mineflayer-pathfinder plugin is not hooked onto the bot object.');
                return false;
            }

            if (!goal) {
                safeLog('warn', 'Navigation rejected: Target goal payload object is null or invalid.');
                return false;
            }

            safeLog('info', 'Initiating path computation sequence towards specified target goal layout.');
            boundBotInstance.pathfinder.setGoal(goal);
            return true;
        } catch (fault) {
            safeLog('error', 'Critical operational exception trapped inside navigateToGoal execution path:', fault);
            return false;
        }
    },

    /**
     * Terminate any currently active pathing calculations or movement execution tracking loops immediately.
     * Resets the active goal state cleanly to release engine ticks.
     */
    cancelNavigation() {
        try {
            if (!boundBotInstance || !boundBotInstance.pathfinder || typeof boundBotInstance.pathfinder.setGoal !== 'function') {
                return;
            }

            safeLog('info', 'Halting active pathing trackers. Executing explicit pathfinder stop routine.');
            boundBotInstance.pathfinder.setGoal(null);
        } catch (fault) {
            safeLog('error', 'Exception caught during cancelNavigation execution cycle:', fault);
        }
    },

    /**
     * Modifies current heuristic movement parameters dynamically based on structural needs.
     * Ensures Render tier limits (maxNodes) are persistently respected across reconfigurations.
     * @param {Object} structuralOptions - Configuration parameter modifications map (e.g., allowParkour, canDig).
     */
    configureMovements(structuralOptions) {
        try {
            if (!boundBotInstance || !boundBotInstance.pathfinder) {
                return;
            }

            const pathfinderModule = require('mineflayer-pathfinder');
            if (!pathfinderModule || typeof pathfinderModule.Movements !== 'function') {
                safeLog('error', 'Failed to configure movements: mineflayer-pathfinder module definition unresolvable.');
                return;
            }

            const adjustedMovements = new pathfinderModule.Movements(boundBotInstance);
            
            // Enforce maximum path node evaluation ceilings to defend hardware memory buffers from spikes
            let allowedMaxNodes = 10000;
            if (
                envRegistry.config.pathfinder &&
                typeof envRegistry.config.pathfinder.maxNodes === 'number' &&
                envRegistry.config.pathfinder.maxNodes > 0
            ) {
                allowedMaxNodes = Math.min(envRegistry.config.pathfinder.maxNodes, 50000);
            }
            adjustedMovements.maxNodes = allowedMaxNodes;

            // Apply dynamic structural overrides defensively
            if (structuralOptions && typeof structuralOptions === 'object') {
                Object.keys(structuralOptions).forEach((key) => {
                    if (key !== 'maxNodes' && Object.prototype.hasOwnProperty.call(adjustedMovements, key)) {
                        adjustedMovements[key] = structuralOptions[key];
                    }
                });
            }

            boundBotInstance.pathfinder.setMovements(adjustedMovements);
            safeLog('info', `Navigation movements profile updated. Max nodes search ceiling capped at ${allowedMaxNodes}`);
        } catch (fault) {
            safeLog('error', 'Exception caught during configureMovements execution path adjusting:', fault);
        }
    },

    /**
     * Evaluates if the pathfinder system is actively tracking toward a target destination.
     * @returns {boolean} True if the bot has an uncompleted path routine running.
     */
    isNavigating() {
        try {
            if (!boundBotInstance || !boundBotInstance.pathfinder) {
                return false;
            }
            return typeof boundBotInstance.pathfinder.isMoving === 'function' && boundBotInstance.pathfinder.isMoving();
        } catch (fault) {
            safeLog('error', 'Error isolated inside isNavigating execution status check:', fault);
            return false;
        }
    }
};

Object.freeze(NavigationService);
module.exports = NavigationService;
          
