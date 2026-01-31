import React, { useState } from 'react';
import { usePredictions } from '../hooks/useApi';
import DatePicker from '../components/ui/DatePicker';
import GameList from '../components/game/GameList';
import { getDefaultDate, formatDateForAPI, addDays } from '../utils/dateUtils';

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

  const handlePreviousDay = () => {
    setSelectedDate(prevDate => addDays(prevDate, -1));
  };

  const handleNextDay = () => {
    setSelectedDate(prevDate => addDays(prevDate, 1));
  };

  return (
    <div>
      <div className="text-center mb-8">
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
          AI-powered predictions for NBA games. Know which games are worth watching without seeing the scores.
        </p>
        
        {/* Date Picker */}
        <div className="max-w-md mx-auto mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date
          </label>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handlePreviousDay}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Previous day"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 text-gray-700"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="flex-1">
              <DatePicker
                selectedDate={selectedDate}
                onChange={handleDateChange}
              />
            </div>
            <button
              onClick={handleNextDay}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Next day"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 text-gray-700"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
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