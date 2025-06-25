import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-nba-blue to-blue-700 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-16 sm:h-20">
          <Link to="/" className="flex items-center space-x-2 sm:space-x-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-nba-red to-red-700 rounded-full flex items-center justify-center shadow-lg ring-2 sm:ring-4 ring-white ring-opacity-20">
              <span className="text-white font-extrabold text-sm sm:text-lg tracking-tight">NBA</span>
            </div>
            <div className="text-center">
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Game Predictions</h1>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;