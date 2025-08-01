import React, { useState } from 'react';
import { usePredictions } from '../hooks/useApi';
import DatePicker from '../components/ui/DatePicker';
import GameList from '../components/game/GameList';
import { getDefaultDate, formatDateForAPI } from '../utils/dateUtils';

const Home: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(getDefaultDate());

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
        selectedDate={formatDateForAPI(selectedDate)}
      />
    </div>
  );
};

export default Home;