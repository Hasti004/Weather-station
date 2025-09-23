import React from 'react';

export const SunIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="5" fill="currentColor"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const CloudIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="currentColor"/>
  </svg>
);

export const RainIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zM8 4c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zM4 8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z" fill="currentColor"/>
    <path d="M12 2C8.7 2 6 4.7 6 8c0 1.5.5 2.9 1.4 4h9.2c.9-1.1 1.4-2.5 1.4-4 0-3.3-2.7-6-6-6z" fill="currentColor"/>
    <path d="M8 14l2 4 2-4M12 16l2 4 2-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const getWeatherIcon = (condition) => {
  const conditionLower = condition?.toLowerCase() || '';

  if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
    return SunIcon;
  } else if (conditionLower.includes('rain') || conditionLower.includes('storm')) {
    return RainIcon;
  } else {
    return CloudIcon;
  }
};

