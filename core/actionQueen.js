/**
 * @file core/actionQueue.js
 * @description Provides a production-ready, non-blocking sequential FIFO async action queue.
 * Capped memory capacity guards against out-of-memory errors on Render Free Tier.
 */

// Module-private state tracking boundaries
let envRegistry = null;
const queue = [];
let processing = false;
let maxQueueLength = 100; // Default fallback capacity constraint
let queueGeneration = 0;

/**
 * Safely dispatches logs to the central LoggerService instance if fully bound.
 * @param {string} level - Lowercase logging severity type ('info', 'warn', 'error').
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
 * Sequentially extracts and executes the next pending asynchronous task.
 * Operates completely privately to maintain strict interface encapsulation.
 */
function executeNext() {
    if (processing || queue.length === 0) {
        return;
    }
    processing = true;
    const currentGen = queueGeneration;

    const task = queue.shift();
    
    if (!task) {
        processing = false;
        process.nextTick(() => {
            executeNext();
        });
        return;
    }

    safeLog('info', `Starting execution of task "${task.taskName}". Remaining tasks in queue: ${queue.length}`);

    let timeoutId = null;
    let completed = false;

    // Unified teardown coordinator ensuring event loop unblocking and continuation
    const cleanUpAndNext = () => {
        processing = false;
        process.nextTick(() => {
            executeNext();
        });
    };

    // Initialize safe timeout mechanism if configuration specifies thresholds
    if (task.timeoutMs && task.timeoutMs > 0) {
        timeoutId = setTimeout(() => {
            if (currentGen !== queueGeneration) {
                cleanUpAndNext();
                return;
            }
            if (completed) return;
            completed = true;

            safeLog('error', `Task "${task.taskName}" timed out after exceeding threshold of ${task.timeoutMs}ms.`);
            task.reject(new Error(`ActionQueue Timeout: Task "${task.taskName}" exceeded time limit execution ceiling of ${task.timeoutMs}ms.`));
            cleanUpAndNext();
        }, task.timeoutMs);
    }

    // Defensive try/catch encapsulation guarding against sync and async execution breaks
    try {
        Promise.resolve(task.asyncFunction())
            .then((result) => {
                if (currentGen !== queueGeneration) {
                    cleanUpAndNext();
                    return;
                }
                if (completed) return;
                completed = true;

                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                safeLog('info', `Task "${task.taskName}" completed execution successfully.`);
                task.resolve(result);
                cleanUpAndNext();
            })
            .catch((asyncError) => {
                if (currentGen !== queueGeneration) {
                    cleanUpAndNext();
                    return;
                }
                if (completed) return;
                completed = true;

                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                safeLog('error', `Task "${task.taskName}" failed during async execution pathway:`, asyncError);
                task.reject(asyncError);
                cleanUpAndNext();
            });
    } catch (syncError) {
        if (currentGen !== queueGeneration) {
            cleanUpAndNext();
            return;
        }
        if (!completed) {
            completed = true;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            safeLog('error', `Task "${task.taskName}" threw an unhandled synchronous error during activation:`, syncError);
            task.reject(syncError);
            cleanUpAndNext();
        }
    }
}

/**
 * ActionQueue Interface Layer.
 * Encapsulates FIFO single-threaded execution control flows under a frozen singleton surface layer.
 */
const ActionQueue = {
    /**
     * Mounts the global dependency injection container onto the module private context memory.
     * @param {Object} registry - Top-level central application mapping matrix reference.
     */
    initialize(registry) {
        if (!registry || !registry.services) {
            throw new Error('ActionQueue Initialization Failure: Malformed dependency injection registry contract mapping.');
        }
        envRegistry = registry;

        // Extract dynamic queue capacity boundaries from user configurations if available
        if (registry.config && 
            registry.config.runtime && 
            typeof registry.config.runtime.maxQueueLength === 'number' &&
            registry.config.runtime.maxQueueLength > 0) {
            // Clamp maximum queue size: Ensure maxQueueLength never exceeds 1000 configurations threshold ceiling
            maxQueueLength = Math.min(registry.config.runtime.maxQueueLength, 1000);
        }
    },

    /**
     * Pushes a new task payload into the sequential processing matrix framework.
     * Automatically triggers task sequence activation dynamically.
     * @param {string} taskName - Unique human-readable text identifier for tracking logs.
     * @param {Function} asyncFunction - Explicit asynchronous action function promise logic execution block.
     * @param {number} [timeoutMs] - Maximum allowed processing time limit before cancellation.
     * @returns {Promise<*>} Resolves with the task's computed value, or rejects on failures/timeouts/overflows.
     */
    enqueue(taskName, asyncFunction, timeoutMs = 0) {
        return new Promise((resolve, reject) => {
            if (!envRegistry) {
                return reject(new Error('ActionQueue Integration Violation: enqueue called prior to module initialization.'));
            }
            if (typeof asyncFunction !== 'function') {
                return reject(new Error('ActionQueue Integration Violation: Task execution payload must be an executable function structure.'));
            }
            
            // Validate taskName: Force safe string coercion across inputs parameters mapping
            const safeTaskName = String(taskName);

            // Enforce memory protection boundaries early to intercept buffer overflows
            if (queue.length >= maxQueueLength) {
                safeLog('warn', `ActionQueue rejected new allocation request for task "${safeTaskName}". Capacity cap of ${maxQueueLength} exceeded.`);
                return reject(new Error(`ActionQueue Overflow: Queue capacity boundary cap limit of ${maxQueueLength} entries fully exhausted.`));
            }

            safeLog('info', `Enqueuing task "${safeTaskName}". Current queue layout size: ${queue.length + 1}`);
            
            // Validate timeout: Enforce finite integer boundary check logic rules parameters
            let safeTimeoutMs = 0;
            if (typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && Number.isInteger(timeoutMs) && timeoutMs >= 0) {
                safeTimeoutMs = timeoutMs;
            }

            queue.push({
                taskName: safeTaskName,
                asyncFunction,
                timeoutMs: safeTimeoutMs,
                resolve,
                reject
            });

            // Auto-trigger processing safely on next clean tick of the environment engine
            process.nextTick(() => {
                executeNext();
            });
        });
    },

    /**
     * Purges all pending tasks from the internal memory cache arrays cleanly.
     * Gracefully cancels outstanding promises to isolate hanging listeners leaks.
     */
    clear() {
        safeLog('info', `Executing manual purge cleanup across active pipeline. Clearing ${queue.length} pending items.`);
        queueGeneration++;
        while (queue.length > 0) {
            const task = queue.shift();
            if (task) {
                if (typeof task.reject === 'function') {
                    task.reject(new Error('ActionQueue Cancellation: Task explicitly aborted due to global queue purge activation event.'));
                }
            }
        }
    },

    /**
     * Interrogates if the processing loop grid is actively processing an item.
     * @returns {boolean} True if a task is actively occupying the primary operational pipeline slot.
     */
    isBusy() {
        return processing;
    },

    /**
     * Evaluates total pending tasks backlog counts matching the active buffer index boundaries.
     * @returns {number} Count of total queued tasks waiting inside the internal arrays.
     */
    getQueueLength() {
        return queue.length;
    }
};

Object.freeze(ActionQueue);
module.exports = ActionQueue;
                  
