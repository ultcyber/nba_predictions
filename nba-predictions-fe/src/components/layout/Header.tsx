import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <header className="bg-nba-blue text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-nba-red rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">NBA</span>
            </div>
            <h1 className="text-xl font-bold">Game Predictions</h1>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;