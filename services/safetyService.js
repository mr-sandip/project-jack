/**
 * @file services/safetyService.js
 * @description Provides environmental analysis, block hazard detection, and spatial safety mapping.
 * Offers look-ahead safety verification tools for navigation and positioning systems
 * while operating efficiently within Render Free Tier resource limitations.
 */

// Module-private state variables
let envRegistry = null;
let boundBotInstance = null;

// Production-verified list of hazardous block identifiers in Minecraft 1.20.1
const HAZARDOUS_BLOCKS = new Set([
    'lava',
    'fire',
    'soul_fire',
    'cactus',
    'magma_block',
    'campfire',
    'soul_campfire',
    'sweet_berry_bush',
    'wither_rose'
]);

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
 * Safety Interface Service Layer.
 * Operates as a frozen state singleton providing geographic risk heuristics.
 */
const SafetyService = {
    /**
     * Mounts the global dependency injection container onto the module private context memory.
     * @param {Object} registry - Top-level central application mapping matrix reference.
     */
    initialize(registry) {
        if (!registry || !registry.services || !registry.config) {
            throw new Error('SafetyService Initialization Failure: Malformed dependency injection registry contract mapping.');
        }
        envRegistry = registry;
        safeLog('info', 'Safety structural service layer successfully initialized.');
    },

    /**
     * Binds the service methods to the active live network socket wrapper instance.
     * @param {Object} bot - Concrete instantiated Mineflayer bot object instance.
     */
    bindBot(bot) {
        if (!envRegistry) {
            throw new Error('SafetyService Integration Violation: bindBot called prior to module initialization.');
        }
        if (!bot) {
            throw new Error('SafetyService Integration Violation: Cannot bind an empty or non-existent bot reference allocation.');
        }
        boundBotInstance = bot;
        safeLog('info', 'Safety service successfully attached to live bot network context.');
    },

    /**
     * Checks if a specific block instance possesses hazardous traits.
     * @param {Object} block - Prismarine-block structure instance retrieved from the world layer.
     * @returns {boolean} True if the block matches known environmental dangers.
     */
    isBlockHazardous(block) {
        if (!block || typeof block !== 'object' || typeof block.name !== 'string') {
            return false;
        }
        return HAZARDOUS_BLOCKS.has(block.name);
    },

    /**
     * Evaluates whether a designated spatial coordinate is safe for the agent to stand on.
     * Verifies solid footing underneath and clear physical clearance space for the bot body structure.
     * @param {Object} position - Vec3 instance containing target geographic world coordinates.
     * @returns {boolean} True if the location complies with structural safety parameters.
     */
    isPositionSafe(position) {
        try {
            if (!boundBotInstance || typeof boundBotInstance.blockAt !== 'function') {
                return false;
            }

            if (!position || typeof position.offset !== 'function') {
                return false;
            }

            // Retrieve structural components across vertical layer slices safely
            const floorBlock = boundBotInstance.blockAt(position.offset(0, -1, 0));
            const bodyBlock = boundBotInstance.blockAt(position);
            const headBlock = boundBotInstance.blockAt(position.offset(0, 1, 0));

            // Validate that floor block exists and is not a destructive environmental hazard
            if (!floorBlock || typeof floorBlock.name !== 'string' || this.isBlockHazardous(floorBlock)) {
                return false;
            }

            // Ensure the floor block has physical collision or solid footing properties (not air, water, lava)
            if (floorBlock.name === 'air' || floorBlock.name === 'water' || floorBlock.name === 'lava') {
                return false;
            }

            // Verify body and head positions are clear of structural blockages or dangerous materials
            if (bodyBlock && typeof bodyBlock.name !== 'string') return false;
            if (headBlock && typeof headBlock.name !== 'string') return false;

            if (bodyBlock && (bodyBlock.boundingBox !== 'empty' && bodyBlock.name !== 'air' && bodyBlock.name !== 'water')) {
                return false;
            }
            if (headBlock && (headBlock.boundingBox !== 'empty' && headBlock.name !== 'air' && headBlock.name !== 'water')) {
                return false;
            }

            if (this.isBlockHazardous(bodyBlock) || this.isBlockHazardous(headBlock)) {
                return false;
            }

            return true;
        } catch (fault) {
            safeLog('error', 'Exception caught during isPositionSafe validation trace:', fault);
            return false;
        }
    },

    /**
     * Scans surrounding adjacent blocks to find the closest certified safe coordinate.
     * Restricts execution search limits to avoid inducing thread blocking on Render tier instances.
     * @param {Object} startPosition - Centered reference coordinate location to begin search sequence.
     * @param {number} [radius=2] - Maximum block check distance constraint parameter.
     * @returns {Object|null} Safe Vec3 instance position if discovered, otherwise null.
     */
    findSafeAdjacentPosition(startPosition, radius = 2) {
        try {
            if (!boundBotInstance || !startPosition || typeof startPosition.offset !== 'function') {
                return null;
            }

            const searchRadius = Math.max(1, Math.min(radius, 4)); // Strict performance boundary clamp
            
            // Search radial matrices sequentially while ensuring event loop compliance
            for (let x = -searchRadius; x <= searchRadius; x++) {
                for (let y = -searchRadius; y <= searchRadius; y++) {
                    for (let z = -searchRadius; z <= searchRadius; z++) {
                        const evaluationTarget = startPosition.offset(x, y, z);
                        if (this.isPositionSafe(evaluationTarget)) {
                            return evaluationTarget;
                        }
                    }
                }
            }

            return null;
        } catch (fault) {
            safeLog('error', 'Exception caught during findSafeAdjacentPosition scanning matrix:', fault);
            return null;
        }
    }
};

Object.freeze(SafetyService);
module.exports = SafetyService;
