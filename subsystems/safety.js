/**
 * @file subsystems/safety.js
 * @description Coordinates the cognitive safety monitoring and hazard interception subsystem.
 * Protects the agent from environmental dangers, structural falls, and critical health failure states
 * by tracking metrics and interfacing directly with the core tick and event infrastructure.
 */

// Module-private state variables
let envRegistry = null;
let boundBotInstance = null;
let currentHealth = 20;
let currentFood = 20;
let isHazardDetected = false;

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
 * Cognitive Safety Subsystem Interface Layer.
 * Operates as a frozen state singleton evaluating operational environment risks.
 */
const SafetySubsystem = {
    /**
     * Mounts the global dependency injection container onto the module private context memory.
     * @param {Object} registry - Top-level central application mapping matrix reference.
     */
    initialize(registry) {
        if (!registry || !registry.services || !registry.config) {
            throw new Error('SafetySubsystem Initialization Failure: Malformed dependency injection registry contract mapping.');
        }
        envRegistry = registry;
        safeLog('info', 'Safety cognitive subsystem layer successfully initialized.');
    },

    /**
     * Binds the safety evaluator to the live network socket wrapper instance.
     * Resets internal tracking thresholds to safe default baselines.
     * @param {Object} bot - Concrete instantiated Mineflayer bot object instance.
     */
    bindBot(bot) {
        if (!envRegistry) {
            throw new Error('SafetySubsystem Integration Violation: bindBot called prior to module initialization.');
        }
        if (!bot) {
            throw new Error('SafetySubsystem Integration Violation: Cannot bind an empty or non-existent bot reference allocation.');
        }
        boundBotInstance = bot;
        
        // Reset transient status metrics upon fresh socket binding
        currentHealth = 20;
        currentFood = 20;
        isHazardDetected = false;
        
        safeLog('info', 'Safety cognitive subsystem successfully attached to live bot network context.');
    },

    /**
     * Processes raw biological metrics pushed from the network event infrastructure.
     * Evaluates real-time health levels against configurable structural bounds.
     * @param {number} health - Current health points of the bot entity.
     * @param {number} food - Current hunger/saturation points of the bot entity.
     */
    processHealthUpdate(health, food) {
        try {
            if (typeof health !== 'number' || typeof food !== 'number') {
                return;
            }
            currentHealth = health;
            currentFood = food;

            let lowHealthThreshold = 6;
            if (envRegistry.config.safety && 
                typeof envRegistry.config.safety.lowHealthThreshold === 'number') {
                // Fix 1 — Validate lowHealthThreshold: Clamp value to a safe production range (1–20)
                lowHealthThreshold = Math.max(1, Math.min(envRegistry.config.safety.lowHealthThreshold, 20));
            }

            if (currentHealth <= lowHealthThreshold) {
                safeLog('warn', `Critical health event intercepted. Current Health: ${currentHealth}, Food: ${currentFood}`);
            }
        } catch (fault) {
            safeLog('error', 'Error encountered during processHealthUpdate execution path:', fault);
        }
    },

    /**
     * Executes lightweight high-frequency geographic/environmental monitoring loops.
     * Invoked every 50ms via the core physics tick thread; design preserves non-blocking semantics.
     */
    evaluatePhysicalSurroundings() {
        try {
            if (!boundBotInstance || !boundBotInstance.entity) {
                return;
            }

            const position = boundBotInstance.entity.position;
            if (!position) return;

            // Perform simple vertical vector parsing to inspect the support block layer below the agent
            if (typeof boundBotInstance.blockAt === 'function') {
                const blockBelow = boundBotInstance.blockAt(position.offset(0, -1, 0));
                
                // Track void falling hazards securely without allocating deep processing tasks
                // Fix 2 — Validate blockAt() return value: Ensure blockBelow is a valid object with a string "name" property
                if (blockBelow && typeof blockBelow === 'object' && typeof blockBelow.name === 'string' && blockBelow.name === 'air') {
                    const velocity = boundBotInstance.entity.velocity;
                    if (velocity && velocity.y < -0.5) {
                        if (!isHazardDetected) {
                            safeLog('warn', `Uncontrolled vertical descent detected. Velocity Y: ${velocity.y}`);
                            isHazardDetected = true;
                        }
                        return;
                    }
                }
            }
            
            // Clear temporary spatial hazard markers if safety checks pass consistently
            isHazardDetected = false;
        } catch (fault) {
            safeLog('error', 'Error isolated inside lightweight physics evaluation execution chain:', fault);
        }
    },

    /**
     * Evaluates general environment risk profiles prior to initiating scheduling cycles.
     * Informs the DecisionEngine whether it is safe to proceed with task sequencing.
     * @returns {Promise<boolean>} Resolves to true if the system status passes all safety firewalls.
     */
    evaluateCurrentRisk() {
        return new Promise((resolve) => {
            try {
                let lowHealthThreshold = 6;
                if (envRegistry.config.safety && 
                    typeof envRegistry.config.safety.lowHealthThreshold === 'number') {
                    // Fix 1 — Validate lowHealthThreshold: Clamp value to a safe production range (1–20)
                    lowHealthThreshold = Math.max(1, Math.min(envRegistry.config.safety.lowHealthThreshold, 20));
                }

                // If biological parameters drop past critical lines, trip the decision engine safety switch
                if (currentHealth < lowHealthThreshold) {
                    safeLog('warn', 'Risk assessment denied loop execution: Vital safety thresholds breached.');
                    return resolve(false);
                }

                // Intercept execution pathways if physics tickers have active hazard locks engaged
                if (isHazardDetected) {
                    safeLog('warn', 'Risk assessment denied loop execution: Structural fall hazard active.');
                    return resolve(false);
                }

                resolve(true);
            } catch (fault) {
                safeLog('error', 'Critical exception trapped inside evaluateCurrentRisk firewall path:', fault);
                // Fail-safe default: Halt decision cycles if an internal fault breaks evaluation logic
                resolve(false);
            }
        });
    }
};

Object.freeze(SafetySubsystem);
module.exports = SafetySubsystem;
