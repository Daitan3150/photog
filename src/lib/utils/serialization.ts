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
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Handle primitive types
    if (typeof obj !== 'object') {
        return obj;
    }

    // Handle Date objects
    if (obj instanceof Date) {
        return obj.toISOString();
    }

    // Handle Firestore Timestamps (Server-Side)
    // Firestore Timestamps often come with _seconds and _nanoseconds properties
    // or a toDate() method.
    if (typeof obj.toDate === 'function') {
        return obj.toDate().toISOString();
    }
    
    if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
        return new Date(obj._seconds * 1000).toISOString();
    }

    // Handle Arrays
    if (Array.isArray(obj)) {
        return obj.map(item => serializeData(item));
    }

    // Handle Regular Objects
    const serialized: Record<string, any> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            serialized[key] = serializeData(obj[key]);
        }
    }

    return serialized;
}
