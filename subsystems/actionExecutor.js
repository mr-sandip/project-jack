/**
 * @file subsystems/actionExecutor.js
 * @description Decodes structured plans into sequential execution payloads and maps them onto the active execution pipeline.
 * Manages atomic transaction wrappers for physical movement, equipment updates, and system communications
 * without introducing memory overhead or event-loop blockage on Render Free Tier instances.
 */

// Module-private state tracking boundaries
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
 * Resolves the location of the core ActionQueue module dynamically across registry structural profiles.
 * @returns {Object|null} The validated ActionQueue instance interface, or null if unassigned.
 */
function getActionQueue() {
    if (!envRegistry) return null;
    if (envRegistry.core && envRegistry.core.actionQueue) return envRegistry.core.actionQueue;
    if (envRegistry.services && envRegistry.services.actionQueue) return envRegistry.services.actionQueue;
    return null;
}

/**
 * Action Execution Subsystem Interface Layer.
 * Operates as a frozen state singleton decomposing strategic plans into discrete transactional events.
 */
const ActionExecutorSubsystem = {
    /**
     * Mounts the global dependency injection container onto the module private context memory.
     * @param {Object} registry - Top-level central application mapping matrix reference.
     */
    initialize(registry) {
        if (!registry || !registry.services || !registry.subsystems) {
            throw new Error('ActionExecutorSubsystem Initialization Failure: Malformed dependency injection registry contract mapping.');
        }
        envRegistry = registry;
        safeLog('info', 'ActionExecutor cognitive subsystem layer successfully initialized.');
    },

    /**
     * Binds the subsystem execution contexts to the active live network socket wrapper instance.
     * @param {Object} bot - Concrete instantiated Mineflayer bot object instance.
     */
    bindBot(bot) {
        if (!envRegistry) {
            throw new Error('ActionExecutorSubsystem Integration Violation: bindBot called prior to module initialization.');
        }
        if (!bot) {
            throw new Error('ActionExecutorSubsystem Integration Violation: Cannot bind an empty or non-existent bot reference allocation.');
        }
        boundBotInstance = bot;
        safeLog('info', 'ActionExecutor cognitive subsystem successfully attached to live bot network context.');
    },

    /**
     * Processes a generated plan blueprint sequentially by pushing tasks into the async FIFO queue.
     * Awaits each processing transaction frame atomically to block concurrency splits inside execution timelines.
     * @param {Object} plan - The complete structural action plan object to extract from.
     * @returns {Promise<void>} Resolves when all atomic actions in the sequence have completed or short-circuited.
     */
    async dispatchPlan(plan) {
        try {
            if (!boundBotInstance || !envRegistry) return;

            if (!plan || typeof plan !== 'object' || !Array.isArray(plan.actions)) {
                safeLog('warn', 'ActionExecutor intercepted invalid plan layout. Aborting execution dispatch loop.');
                return;
            }

            const actionQueue = getActionQueue();
            if (!actionQueue || typeof actionQueue.enqueue !== 'function') {
                safeLog('error', 'ActionExecutor sequence halted: Core ActionQueue interface is unresolvable.');
                return;
            }

            safeLog('info', `ActionExecutor parsing plan for objective "${plan.goalName || 'unknown'}" containing ${plan.actions.length} directives.`);

            // Traverse the action payload matrix sequentially to preserve precise execution order contracts
            for (let i = 0; i < plan.actions.length; i++) {
                const action = plan.actions[i];
                if (!action || typeof action !== 'object' || typeof action.type !== 'string') {
                    continue;
                }

                const normalizedType = action.type.toUpperCase().trim();
                const currentTaskName = `plan_${plan.goalName || 'generic'}_step_${i}_${normalizedType.toLowerCase()}`;

                // Process standard operational actions with isolated async transaction wrappers
                if (normalizedType === 'EQUIP') {
                    if (envRegistry.services.inventory && typeof envRegistry.services.inventory.equipItem === 'function') {
                        await actionQueue.enqueue(currentTaskName, async () => {
                            return envRegistry.services.inventory.equipItem(action.item, action.destination);
                        }, action.timeoutMs || 5000);
                    }
                } else if (normalizedType === 'CHAT') {
                    if (typeof boundBotInstance.chat === 'function') {
                        await actionQueue.enqueue(currentTaskName, async () => {
                            boundBotInstance.chat(String(action.message));
                            return true;
                        }, action.timeoutMs || 2000);
                    }
                } else if (normalizedType === 'IDLE') {
                    await actionQueue.enqueue(currentTaskName, async () => {
                        return new Promise((resolve) => setTimeout(resolve, Math.max(0, action.duration || 1000)));
                    }, (action.duration || 1000) + 1000);
                } else {
                    safeLog('warn', `ActionExecutor bypassed unrecognized action definition signature: "${action.type}"`);
                }
            }
        } catch (fault) {
            safeLog('error', 'Critical runtime exception trapped inside plan dispatch execution loop:', fault);
        }
    }
};

Object.freeze(ActionExecutorSubsystem);
module.exports = ActionExecutorSubsystem;
