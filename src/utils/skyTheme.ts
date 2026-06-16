/**
 * 현재 시각 + 날씨로 "하늘 장면"을 계산한다(순수 함수, RN 비의존).
 * SkyBackground 가 이 값으로 그라데이션·해/달·구름을 그린다.
 */

export type SkyPhase = 'dawn' | 'day' | 'golden' | 'dusk' | 'night';

export interface SkyScene {
  phase: SkyPhase;
  /** 위→아래 하늘 그라데이션. */
  colors: readonly [string, string, ...string[]];
  /** 해/달. */
  orb: {
    kind: 'sun' | 'moon' | 'none';
    color: string;
    glow: string;
    /** 화면 비율 위치(0=좌/상, 1=우/하). */
    xPct: number;
    yPct: number;
    size: number;
  };
  cloudCount: number;
  cloudColor: string;
  cloudOpacity: number;
  /** 상단 텍스트 대비용 스크림 강도(0~0.35). */
  scrim: number;
}

interface WeatherBits {
  code: number;
  isDay: boolean;
  rainy: boolean;
  cloudy: boolean;
}

const CLEAR: Record<SkyPhase, readonly [string, string, ...string[]]> = {
  dawn: ['#1E4488', '#5E83C0', '#C39ABF', '#F8D4AE'],
  // 맑은 낮: 위는 선명한 하늘색, 아래로 갈수록 밝게(수평선 근처 흰빛) — 레퍼런스 느낌.
  day: ['#1E84E0', '#3E9BE8', '#74BBF1', '#BFE0F8', '#E8F4FC'],
  golden: ['#214083', '#6E6BB0', '#E0905E', '#FBD08A'],
  dusk: ['#142049', '#3A4078', '#86598C', '#D08471'],
  night: ['#070E26', '#111B38', '#1E2C4C', '#324463'],
};

const CLOUDY: Partial<Record<SkyPhase, readonly [string, string, ...string[]]>> = {
  day: ['#5E7E9E', '#7C97B0', '#A3BACD', '#CFDDE8'],
  golden: ['#3A4566', '#74708F', '#B98770', '#E0B080'],
  night: ['#10182C', '#1C2740', '#2E3A52', '#48566F'],
};

const RAIN: readonly [string, string, ...string[]] = ['#3C4654', '#525E6C', '#6E7B86', '#9AA7AE'];
const RAIN_NIGHT: readonly [string, string, ...string[]] = ['#161C26', '#272F3A', '#3A4350', '#535D69'];

function phaseFor(hour: number, isDay: boolean): SkyPhase {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 16) return isDay ? 'day' : 'night';
  if (hour >= 16 && hour < 18) return 'golden';
  if (hour >= 18 && hour < 20) return 'dusk';
  return 'night';
}

const ORB_POS: Record<SkyPhase, { xPct: number; yPct: number; size: number }> = {
  dawn: { xPct: 0.22, yPct: 0.2, size: 80 },
  day: { xPct: 0.83, yPct: 0.12, size: 92 },
  golden: { xPct: 0.74, yPct: 0.3, size: 116 },
  dusk: { xPct: 0.26, yPct: 0.3, size: 96 },
  night: { xPct: 0.8, yPct: 0.14, size: 64 },
};

const ORB_COLOR: Record<SkyPhase, { color: string; glow: string }> = {
  dawn: { color: '#FFE3C4', glow: 'rgba(255,200,150,0.45)' },
  day: { color: '#FFFFFF', glow: 'rgba(255,255,255,0.5)' },
  golden: { color: '#FFE0A0', glow: 'rgba(255,180,90,0.5)' },
  dusk: { color: '#FFCBA0', glow: 'rgba(255,150,110,0.4)' },
  night: { color: '#EAF0FF', glow: 'rgba(220,230,255,0.35)' },
};

export function getSkyScene(hour: number, w?: WeatherBits): SkyScene {
  const isDay = w ? w.isDay : hour >= 6 && hour < 19;
  const phase = phaseFor(hour, isDay);
  const rainy = w?.rainy ?? false;
  const cloudy = w?.cloudy ?? false;
  const isNight = phase === 'night';

  let colors: readonly [string, string, ...string[]];
  if (rainy) colors = isNight ? RAIN_NIGHT : RAIN;
  else if (cloudy) colors = CLOUDY[phase] ?? CLEAR[phase];
  else colors = CLEAR[phase];

  const pos = ORB_POS[phase];
  const oc = ORB_COLOR[phase];
  const orbKind: 'sun' | 'moon' | 'none' = rainy ? 'none' : isNight ? 'moon' : 'sun';

  const cloudCount = rainy ? 6 : cloudy ? 5 : phase === 'day' || phase === 'golden' ? 4 : phase === 'night' ? 2 : 3;
  const cloudColor = rainy
    ? '#C9D2DA'
    : isNight
      ? '#5A6B86'
      : phase === 'golden' || phase === 'dusk'
        ? '#FBE6D2'
        : '#FFFFFF';
  const cloudOpacity = rainy ? 0.95 : isNight ? 0.5 : 0.9;

  // 밝은 낮엔 흰 텍스트 대비를 위해 약한 상단 스크림.
  const scrim = isNight ? 0 : rainy ? 0.05 : phase === 'day' ? 0.16 : 0.1;

  return {
    phase,
    colors,
    orb: { kind: orbKind, color: oc.color, glow: oc.glow, xPct: pos.xPct, yPct: pos.yPct, size: pos.size },
    cloudCount,
    cloudColor,
    cloudOpacity,
    scrim,
  };
}
