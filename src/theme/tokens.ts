import { Platform } from 'react-native';

/** 웹은 배경 이미지 없는 모노(밝은) 스타일 — 일반 LLM 느낌. 네이티브는 하늘 배경 유지. */
export const IS_WEB = Platform.OS === 'web';

/**
 * 디자인 토큰 — "심플 & 럭셔리" 다크 테마.
 * 잉크 블랙 배경 + 아이보리 텍스트 + 샴페인 골드 포인트 + 헤어라인 보더.
 */
export const colors = {
  // 배경/표면
  bg: '#08080A',
  surface: '#0E0E12',
  surfaceAlt: 'rgba(255,255,255,0.05)',
  glass: 'rgba(255,255,255,0.035)',
  border: 'rgba(255,255,255,0.09)',

  // 텍스트
  text: '#F2EFE9', // 아이보리
  textMuted: '#8C8C95',
  faint: '#5A5A63',

  // 포인트 (샴페인 골드)
  accent: '#C9A96A',
  accentSoft: 'rgba(201,169,106,0.16)',
  accentMuted: '#26262D', // 비활성 버튼 배경

  // 상태
  danger: '#D98A8A',
  success: '#C9A96A',
  recording: '#C9A96A', // 럭셔리: 녹음 표시도 레드 대신 골드
} as const;

/** 타이포그래피 — 제목은 세리프, 본문은 시스템 산세리프. */
export const typography = {
  serif: 'serif', // iOS: Times, Android: serif (한글은 시스템 명조 폴백)
  // 본문은 RN 기본 시스템 폰트 사용(플랫폼별 San Francisco / Roboto)
  eyebrowSpacing: 4, // letterSpacing for uppercase eyebrow
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 26,
  pill: 999,
} as const;

/**
 * 스카이(라이트) 테마 — 날씨 히어로 인터페이스.
 * 맑은 하늘 그라데이션 + 흰색 헤드라인 + 부드러운 블루 포인트.
 */
export const sky = {
  // 하늘 그라데이션(위→아래)
  gradient: ['#2E86DE', '#4AA0E6', '#86C2EF', '#CFE7F7'] as const,
  gradientNight: ['#15223B', '#243B63', '#3C5A86', '#6E89AE'] as const,

  // 히어로 위 텍스트 (웹=모노 먹색 / 네이티브=흰색)
  heroText: IS_WEB ? '#1A1A1A' : '#FFFFFF',
  heroAccent: IS_WEB ? '#6B7280' : '#D7EBFB',
  heroDim: IS_WEB ? '#6B7280' : 'rgba(255,255,255,0.82)',

  // 칩/패널 (웹=연회색 / 네이티브=유리)
  chip: IS_WEB ? '#F2F2F2' : 'rgba(255,255,255,0.22)',
  chipBorder: IS_WEB ? '#E2E2E2' : 'rgba(255,255,255,0.35)',
  glass: IS_WEB ? '#F2F2F2' : 'rgba(255,255,255,0.16)',

  // 라이트 표면(대화/카드)
  surface: '#FFFFFF',
  surfaceSoft: '#F2F7FC',
  border: 'rgba(20,40,70,0.10)',
  ink: '#16243A', // 본문 텍스트
  inkMuted: '#5B6B82',
  inkFaint: '#94A2B5',

  // 히어로 위 패널/스트립(시간별·주간·30일) — 웹=연회색 카드+먹색 / 네이티브=다크 유리+흰색
  panelBg: IS_WEB ? '#F7F7F8' : 'rgba(20,40,70,0.28)',
  panelBgStrong: IS_WEB ? '#ECECEE' : 'rgba(20,40,70,0.5)',
  panelBorder: IS_WEB ? '#E5E5E7' : 'rgba(255,255,255,0.22)',
  panelText: IS_WEB ? '#1A1A1A' : '#FFFFFF',
  panelDim: IS_WEB ? '#6B7280' : 'rgba(255,255,255,0.72)',

  // 포인트 (웹은 모노 톤다운)
  brand: IS_WEB ? '#404040' : '#2E86DE',
  brandSoft: IS_WEB ? '#F0F0F0' : 'rgba(46,134,222,0.12)',
  warn: '#E8833A',
} as const;

/** 히어로 흰 글자용 그림자 — 웹(밝은 배경)에선 없음. */
export const HERO_TEXT_SHADOW = IS_WEB
  ? {}
  : ({ textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 } as const);
