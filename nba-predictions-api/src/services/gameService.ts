import { database } from '@/config/database';
import { Game, GameFilters, PaginationParams, PaginatedResponse } from '@/models/types';
import { ApiError } from '@/middleware/errorHandler';

export class GameService {
  
  async getGames(filters: GameFilters, pagination: PaginationParams): Promise<PaginatedResponse<Game>> {
    try {
      // Build WHERE clause
      const conditions: string[] = [];
      const params: unknown[] = [];
      
      if (filters.date) {
        conditions.push('g.date = ?');
        params.push(filters.date);
      }
      
      if (filters.team) {
        conditions.push('(ht.abbreviation = ? OR at.abbreviation = ?)');
        params.push(filters.team, filters.team);
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Get total count
      const countSql = `
        SELECT COUNT(*) as total
        FROM games g
        LEFT JOIN teams ht ON g.home_team_id = ht.id
        LEFT JOIN teams at ON g.away_team_id = at.id
        ${whereClause}
      `;
      
      const countResult = await database.get<{ total: number }>(countSql, params);
      const total = countResult?.total || 0;
      
      // Get games with pagination
      const gamesSql = `
        SELECT 
          g.id,
          g.date,
          g.prediction_rating,
          g.prediction_classification,
          g.probability_good,
          g.probability_bad,
          g.confidence,
          ht.id as home_team_id,
          ht.abbreviation as home_team_abbreviation,
          ht.name as home_team_name,
          ht.city as home_team_city,
          ht.conference as home_team_conference,
          at.id as away_team_id,
          at.abbreviation as away_team_abbreviation,
          at.name as away_team_name,
          at.city as away_team_city,
          at.conference as away_team_conference
        FROM games g
        LEFT JOIN teams ht ON g.home_team_id = ht.id
        LEFT JOIN teams at ON g.away_team_id = at.id
        ${whereClause}
        ORDER BY g.date DESC, g.id
        LIMIT ? OFFSET ?
      `;
      
      const gamesParams = [...params, pagination.limit, pagination.offset];
      const rows = await database.all<unknown>(gamesSql, gamesParams);
      
      const games = this.mapRowsToGames(rows);
      
      const totalPages = Math.ceil(total / pagination.limit);
      const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
      
      return {
        data: games,
        pagination: {
          total,
          page: currentPage,
          per_page: pagination.limit,
          total_pages: totalPages
        }
      };
      
    } catch (error) {
      const serviceError: ApiError = new Error('Failed to retrieve games');
      serviceError.statusCode = 500;
      serviceError.code = 'DATABASE_ERROR';
      serviceError.details = { originalError: (error as Error).message };
      throw serviceError;
    }
  }
  
  async getGameById(gameId: string): Promise<Game | null> {
    try {
      const sql = `
        SELECT 
          g.id,
          g.date,
          g.prediction_rating,
          g.prediction_classification,
          g.probability_good,
          g.probability_bad,
          g.confidence,
          ht.id as home_team_id,
          ht.abbreviation as home_team_abbreviation,
          ht.name as home_team_name,
          ht.city as home_team_city,
          ht.conference as home_team_conference,
          at.id as away_team_id,
          at.abbreviation as away_team_abbreviation,
          at.name as away_team_name,
          at.city as away_team_city,
          at.conference as away_team_conference
        FROM games g
        LEFT JOIN teams ht ON g.home_team_id = ht.id
        LEFT JOIN teams at ON g.away_team_id = at.id
        WHERE g.id = ?
      `;
      
      const row = await database.get<unknown>(sql, [gameId]);
      
      if (!row) {
        return null;
      }
      
      const games = this.mapRowsToGames([row]);
      return games[0] || null;
      
    } catch (error) {
      const serviceError: ApiError = new Error('Failed to retrieve game');
      serviceError.statusCode = 500;
      serviceError.code = 'DATABASE_ERROR';
      serviceError.details = { originalError: (error as Error).message };
      throw serviceError;
    }
  }
  
  private mapRowsToGames(rows: unknown[]): Game[] {
    return rows.map(row => this.mapRowToGame(row));
  }
  
  private mapRowToGame(row: unknown): Game {
    const r = row as Record<string, unknown>;
    
    return {
      id: r.id as string,
      date: r.date as string,
      home_team: {
        id: r.home_team_id as string,
        abbreviation: r.home_team_abbreviation as string,
        name: r.home_team_name as string,
        city: r.home_team_city as string,
        conference: r.home_team_conference as 'East' | 'West'
      },
      away_team: {
        id: r.away_team_id as string,
        abbreviation: r.away_team_abbreviation as string,
        name: r.away_team_name as string,
        city: r.away_team_city as string,
        conference: r.away_team_conference as 'East' | 'West'
      },
      prediction: {
        rating: r.prediction_rating as number,
        classification: r.prediction_classification as 'good' | 'bad',
        probability: {
          good: r.probability_good as number,
          bad: r.probability_bad as number
        },
        confidence: r.confidence as 'high' | 'medium' | 'low'
      }
    };
  }
}