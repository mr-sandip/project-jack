/**
 * @file services/perceptionService.js
 * @description Collects, parses, and provides localized environmental entity and spatial metadata queries.
 * Leverages native Mineflayer internal registries defensively to keep memory consumption low
 * and avoid duplicating object graphs on resource-constrained platforms like Render Free Tier.
 */

// Module-private state variables
let envRegistry = null;
let boundBotInstance = null;

// Enforced safety ceiling constraints to guard CPU and memory resources
const MAX_PERCEPTION_RADIUS = 32;

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
 * Perception Interface Service Layer.
 * Operates as a frozen state singleton providing filtered query frames into live world tracking systems.
 */
const PerceptionService = {
    /**
     * Mounts the global dependency injection container onto the module private context memory.
     * @param {Object} registry - Top-level central application mapping matrix reference.
     */
    initialize(registry) {
        if (!registry || !registry.services || !registry.config) {
            throw new Error('PerceptionService Initialization Failure: Malformed dependency injection registry contract mapping.');
        }
        envRegistry = registry;
        safeLog('info', 'Perception infrastructure service layer successfully initialized.');
    },

    /**
     * Binds the perception service methods to the active live network socket wrapper instance.
     * @param {Object} bot - Concrete instantiated Mineflayer bot object instance.
     */
    bindBot(bot) {
        if (!envRegistry) {
            throw new Error('PerceptionService Integration Violation: bindBot called prior to module initialization.');
        }
        if (!bot) {
            throw new Error('PerceptionService Integration Violation: Cannot bind an empty or non-existent bot reference allocation.');
        }
        boundBotInstance = bot;
        safeLog('info', 'Perception service successfully attached to live bot network context.');
    },

    /**
     * Gathers a collection of entities within the tracking horizon filtered by physical distance and structural types.
     * Leverages existing live native references to optimize garbage collection on Render tier nodes.
     * @param {number} [maxDistance=16] - Maximum radial evaluation distance boundary limit.
     * @param {string} [typeFilter=null] - Restricts returns to specific category profiles ('player', 'mob', 'item').
     * @returns {Array<Object>} Extracted array list containing validated entity metadata structures.
     */
    getNearbyEntities(maxDistance = 16, typeFilter = null) {
        try {
            if (!boundBotInstance || !boundBotInstance.entity || !boundBotInstance.entities) {
                return [];
            }

            const origin = boundBotInstance.entity.position;
            if (!origin) return [];

            // Clamp max distance within safe operational maximum performance constraints
            const boundedRadius = Math.max(1, Math.min(maxDistance, MAX_PERCEPTION_RADIUS));
            const targetedEntities = [];

            // Traverse the internal map directly to protect memory frames from redundant cloning overhead
            Object.keys(boundBotInstance.entities).forEach((id) => {
                const target = boundBotInstance.entities[id];
                
                // Exclude self reference structures from perception matrix streams
                if (!target || target === boundBotInstance.entity || !target.position) {
                    return;
                }

                const distance = origin.distanceTo(target.position);
                if (distance > boundedRadius) {
                    return;
                }

                // Map standard prismarine entity classification signatures cleanly
                if (typeFilter) {
                    if (typeFilter === 'player' && target.type !== 'player') return;
                    if (typeFilter === 'mob' && target.type !== 'mob') return;
                    if (typeFilter === 'item' && target.type !== 'object' && target.name !== 'item') return;
                }

                targetedEntities.push({
                    id: target.id,
                    name: target.name || (target.username ? target.username : 'unknown'),
                    type: target.type,
                    position: target.position.clone(),
                    velocity: target.velocity ? target.velocity.clone() : null,
                    distance: distance
                });
            });

            // Return isolated results ordered from nearest to farthest vector coordinates cleanly
            return targetedEntities.sort((a, b) => a.distance - b.distance);
        } catch (fault) {
            safeLog('error', 'Exception caught during getNearbyEntities context evaluation:', fault);
            return [];
        }
    },

    /**
     * Convenient query profile extracting tracking coordinates exclusively for online active human players.
     * @param {number} [maxDistance=16] - Radial inspection range.
     * @returns {Array<Object>} Sorted player structures reference arrays collection.
     */
    getNearbyPlayers(maxDistance = 16) {
        return this.getNearbyEntities(maxDistance, 'player');
    },

    /**
     * Convenient query profile isolating hostile or neutral animal biological entity objects.
     * @param {number} [maxDistance=16] - Radial inspection range.
     * @returns {Array<Object>} Sorted living mob entities parameters mapping structures.
     */
    getNearbyMobs(maxDistance = 16) {
        return this.getNearbyEntities(maxDistance, 'mob');
    },

    /**
     * Convenient query profile locating dropped world object entities or floating resource items.
     * @param {number} [maxDistance=16] - Radial inspection range.
     * @returns {Array<Object>} Sorted valid dropped items positions templates collections.
     */
    getNearbyDroppedItems(maxDistance = 16) {
        return this.getNearbyEntities(maxDistance, 'item');
    },

    /**
     * Searches structural block layouts systematically for specified material matches inside boundary caps.
     * Implements explicit time-safe searches using native algorithms to maintain single-thread event loop fluidity.
     * @param {Array<string>} blockNames - Array list array of textual block names to seek out.
     * @param {number} [maxDistance=8] - Maximum radial lookup boundary ceiling limit.
     * @returns {Object|null} Struct containing point coordinate location and structural object metadata, or null.
     */
    findClosestBlock(blockNames, maxDistance = 8) {
        try {
            if (!boundBotInstance || typeof boundBotInstance.findBlock !== 'function' || !boundBotInstance.entity) {
                return null;
            }

            if (!Array.isArray(blockNames) || blockNames.length === 0) {
                return null;
            }

            // Clamp search depth indices to eliminate thread lag potentials on resource-throttled instances
            const scanRadius = Math.max(1, Math.min(maxDistance, 16));

            // Map and parse localized string identifiers for matching criteria
            const matchingBlockIds = [];
            if (envRegistry.config.server && boundBotInstance.registry) {
                blockNames.forEach((name) => {
                    const blockMetadata = boundBotInstance.registry.blocksByName[name];
                    if (blockMetadata && typeof blockMetadata.id === 'number') {
                        matchingBlockIds.push(blockMetadata.id);
                    }
                });
            }

            // Fall back cleanly if standard schema block registrations are unresolvable
            if (matchingBlockIds.length === 0) return null;

            const targetBlock = boundBotInstance.findBlock({
                matching: matchingBlockIds,
                maxDistance: scanRadius,
                point: boundBotInstance.entity.position
            });

            if (!targetBlock || !targetBlock.position) {
                return null;
            }

            return {
                name: targetBlock.name,
                position: targetBlock.position.clone(),
                boundingBox: targetBlock.boundingBox
            };
        } catch (fault) {
            safeLog('error', 'Exception caught during findClosestBlock operation grid scanning:', fault);
            return null;
        }
    }
};

Object.freeze(PerceptionService);
module.exports = PerceptionService;
