import React from 'react';
import { useHealth } from '../../hooks/useApi';
import GitHubIcon from '../../assets/github-mark.svg';

const Footer: React.FC = () => {
  const { data: healthData, isLoading, error } = useHealth();

  return (
    <footer className="bg-gray-800 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-center space-y-3">
          <p className="text-gray-400 text-xs leading-relaxed max-w-4xl mx-auto font-light">
            The National Basketball Association ("NBA") and the names of the NBA teams are trademarks that are property of NBA Properties, Inc. and the member teams of the NBA. These trademark holders are not affiliated with, nor do they sponsor or endorse this site.
          </p>
          <div className="text-sm flex items-center justify-center gap-4">
            <a 
              href="https://github.com/ultcyber/nba_predictions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              title="View on GitHub"
            >
              <img src={GitHubIcon} alt="GitHub" className="w-8 h-8 filter invert opacity-60 hover:opacity-100 transition-opacity" />
            </a>
            <div>
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
      </div>
    </footer>
  );
};

export default Footer;