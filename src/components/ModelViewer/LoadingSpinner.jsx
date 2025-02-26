import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
      <div className="relative w-16 h-16">
        <div className="absolute w-16 h-16 border-4 border-red-700 rounded-full animate-spin border-t-transparent"></div>
        <div className="absolute w-16 h-16 border-4 border-red-300 rounded-full opacity-20"></div>
      </div>
      <p className="absolute mt-24 text-white font-semibold">Загрузка модели...</p>
    </div>
  );
}