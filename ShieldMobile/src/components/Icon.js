// src/components/Icon.js
import React from 'react';
import Svg, { Path, Circle, Rect, Polyline, Line, Polygon, G, Defs, LinearGradient, Stop } from 'react-native-svg';

export function IconShield({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill={color} opacity={0.2} />
      <Path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconShieldCheck({ size = 24, color = '#22C55E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill={color} opacity={0.15} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconShieldX({ size = 24, color = '#EF4444' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill={color} opacity={0.15} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14.5 9.5l-5 5M9.5 9.5l5 5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function IconShieldAlert({ size = 24, color = '#F59E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill={color} opacity={0.15} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 9v3.5M12 16.5h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function IconHome({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 22V12h6v10" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconSearch({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7.5" stroke={color} strokeWidth="1.8" />
      <Path d="M21 21l-4.5-4.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function IconCamera({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="13" r="3.5" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

export function IconSettings({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
      <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconFile({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function IconDownload({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="7,10 12,15 17,10" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="15" x2="12" y2="3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function IconZap({ size = 24, color = '#FBB040' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill={color} fillOpacity={0.2} />
    </Svg>
  );
}

export function IconZapOff({ size = 24, color = '#5A597A' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2L3 14h9l-1 8 8-12h-7L13 2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="2" y1="2" x2="22" y2="22" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function IconImage({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth="1.8" />
      <Circle cx="8.5" cy="8.5" r="1.5" stroke={color} strokeWidth="1.8" />
      <Path d="M21 15l-5-5L5 21" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconFolderOpen({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCheckCircle({ size = 24, color = '#22C55E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M22 4L12 14.01l-3-3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconXCircle({ size = 24, color = '#EF4444' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
      <Path d="M15 9l-6 6M9 9l6 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function IconArrowLeft({ size = 24, color = '#9B80FF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconRefresh({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 4v6h-6M1 20v-6h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCalendar({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth="1.8" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

export function IconUser({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

export function IconWifi({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.55a11 11 0 0114.08 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M1.42 9a16 16 0 0121.16 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M8.53 16.11a6 6 0 016.95 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="12" cy="20" r="1" fill={color} />
    </Svg>
  );
}

export function IconShare({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="18" cy="5" r="2.5" stroke={color} strokeWidth="1.8" />
      <Circle cx="6" cy="12" r="2.5" stroke={color} strokeWidth="1.8" />
      <Circle cx="18" cy="19" r="2.5" stroke={color} strokeWidth="1.8" />
      <Line x1="8.4" y1="13.4" x2="15.6" y2="17.6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="15.6" y1="6.4" x2="8.4" y2="10.6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function IconChevronRight({ size = 24, color = '#5A597A' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconChevronDown({ size = 24, color = '#5A597A' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconQrCode({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" />
      <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" />
      <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" />
      <Rect x="5" y="5" width="3" height="3" rx="0.5" fill={color} />
      <Rect x="16" y="5" width="3" height="3" rx="0.5" fill={color} />
      <Rect x="5" y="16" width="3" height="3" rx="0.5" fill={color} />
      <Path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconGrid({ size = 24, color = '#7C5CFC' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="2" stroke={color} strokeWidth="1.8" />
      <Rect x="14" y="3" width="7" height="7" rx="2" stroke={color} strokeWidth="1.8" />
      <Rect x="3" y="14" width="7" height="7" rx="2" stroke={color} strokeWidth="1.8" />
      <Rect x="14" y="14" width="7" height="7" rx="2" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

export function IconLightning({ size = 24, color = '#00D4FF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2L4.09 12.96A1 1 0 005 14.5h6.5L11 22l8.91-10.96A1 1 0 0019 9.5H12.5L13 2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill={color} fillOpacity={0.15} />
    </Svg>
  );
}

export function IconScan({ size = 24, color = '#00D4FF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function IconCheckCircleFill({ size = 24, color = '#22C55E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={color} />
      <Path d="M8 12l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconXCircleFill({ size = 24, color = '#EF4444' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={color} />
      <Path d="M15 9l-6 6M9 9l6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}