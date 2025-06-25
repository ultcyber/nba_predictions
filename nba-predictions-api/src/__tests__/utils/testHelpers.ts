import { database } from '@/config/database';
import { initializeDatabase } from '@/config/initDatabase';
import { Game, Team } from '@/models/types';

// Test data fixtures
export const mockTeams: Team[] = [
  {
    id: '1610612747',
    abbreviation: 'LAL',
    name: 'Los Angeles Lakers',
    conference: 'West'
  },
  {
    id: '1610612738',
    abbreviation: 'BOS',
    name: 'Boston Celtics',
    conference: 'East'
  },
  {
    id: '1610612744',
    abbreviation: 'GSW',
    name: 'Golden State Warriors',
    conference: 'West'
  }
];

export const mockGames: Omit<Game, 'home_team' | 'away_team'>[] = [
  {
    id: '0022400741',
    date: '2025-02-08',
    prediction: {
      rating: 65.5,
      classification: 'good',
      probability: { good: 0.73, bad: 0.27 },
      confidence: 'high'
    }
  },
  {
    id: '0022400742',
    date: '2025-02-07',
    prediction: {
      rating: 45.2,
      classification: 'bad',
      probability: { good: 0.35, bad: 0.65 },
      confidence: 'medium'
    }
  }
];

// Database test utilities
export async function setupTestDatabase(): Promise<void> {
  await database.connect();
  await initializeDatabase();
}

export async function seedTestData(): Promise<void> {
  // Insert test teams
  for (const team of mockTeams) {
    await database.run(
      'INSERT INTO teams (id, abbreviation, name, conference) VALUES (?, ?, ?, ?)',
      [team.id, team.abbreviation, team.name, team.conference]
    );
  }

  // Insert test games
  await database.run(
    `INSERT INTO games (
      id, date, home_team_id, away_team_id, 
      prediction_rating, prediction_classification, 
      probability_good, probability_bad, confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      mockGames[0].id,
      mockGames[0].date,
      mockTeams[0].id, // LAL home
      mockTeams[1].id, // BOS away
      mockGames[0].prediction.rating,
      mockGames[0].prediction.classification,
      mockGames[0].prediction.probability.good,
      mockGames[0].prediction.probability.bad,
      mockGames[0].prediction.confidence
    ]
  );

  await database.run(
    `INSERT INTO games (
      id, date, home_team_id, away_team_id, 
      prediction_rating, prediction_classification, 
      probability_good, probability_bad, confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      mockGames[1].id,
      mockGames[1].date,
      mockTeams[2].id, // GSW home
      mockTeams[1].id, // BOS away
      mockGames[1].prediction.rating,
      mockGames[1].prediction.classification,
      mockGames[1].prediction.probability.good,
      mockGames[1].prediction.probability.bad,
      mockGames[1].prediction.confidence
    ]
  );
}

export async function clearTestData(): Promise<void> {
  await database.run('DELETE FROM games');
  await database.run('DELETE FROM teams');
}

// Response assertion helpers
export function expectSuccessResponse(response: Record<string, unknown>): void {
  expect(response).toHaveProperty('success', true);
  expect(response).toHaveProperty('data');
}

export function expectErrorResponse(response: Record<string, unknown>, code?: string): void {
  expect(response).toHaveProperty('success', false);
  expect(response).toHaveProperty('error');
  expect(response.error).toHaveProperty('code');
  expect(response.error).toHaveProperty('message');
  
  if (code) {
    expect((response.error as Record<string, unknown>).code).toBe(code);
  }
}

export function expectGameStructure(game: Record<string, unknown>): void {
  expect(game).toHaveProperty('id');
  expect(game).toHaveProperty('date');
  expect(game).toHaveProperty('home_team');
  expect(game).toHaveProperty('away_team');
  expect(game).toHaveProperty('prediction');

  // Team structure
  const homeTeam = game.home_team as Record<string, unknown>;
  expect(homeTeam).toHaveProperty('id');
  expect(homeTeam).toHaveProperty('abbreviation');
  expect(homeTeam).toHaveProperty('name');
  expect(homeTeam).toHaveProperty('conference');

  // Prediction structure
  const prediction = game.prediction as Record<string, unknown>;
  expect(prediction).toHaveProperty('rating');
  expect(prediction).toHaveProperty('classification');
  expect(prediction).toHaveProperty('probability');
  expect(prediction).toHaveProperty('confidence');

  const probability = prediction.probability as Record<string, unknown>;
  expect(probability).toHaveProperty('good');
  expect(probability).toHaveProperty('bad');
}