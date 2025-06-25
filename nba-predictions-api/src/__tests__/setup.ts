import { database } from '@/config/database';

// Global test setup
beforeAll(async () => {
  // Set development environment for local testing
  process.env.NODE_ENV = 'development';
  process.env.DB_PATH = ':memory:'; // Use in-memory database for tests
  process.env.LOG_LEVEL = 'error'; // Reduce logging noise in tests
});

afterAll(async () => {
  // Clean up database connection
  await database.close();
});

// Global test timeout
jest.setTimeout(10000);