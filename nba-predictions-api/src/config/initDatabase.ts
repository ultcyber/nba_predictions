import fs from 'fs';
import path from 'path';
import { database } from './database';
import { logger } from '@/utils/logger';

export async function initializeDatabase(): Promise<void> {
  try {
    // Read schema SQL file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await new Promise<void>((resolve, reject) => {
      database.getDb().exec(schemaSql, (err) => {
        if (err) {
          logger.error('Database schema initialization failed', { error: err.message });
          reject(err);
        } else {
          logger.info('Database schema initialized successfully');
          resolve();
        }
      });
    });
    
  } catch (error) {
    logger.error('Database initialization error', { error: (error as Error).message });
    throw error;
  }
}