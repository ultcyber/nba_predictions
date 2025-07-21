import fs from 'fs';
import path from 'path';
import { database } from './database';
import { logger } from '@/utils/logger';

export async function initializeSchema(): Promise<void> {
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
    logger.error('Database schema initialization error', { error: (error as Error).message });
    throw error;
  }
}

export async function initializeDatabase(): Promise<void> {
  try {
    // Initialize schema
    await initializeSchema();

    // Add sample data if tables are empty
    await addSampleData();
    
  } catch (error) {
    logger.error('Database initialization error', { error: (error as Error).message });
    throw error;
  }
}

async function addSampleData(): Promise<void> {
  try {
    // Skip sample data in test environment
    if (process.env.NODE_ENV === 'test' || process.env.DB_PATH === ':memory:') {
      logger.info('Test environment detected, skipping sample data initialization');
      return;
    }

    // Check if data already exists
    const existingGamesCount = await database.get<{count: number}>('SELECT COUNT(*) as count FROM games');
    if (existingGamesCount && existingGamesCount.count > 0 ) {
      logger.info('Sample data already exists, skipping initialization');
      return;
    }

    logger.info('Adding sample data to database');

    // Insert teams
    const teams = [
      { id: '1610612747', abbreviation: 'LAL', name: 'Los Angeles Lakers', conference: 'West' },
      { id: '1610612738', abbreviation: 'BOS', name: 'Boston Celtics', conference: 'East' },
      { id: '1610612744', abbreviation: 'GSW', name: 'Golden State Warriors', conference: 'West' },
      { id: '1610612748', abbreviation: 'MIA', name: 'Miami Heat', conference: 'East' },
      { id: '1610612751', abbreviation: 'BRK', name: 'Brooklyn Nets', conference: 'East' },
      { id: '1610612749', abbreviation: 'MIL', name: 'Milwaukee Bucks', conference: 'East' },
      { id: '1610612756', abbreviation: 'PHX', name: 'Phoenix Suns', conference: 'West' },
      { id: '1610612759', abbreviation: 'SAS', name: 'San Antonio Spurs', conference: 'West' },
    ];

    for (const team of teams) {
      await database.run(
        'INSERT OR IGNORE INTO teams (id, abbreviation, name, conference) VALUES (?, ?, ?, ?)',
        [team.id, team.abbreviation, team.name, team.conference]
      );
    }

    // Get today's date and future dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Insert sample games
    const games = [
      {
        id: '0022400741',
        date: formatDate(today),
        home_team_id: '1610612747', // LAL
        away_team_id: '1610612738', // BOS
        prediction_rating: 78.5
      },
      {
        id: '0022400742',
        date: formatDate(today),
        home_team_id: '1610612744', // GSW
        away_team_id: '1610612748', // MIA
        prediction_rating: 65.2
      },
      {
        id: '0022400743',
        date: formatDate(tomorrow),
        home_team_id: '1610612751', // BRK
        away_team_id: '1610612749', // MIL
        prediction_rating: 42.8
      },
      {
        id: '0022400744',
        date: formatDate(tomorrow),
        home_team_id: '1610612756', // PHX
        away_team_id: '1610612759', // SAS
        prediction_rating: 89.1
      },
      {
        id: '0022400745',
        date: formatDate(dayAfter),
        home_team_id: '1610612747', // LAL
        away_team_id: '1610612744', // GSW
        prediction_rating: 72.3
      },
      {
        id: '0022400746',
        date: formatDate(dayAfter),
        home_team_id: '1610612738', // BOS
        away_team_id: '1610612748', // MIA
        prediction_rating: 58.7
      }
    ];

    for (const game of games) {
      await database.run(
        `INSERT OR IGNORE INTO games 
         (id, date, home_team_id, away_team_id, prediction_rating) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          game.id, game.date, game.home_team_id, game.away_team_id, game.prediction_rating
        ]
      );
    }

    logger.info('Sample data added successfully');
    
  } catch (error) {
    logger.error('Failed to add sample data', { error: (error as Error).message });
    throw error;
  }
}