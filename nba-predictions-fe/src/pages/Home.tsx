import React, { useState } from 'react';
import { usePredictions } from '../hooks/useApi';
import DatePicker from '../components/ui/DatePicker';
import GameList from '../components/game/GameList';
import { getDefaultDate, formatDateForAPI, addDays, isPlayoffDate } from '../utils/dateUtils';

const Home: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(getDefaultDate());

  const isPlayoff = isPlayoffDate(selectedDate);

  const { data: predictionsData, isLoading, error } = usePredictions(
    { date: formatDateForAPI(selectedDate) },
    !isPlayoff
  );

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

        <div className="flex justify-center mb-6 sm:hidden">
          <a href="https://www.buymeacoffee.com/ultcyber" target="_blank" rel="noopener noreferrer">
            <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style={{ height: '40px', width: 'auto' }} />
          </a>
        </div>

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

      {/* Playoff Mode Banner */}
      {isPlayoff && (
        <div className="max-w-2xl mx-auto mb-6 px-5 py-4 rounded-xl border border-yellow-300 bg-yellow-50 text-center">
          <p className="text-lg font-semibold text-yellow-800 mb-1">🏆 NBA Playoffs in Progress</p>
          <p className="text-sm text-yellow-700">
            Our model is trained exclusively on regular season data and is not suited for playoff predictions.
            Predictions are unavailable during the playoff period.
          </p>
        </div>
      )}

      {/* Game Predictions */}
      {!isPlayoff && (
        <GameList
          games={predictionsData?.success ? predictionsData.data.data : []}
          isLoading={isLoading}
          error={error}
          selectedDate={formatDateForAPI(selectedDate)}
        />
      )}
    </div>
  );
};

export default Home;