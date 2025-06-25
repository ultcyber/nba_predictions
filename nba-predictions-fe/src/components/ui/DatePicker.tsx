import React from 'react';
import DatePickerComponent from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DatePickerProps {
  selectedDate: Date;
  onChange: (date: Date | null) => void;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ selectedDate, onChange, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <DatePickerComponent
        selected={selectedDate}
        onChange={onChange}
        dateFormat="MMMM d, yyyy"
        className="w-full px-4 py-3 text-lg font-medium text-gray-800 bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:border-nba-blue focus:border-nba-blue focus:ring-2 focus:ring-nba-blue focus:ring-opacity-20 outline-none transition-all duration-200 text-center cursor-pointer"
        calendarClassName="shadow-lg border-0 rounded-lg"
        dayClassName={(date) => 
          "hover:bg-nba-blue hover:text-white rounded-md transition-colors duration-150 cursor-pointer"
        }
        showPopperArrow={false}
      />
    </div>
  );
};

export default DatePicker;