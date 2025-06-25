import React from 'react';
import { useHealth } from '../../hooks/useApi';

const Footer: React.FC = () => {
  const { data: healthData, isLoading, error } = useHealth();

  return (
    <footer className="bg-gray-800 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-end items-center">
          <div className="text-sm">
            API Status: {' '}
            {isLoading ? (
              <span className="text-yellow-400">Checking...</span>
            ) : error ? (
              <span className="text-red-400">● Offline</span>
            ) : healthData?.success ? (
              <span className="text-green-400">● Online</span>
            ) : (
              <span className="text-red-400">● Offline</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;