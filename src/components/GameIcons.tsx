import React from 'react';
import { PowerUpId, WeatherId } from '../game/types';

export const TitleEmblemSvg: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="skyPopRim" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#67e8f9" />
        <stop offset="48%" stopColor="#e879f9" />
        <stop offset="100%" stopColor="#fde047" />
      </linearGradient>
      <radialGradient id="skyPopCore" cx="35%" cy="32%" r="65%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
        <stop offset="65%" stopColor="#38bdf8" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#e879f9" stopOpacity="0.32" />
      </radialGradient>
    </defs>
    <circle cx="29" cy="33" r="22" fill="url(#skyPopCore)" stroke="url(#skyPopRim)" strokeWidth="2.5" />
    <path
      d="M17 24C19.5 18.5 24.5 15.5 30 15"
      stroke="#ffffff"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <circle cx="21" cy="20" r="1.8" fill="#ffffff" />
    <circle cx="49" cy="18" r="8.5" fill="url(#skyPopCore)" stroke="url(#skyPopRim)" strokeWidth="1.8" />
    <path d="M45 15C46 13.4 47.8 12.6 49.5 12.6" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="52" cy="44" r="5" fill="url(#skyPopCore)" stroke="url(#skyPopRim)" strokeWidth="1.5" />
  </svg>
);

export const StabilityHeartIcon: React.FC<{ filled: boolean; shielded?: boolean }> = ({
  filled,
  shielded = false,
}) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
    <path
      d="M12 20.6C12 20.6 3.5 15.1 3.5 9.1C3.5 6.2 5.8 4 8.5 4C10.2 4 11.4 4.9 12 6C12.6 4.9 13.8 4 15.5 4C18.2 4 20.5 6.2 20.5 9.1C20.5 15.1 12 20.6 12 20.6Z"
      fill={filled ? (shielded ? '#60a5fa' : '#fb7185') : 'rgba(15, 23, 42, 0.55)'}
      stroke={filled ? (shielded ? '#bfdbfe' : '#ffe4e6') : 'rgba(255, 255, 255, 0.28)'}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    {filled && (
      <path
        d="M7 7.8C7.4 7.1 8.1 6.7 8.9 6.7"
        stroke="#ffffff"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.85"
      />
    )}
  </svg>
);

export const PowerUpIcon: React.FC<{ id: PowerUpId; className?: string }> = ({
  id,
  className = 'w-5 h-5',
}) => {
  switch (id) {
    case 'burst':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2V5M12 19V22M2 12H5M19 12H22M4.9 4.9L7.2 7.2M16.8 16.8L19.1 19.1M19.1 4.9L16.8 7.2M7.2 16.8L4.9 19.1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'freeze':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 2V22M4 7L20 17M20 7L4 17M9 4L12 6.5L15 4M9 20L12 17.5L15 20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'magnet':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M6 4V12C6 15.3 8.7 18 12 18C15.3 18 18 15.3 18 12V4"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path d="M4.5 7H7.5M16.5 7H19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'score_boost':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 3L14.6 8.5L20.5 9.3L16.2 13.5L17.3 19.4L12 16.5L6.7 19.4L7.8 13.5L3.5 9.3L9.4 8.5L12 3Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'slow_mo':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="2" />
          <path d="M12 9V13L15 15M9 3H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'lightning':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M13 2L4.5 13H11.5L10.5 22L19.5 10.5H12.5L13 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 3L4.5 6.5V12C4.5 16.8 7.7 20.4 12 21.5C16.3 20.4 19.5 16.8 19.5 12V6.5L12 3Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'xp_boost':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 19V5M6 11L12 5L18 11"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M7 19H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
};

export const WeatherBadgeIcon: React.FC<{ weather: WeatherId; className?: string }> = ({
  weather,
  className = 'w-4 h-4',
}) => {
  switch (weather) {
    case 'clear':
    case 'golden_hour':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2.5V5M12 19V21.5M2.5 12H5M19 12H21.5M5.3 5.3L7 7M17 17L18.7 18.7M18.7 5.3L17 7M7 17L5.3 18.7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'overcast':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M6.5 18H17.5C19.7 18 21.5 16.2 21.5 14C21.5 12 20 10.3 18 10C17.4 6.9 14.7 4.5 11.5 4.5C7.9 4.5 5 7.4 5 11C3.3 11.6 2 13.1 2 15C2 16.7 3.8 18 6.5 18Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'rain':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M6.5 15H17.5C19.4 15 21 13.4 21 11.5C21 9.7 19.6 8.2 17.8 8C17.1 5.4 14.8 3.5 12 3.5C8.7 3.5 6 6.2 6 9.5C4.3 9.9 3 11.3 3 13C3 14.1 4.4 15 6.5 15Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M8 18.5L7 21M12.5 18.5L11.5 21M17 18.5L16 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'storm':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M6.5 14.5H17.5C19.4 14.5 21 12.9 21 11C21 9.2 19.6 7.7 17.8 7.5C17.1 4.9 14.8 3 12 3C8.7 3 6 5.7 6 9C4.3 9.4 3 10.8 3 12.5C3 13.6 4.4 14.5 6.5 14.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M13 14.5L10.5 18.5H13.5L11.5 22" stroke="#fde047" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'night':
    case 'aurora':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M19.5 14.5C18.2 15.1 16.7 15.4 15.2 15.2C11.1 14.7 8.1 11 8.6 6.9C8.8 5.4 9.4 4.1 10.3 3C6.5 3.6 3.5 6.9 3.5 11C3.5 15.4 7.1 19 11.5 19C15.1 19 18.2 16.8 19.5 14.5Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};
