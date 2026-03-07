/**
 * 🛠️ Data Serialization Utilities for Server Actions
 * 
 * Cloudflare Workers (and Next.js Server Actions) require that all data passed
 * between Server and Client are strictly serializable (JSON-compatible).
 * This utility ensures Firestore Timestamps and Date objects are converted to ISO strings.
 */

/**
 * Recursively serializes an object, converting Dates and Firestore Timestamps to ISO strings.
 * Safely handles arrays and nested objects.
 * 
 * @param obj The object or array to serialize
 * @returns A strictly serializable version of the input
 */
export function serializeData(obj: any): any {
    if (obj === undefined) {
        return null;
    }
    if (obj === null) {
        return null;
    }

    // Handle primitive types
    if (typeof obj !== 'object') {
        return obj;
    }

    // Handle Date objects
    if (obj instanceof Date) {
        return obj.toISOString();
    }

    // Handle Firestore Timestamps
    if (obj && typeof obj === 'object') {
        // Method 1: has toDate function
        if (typeof obj.toDate === 'function') {
            try {
                return obj.toDate().toISOString();
            } catch (e) {
                return new Date().toISOString();
            }
        }

        // Method 2: has seconds/nanoseconds (common for firestore-admin)
        if (typeof obj.seconds === 'number') {
            return new Date(obj.seconds * 1000).toISOString();
        }
        if (typeof obj._seconds === 'number') {
            return new Date(obj._seconds * 1000).toISOString();
        }
    }

    // Handle Arrays
    if (Array.isArray(obj)) {
        return obj.map(item => serializeData(item));
    }

    // Handle Regular Objects
    // Caution: Simple deep copy - doesn't handle circular refs
    const serialized: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        // Skip functions and complicated instances
        if (typeof val === 'function') continue;
        serialized[key] = serializeData(val);
    }

    return serialized;
}
