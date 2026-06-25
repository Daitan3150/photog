// @ts-nocheck
import { getAdminFirestore } from "../firebaseAdmin";
import { tool } from 'ai';
import { z } from 'zod';

// Helper: Get Firestore DB
const db = getAdminFirestore();

export const aiTools = {
  // Memory & Self-Learning Tools
  saveMemory: tool({
    description: 'Save a user preference, rule, or memory so the AI can remember it for future interactions.',
    parameters: z.object({
      key: z.string().describe('A unique, descriptive key for this memory (e.g., "preferred_tone", "auto_tags")'),
      value: z.string().describe('The rule or memory content to save'),
    }),
    execute: async ({ key, value }: { key: string, value: string }) => {
      try {
        await db.collection('ai_memory').doc(key).set({
          value,
          updatedAt: new Date().toISOString(),
        });
        return { success: true, message: `Memory saved successfully for key: ${key}` };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  getMemories: tool({
    description: 'Retrieve all saved user preferences, rules, and memories.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const snapshot = await db.collection('ai_memory').get();
        const memories: Record<string, any> = {};
        snapshot.forEach(doc => {
          memories[doc.id] = doc.data().value;
        });
        return { success: true, memories };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  // Content Management Tools
  getSettings: tool({
    description: 'Get site settings, such as the user profile (bio, name, role, location).',
    parameters: z.object({
      docId: z.string().default('profile').describe('The document ID to fetch (usually "profile")'),
    }),
    execute: async ({ docId }: { docId: string }) => {
      try {
        const doc = await db.collection('settings').doc(docId).get();
        if (!doc.exists) {
          return { success: false, error: 'Settings document not found' };
        }
        return { success: true, data: doc.data() };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  updateSettings: tool({
    description: 'Update site settings, such as the user profile. Do not modify the imageUrl unless explicitly requested.',
    parameters: z.object({
      docId: z.string().default('profile').describe('The document ID to update (usually "profile")'),
      name: z.string().optional().describe('User name'),
      role: z.string().optional().describe('User role or job title'),
      bio: z.string().optional().describe('Biography text (Markdown or plain text)'),
      location: z.string().optional().describe('User location'),
    }),
    execute: async ({ docId, ...data }: { docId: string, [key: string]: any }) => {
      try {
        // Remove undefined fields
        const updateData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
        
        await db.collection('settings').doc(docId).set(updateData, { merge: true });
        return { success: true, message: `Settings updated successfully for document: ${docId}` };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  getRecentPhotos: tool({
    description: 'Get metadata of recently uploaded photos (limit 10). Useful for answering questions about the gallery.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const snapshot = await db.collection('photos').orderBy('createdAt', 'desc').limit(10).get();
        const photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { success: true, photos };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),
};
