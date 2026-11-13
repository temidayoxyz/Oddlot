import React from 'react';
import { PowerUpId } from '../types';

export const PowerUpSvgIcon: React.FC<{ id: PowerUpId; className?: string }> = ({
  id,
  className = 'h-5 w-5',
}) => {
  switch (id) {
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 2.5L4.5 5.8V11.6C4.5 16.5 7.7 20.6 12 22C16.3 20.6 19.5 16.5 19.5 11.6V5.8L12 2.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="currentColor"
            fillOpacity="0.18"
          />
          <path d="M12 6.2V17.5M7.5 11.2H16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'laser':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M4 20L15.5 8.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="17.5" cy="6.5" r="3" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M17.5 2V3.5M22 6.5H20.5M14.5 3.5L15.5 4.5M20.5 9.5L19.5 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'time_dilation':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.9" fill="currentColor" fillOpacity="0.14" />
          <path d="M12 7.2V12L15.2 14.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'cosmic_blast':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 2.5L14.3 8.4L20.5 7.2L16.3 12L20.5 16.8L14.3 15.6L12 21.5L9.7 15.6L3.5 16.8L7.7 12L3.5 7.2L9.7 8.4L12 2.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            fill="currentColor"
            fillOpacity="0.22"
          />
        </svg>
      );
    case 'gravity_field':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="2.6" fill="currentColor" />
          <ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(-24 12 12)" stroke="currentColor" strokeWidth="1.7" />
          <ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(34 12 12)" stroke="currentColor" strokeWidth="1.7" strokeOpacity="0.7" />
        </svg>
      );
    case 'meteor_magnet':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M7 5V12C7 14.8 9.2 17 12 17C14.8 17 17 14.8 17 12V5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path d="M5.5 5H8.5M15.5 5H18.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 20V22M8 19.5L7 21M16 19.5L17 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'repair_pulse':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.16" />
          <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'solar_flare':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2.5V5.2M12 18.8V21.5M2.5 12H5.2M18.8 12H21.5M5.3 5.3L7.2 7.2M16.8 16.8L18.7 18.7M18.7 5.3L16.8 7.2M7.2 16.8L5.3 18.7"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};
