/**
 * @file subsystems/goalManager.js
 * @description Manages goal tracking, selection, and priority arbitration for the agent.
 * Assesses environmental data from perception and safety boundaries to select the optimal objective
 * while protecting the memory footprint against growth allocations on Render Free Tier.
 */

// Module-private state tracking boundaries
let envRegistry = null;
let boundBotInstance = null;
let activeGoal = null;

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
 * Goal Management Subsystem Interface Layer.
 * Operates as a frozen state singleton arbitrating agent objectives.
 */
const GoalManagerSubsystem = {
    /**
     * Mounts the global dependency injection container onto the module private context memory.
     * @param {Object} registry - Top-level central application mapping matrix reference.
     */
    initialize(registry) {
        if (!registry || !registry.services || !registry.subsystems || !registry.config) {
            throw new Error('GoalManagerSubsystem Initialization Failure: Malformed dependency injection registry contract mapping.');
        }
        envRegistry = registry;
        safeLog('info', 'GoalManager cognitive subsystem layer successfully initialized.');
    },

    /**
     * Binds the subsystem to the active live network socket wrapper instance.
     * Resets any stale tracking states to isolate execution histories.
     * @param {Object} bot - Concrete instantiated Mineflayer bot object instance.
     */
    bindBot(bot) {
        if (!envRegistry) {
            throw new Error('GoalManagerSubsystem Integration Violation: bindBot called prior to module initialization.');
        }
        if (!bot) {
            throw new Error('GoalManagerSubsystem Integration Violation: Cannot bind an empty or non-existent bot reference allocation.');
        }
        boundBotInstance = bot;
        
        // Clear active goals explicitly upon connection lifecycle shifts to erase stale references
        activeGoal = null;
        
        safeLog('info', 'GoalManager cognitive subsystem successfully attached to live bot network context.');
    },

    /**
     * Evaluates current internal drives and environmental states to select the highest priority goal.
     * Invoked downstream sequentially by the core DecisionEngine orchestration loop.
     * @returns {Promise<Object|null>} Resolves with the chosen validated goal structure, or null.
     */
    async arbitrateGoals() {
        try {
            if (!boundBotInstance || !envRegistry) {
                return null;
            }

            // Fallback default goal baseline
            let chosenGoal = {
                name: 'idle',
                priority: 0,
                data: {}
            };

            // Phase 1: Check safety baseline criteria using the bound registry state parameters
            if (boundBotInstance.health !== undefined && boundBotInstance.health < 6) {
                chosenGoal = {
                    name: 'survive',
                    priority: 100, // Absolute top priority threshold ceiling
                    data: { reason: 'low_health', currentHealth: boundBotInstance.health }
                };
                activeGoal = chosenGoal;
                return activeGoal;
            }

            // Phase 2: Check for contextual events (e.g., incoming whispers or pending commands)
            if (envRegistry.subsystems.perception && typeof envRegistry.subsystems.perception.getRecentChatLogs === 'function') {
                const logs = envRegistry.subsystems.perception.getRecentChatLogs();
                // Fix 1 — Non-mutating reverse approach applied to protect sensory arrays from unintended array mutation side-effects
                const latestWhisper = [...logs].reverse().find(log => log && log.isPrivate === true);
                
                if (latestWhisper && (Date.now() - latestWhisper.timestamp < 5000)) {
                    chosenGoal = {
                        name: 'respond_to_command',
                        priority: 50,
                        data: { command: latestWhisper.text, sender: latestWhisper.sender }
                    };
                }
            }

            // Phase 3: Dynamic arbitration evaluation matrix comparison bounds
            if (!activeGoal || chosenGoal.priority > activeGoal.priority) {
                if (!activeGoal || activeGoal.name !== chosenGoal.name) {
                    safeLog('info', `GoalManager arbitrated new objective shift: "${chosenGoal.name}" (Priority: ${chosenGoal.priority})`);
                }
                activeGoal = chosenGoal;
            }

            // Validate internal active goal formatting integrity before returning to scheduler frames
            if (activeGoal && (typeof activeGoal.name !== 'string' || typeof activeGoal.priority !== 'number')) {
                activeGoal = null;
            }

            return this.getActiveGoal();
        } catch (fault) {
            safeLog('error', 'Exception trapped during active goal arbitration execution pass:', fault);
            return null;
        }
    },

    /**
     * Explicitly forces a specific execution target configuration payload onto the engine tracking layer.
     * Inputs pass rigid parameter firewall validations to guard against type mutations.
     * @param {Object} goal - Custom target goal descriptor mapping parameters block.
     * @returns {boolean} True if the goal signature passed validation and was accepted.
     */
    setActiveGoal(goal) {
        try {
            if (!goal || typeof goal !== 'object') {
                safeLog('warn', 'Goal rejection intercepted: Received null or malformed goal object assignment.');
                return false;
            }

            if (typeof goal.name !== 'string' || typeof goal.priority !== 'number') {
                safeLog('warn', 'Goal rejection intercepted: Structure payload missing string name or numeric priority.');
                return false;
            }

            // Clamp incoming custom priorities securely between standard architectural bounds (0–100)
            const clampedPriority = Math.max(0, Math.min(goal.priority, 100));
            
            activeGoal = {
                name: goal.name.trim(),
                priority: clampedPriority,
                data: goal.data && typeof goal.data === 'object' ? goal.data : {}
            };

            safeLog('info', `GoalManager explicitly updated active target objective: "${activeGoal.name}"`);
            return true;
        } catch (fault) {
            safeLog('error', 'Exception caught during manual setActiveGoal variable configuration:', fault);
            return false;
        }
    },

    /**
     * Retrieves the currently bound active runtime target goal configuration mapping.
     * @returns {Object|null} Defensive isolated copy copy of active objective item pointer reference layout.
     */
    getActiveGoal() {
        // Fix 2 — Return defensive copy instead of internal reference to ensure external callers do not manipulate the state matrix
        if (!activeGoal) return null;
        return {
            name: activeGoal.name,
            priority: activeGoal.priority,
            data: activeGoal.data ? { ...activeGoal.data } : {}
        };
    },

    /**
     * Completely resets and clears out the active objective structure context.
     */
    clearActiveGoal() {
        activeGoal = null;
        safeLog('info', 'GoalManager cleared active objective tracking contexts cleanly.');
    }
};

Object.freeze(GoalManagerSubsystem);
module.exports = GoalManagerSubsystem;
