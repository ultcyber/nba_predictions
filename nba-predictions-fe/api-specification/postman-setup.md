# Postman Setup for NBA Predictions API

## Import Instructions

### 1. Import Collection
1. Open Postman
2. Click **Import** button
3. Select **Upload Files**
4. Choose `postman-collection.json`
5. Click **Import**

### 2. Import Environments
Import all three environment files:
1. Click the **Environment** dropdown (top right)
2. Click **Import**
3. Select and import each environment file:
   - `postman-env-local.json` - Local development
   - `postman-env-test.json` - Test environment
   - `postman-env-production.json` - Production environment
4. Click **Import** for each file

### 3. Select Environment
Choose the appropriate environment from the dropdown:
- **NBA Predictions - Local** for local development
- **NBA Predictions - Test** for testing
- **NBA Predictions - Production** for production testing

## Environment Configuration

### Local Environment
- **Base URL**: `http://localhost:3001/api/v1`
- **Use Case**: Local development and testing
- **File**: `postman-env-local.json`

### Test Environment  
- **Base URL**: `https://api-test.nba-predictions.com/api/v1`
- **Use Case**: Integration testing and staging
- **File**: `postman-env-test.json`

### Production Environment
- **Base URL**: `https://api.nba-predictions.com/api/v1`
- **Use Case**: Production API testing (use with caution)
- **File**: `postman-env-production.json`

## Available Requests

### Health Check
- **Method**: GET
- **Endpoint**: `/health`
- **Purpose**: Verify API is running
- **Tests**: Validates response structure and status

### Get Game Predictions
- **Method**: GET  
- **Endpoint**: `/predictions`
- **Query Parameters**:
  - `limit` (optional): Number of results (default: 20, max: 100)
  - `offset` (optional): Pagination offset (default: 0)
  - `date` (optional): Filter by date (YYYY-MM-DD format)
  - `team` (optional): Filter by team abbreviation
- **Tests**: Validates pagination and game data structure

### Get Game Predictions - Filter by Date
- **Method**: GET
- **Endpoint**: `/predictions?date=2025-02-08`
- **Purpose**: Test date filtering functionality

### Get Game Predictions - Filter by Team
- **Method**: GET
- **Endpoint**: `/predictions?team=LAL`
- **Purpose**: Test team filtering functionality

### Get Single Game Prediction
- **Method**: GET
- **Endpoint**: `/predictions/{game_id}`
- **Purpose**: Get detailed prediction for specific game
- **Example**: `/predictions/0022400741`
- **Tests**: Validates single game response structure

## Environment Variables

| Variable | Local Value | Test Value | Production Value | Description |
|----------|-------------|------------|------------------|-------------|
| `baseUrl` | `http://localhost:3001/api/v1` | `https://api-test.nba-predictions.com/api/v1` | `https://api.nba-predictions.com/api/v1` | API base URL |
| `apiVersion` | `v1` | `v1` | `v1` | API version |
| `sampleGameId` | `0022400741` | `0022400741` | `0022400741` | Sample game ID for testing |
| `sampleTeam` | `DAL` | `DAL` | `DAL` | Sample team abbreviation |
| `sampleDate` | `2025-02-08` | `2025-02-08` | `2025-02-08` | Sample date for filtering |

## Automated Tests

Each request includes automated tests that verify:
- ✅ Status code is successful (200, 201, 202)
- ✅ Response is valid JSON
- ✅ Response contains required `success` field
- ✅ Successful responses contain `data` field
- ✅ Response structure matches API specification

## Usage Tips

1. **Start with Local**: Begin testing with the **Local** environment
2. **Environment Switching**: Use the environment dropdown to switch between local/test/production
3. **Health Check First**: Always test `/health` endpoint first to verify API connectivity
4. **Use Environment Variables**: Leverage `{{baseUrl}}` and other variables for consistency
5. **Check Test Results**: Review the **Test Results** tab after each request
6. **Monitor Console**: Use Postman Console for debugging request/response details

## Development Workflow

### Local Development
1. Set environment to **NBA Predictions - Local**
2. Ensure local API server is running on port 3001
3. Run **Health Check** to verify connectivity
4. Test all endpoints with various parameters

### Test Environment Testing
1. Switch to **NBA Predictions - Test** environment
2. Run full test suite against staging API
3. Validate all functionality before production deployment

### Production Verification
1. Switch to **NBA Predictions - Production** environment
2. Run limited, non-destructive tests
3. Verify critical endpoints are functioning

## Error Testing

The collection includes examples for:
- **404 Not Found**: Invalid game ID
- **400 Bad Request**: Invalid query parameters  
- **500 Internal Server Error**: Server-side issues

## Files Overview

- `postman-collection.json` - Main API collection
- `postman-env-local.json` - Local development environment
- `postman-env-test.json` - Test environment  
- `postman-env-production.json` - Production environment
- `postman-setup.md` - This documentation file

Ready for API testing across all environments!