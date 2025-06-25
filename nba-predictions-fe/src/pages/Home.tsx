import React, { useState } from 'react';
import { usePredictions } from '../hooks/useApi';
import DatePicker from '../components/ui/DatePicker';
import GameList from '../components/game/GameList';

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
      <GameList 
        games={predictionsData?.success ? predictionsData.data.data : []}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
};

export default Home;