// In-memory storage for the Visual Learning Assistant
// Since this is a prototype, we use MemStorage instead of a database

export interface IStorage {
  // Future: Could add storage for lesson history if needed
}

export class MemStorage implements IStorage {
  constructor() {
    // No persistent storage needed for this prototype
    // All lesson generation happens in real-time via WebSocket
  }
}

export const storage = new MemStorage();
