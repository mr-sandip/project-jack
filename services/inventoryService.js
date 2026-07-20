/**
 * @file services/inventoryService.js
 * @description Provides structural abstractions and execution wrappers for managing the agent's inventory windows.
 * Exposes lightweight lookup, count, and equipment utilities designed to interact cleanly with
 * Prismarine-Item objects without inducing memory leakages or bloat on Render Free Tier instances.
 */

// Module-private state variables
let envRegistry = null;
let boundBotInstance = null;

// Verified list of legitimate equipment slot destination mappings in Mineflayer 4.x
const VALID_DESTINATIONS = new Set(['hand', 'off-hand', 'head', 'torso', 'legs', 'feet']);

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
 * Inventory Interface Service Layer.
 * Operates as a frozen state singleton providing safe item manipulation routines.
 */
const InventoryService = {
    /**
     * Mounts the global dependency injection container onto the module private context memory.
     * @param {Object} registry - Top-level central application mapping matrix reference.
     */
    initialize(registry) {
        if (!registry || !registry.services || !registry.config) {
            throw new Error('InventoryService Initialization Failure: Malformed dependency injection registry contract mapping.');
        }
        envRegistry = registry;
        safeLog('info', 'Inventory infrastructure service layer successfully initialized.');
    },

    /**
     * Binds the inventory service methods to the active live network socket wrapper instance.
     * @param {Object} bot - Concrete instantiated Mineflayer bot object instance.
     */
    bindBot(bot) {
        if (!envRegistry) {
            throw new Error('InventoryService Integration Violation: bindBot called prior to module initialization.');
        }
        if (!bot) {
            throw new Error('InventoryService Integration Violation: Cannot bind an empty or non-existent bot reference allocation.');
        }
        boundBotInstance = bot;
        safeLog('info', 'Inventory service successfully attached to live bot network context.');
    },

    /**
     * Gathers a lightweight translated array representation of current inventory contents.
     * Filters out complex nested data frames to retain memory efficiency on constrained platforms.
     * @returns {Array<Object>} Lightweight item descriptors list array.
     */
    getInventoryItems() {
        try {
            if (!boundBotInstance || !boundBotInstance.inventory || typeof boundBotInstance.inventory.items !== 'function') {
                return [];
            }

            const nativeItems = boundBotInstance.inventory.items();
            if (!Array.isArray(nativeItems)) return [];

            // Fix 2 — Memory Optimization: Removed the nested metadata object graph to maximize Render Free Tier heap safety
            return nativeItems.map(item => ({
                name: item.name,
                count: item.count,
                slot: item.slot
            }));
        } catch (fault) {
            safeLog('error', 'Exception caught during getInventoryItems execution trace:', fault);
            return [];
        }
    },

    /**
     * Calculates the aggregate sum of a specified item type inside the player container.
     * @param {string} itemName - Lowercase standard item string identifier (e.g., 'cobblestone').
     * @returns {number} Total count accumulation integer.
     */
    countItem(itemName) {
        try {
            if (!itemName || typeof itemName !== 'string') return 0;
            if (!boundBotInstance || !boundBotInstance.inventory || typeof boundBotInstance.inventory.items !== 'function') {
                return 0;
            }

            const targetName = itemName.toLowerCase().trim();
            const nativeItems = boundBotInstance.inventory.items();
            if (!Array.isArray(nativeItems)) return 0;

            return nativeItems.reduce((acc, item) => {
                if (item && item.name === targetName && typeof item.count === 'number') {
                    return acc + item.count;
                }
                return acc;
            }, 0);
        } catch (fault) {
            safeLog('error', 'Exception caught inside countItem utility execution path:', fault);
            return 0;
        }
    },

    /**
     * Asynchronously attempts to equip a specified item into a target designated slot frame.
     * Leverages the centralized ActionQueue logic structurally if wrapped by subsystems, 
     * but executes direct promise resolutions defensively at this interface hub layer.
     * @param {string} itemName - Lowercase standard item string identifier to equip.
     * @param {string} destination - Intended body target profile ('hand', 'off-hand', 'head', 'torso', 'legs', 'feet').
     * @returns {Promise<boolean>} Resolves to true if the item was successfully equipped.
     */
    equipItem(itemName, destination) {
        return new Promise((resolve) => {
            try {
                if (!boundBotInstance || !boundBotInstance.inventory || typeof boundBotInstance.equip !== 'function') {
                    safeLog('error', 'Inventory equipment requested without an operational bound bot context.');
                    return resolve(false);
                }

                if (!itemName || typeof itemName !== 'string' || !destination || typeof destination !== 'string') {
                    safeLog('warn', 'Inventory equipment rejected: Invalid item name or destination string input.');
                    return resolve(false);
                }

                const targetName = itemName.toLowerCase().trim();
                const targetDest = destination.toLowerCase().trim();

                if (!VALID_DESTINATIONS.has(targetDest)) {
                    safeLog('warn', `Inventory equipment rejected: Destination slot "${targetDest}" is unknown.`);
                    return resolve(false);
                }

                const nativeItems = boundBotInstance.inventory.items();
                if (!Array.isArray(nativeItems)) return resolve(false);

                // Find the first matching item block structural reference inside inventory list
                const matchingItem = nativeItems.find(item => item && item.name === targetName);

                // Fix 1 — Empty/Invalid Count Check: Explicitly verify existence and item stock count boundaries before handling the window event
                if (!matchingItem || typeof matchingItem.count !== 'number' || matchingItem.count <= 0) {
                    safeLog('warn', `Inventory equipment failed: Item "${targetName}" not present, invalid, or has an empty count.`);
                    return resolve(false);
                }

                safeLog('info', `Attempting to equip item "${targetName}" into slot allocation "${targetDest}".`);

                // Fire native promise wrapper execution path while trapping rejection timelines securely
                Promise.resolve(boundBotInstance.equip(matchingItem, targetDest))
                    .then(() => {
                        safeLog('info', `Item "${targetName}" successfully equipped to target destination "${targetDest}".`);
                        resolve(true);
                    })
                    .catch((equipError) => {
                        safeLog('error', `Mineflayer internal inventory routine failed to equip item "${targetName}":`, equipError);
                        resolve(false);
                    });
            } catch (fault) {
                safeLog('error', 'Critical operational exception intercepted inside equipItem execution wall:', fault);
                resolve(false);
            }
        });
    }
};

Object.freeze(InventoryService);
module.exports = InventoryService;
