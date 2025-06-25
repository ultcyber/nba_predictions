import React, { useState } from 'react';
import { usePredictions } from '../hooks/useApi';
import DatePicker from '../components/ui/DatePicker';

const Home: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const formatDateForAPI = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const { data: predictionsData, isLoading, error } = usePredictions({
    date: formatDateForAPI(selectedDate)
  });

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          NBA Game Predictions
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
          AI-powered predictions for NBA games with detailed probability analysis
          and confidence ratings.
        </p>
        
        {/* Date Picker */}
        <div className="max-w-xs mx-auto mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date
          </label>
          <DatePicker
            selectedDate={selectedDate}
            onChange={handleDateChange}
          />
        </div>
      </div>

      {/* Game Predictions */}
      <div>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading predictions...</div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600">Failed to load predictions</div>
          </div>
        ) : predictionsData?.success ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {predictionsData.data.data.map((game) => (
              <div key={game.id} className="bg-white rounded-lg shadow p-6">
                <div className="text-center mb-4">
                  <div className="text-sm text-gray-500 mb-2">{game.date}</div>
                  <div className="flex justify-between items-center">
                    <div className="text-right">
                      <div className="font-semibold">{game.away_team.name}</div>
                      <div className="text-sm text-gray-600">{game.away_team.abbreviation}</div>
                    </div>
                    <div className="mx-4 text-gray-400">@</div>
                    <div className="text-left">
                      <div className="font-semibold">{game.home_team.name}</div>
                      <div className="text-sm text-gray-600">{game.home_team.abbreviation}</div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="text-center mb-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      game.prediction.classification === 'good' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {game.prediction.classification.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-center text-2xl font-bold mb-2">
                    {game.prediction.rating}/100
                  </div>
                  <div className="text-sm text-gray-600 text-center">
                    {Math.round(game.prediction.probability.good * 100)}% confidence
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500">No predictions available</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;