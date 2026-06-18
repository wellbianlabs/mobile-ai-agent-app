/**
 * 현재 시각 + 날씨로 "하늘 장면"을 계산한다(순수 함수, RN 비의존).
 * SkyBackground 가 이 값으로 배경 이미지 + 대비 스크림을 그린다.
 */

export type SkyPhase = 'dawn' | 'day' | 'golden' | 'dusk' | 'night';

export type SkyBgKey =
  | 'day-clear'
  | 'day-cloudy'
  | 'night-clear'
  | 'night-cloudy'
  | 'rain'
  | 'rain-night'
  | 'dawn'
  | 'sunset';

export interface SkyScene {
  phase: SkyPhase;
  /** 배경 이미지 키(assets/sky). */
  bg: SkyBgKey;
  /** 상단 텍스트(시계·헤드라인) 대비용 스크림 강도(0~0.4). */
  scrimTop: number;
  /** 하단(시간별 스트립) 대비용 스크림 강도(0~0.4). */
  scrimBottom: number;
}

interface WeatherBits {
  code: number;
  isDay: boolean;
  rainy: boolean;
  cloudy: boolean;
}

function phaseFor(hour: number, isDay: boolean): SkyPhase {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 16) return isDay ? 'day' : 'night';
  if (hour >= 16 && hour < 18) return 'golden';
  if (hour >= 18 && hour < 20) return 'dusk';
  return 'night';
}

function bgFor(phase: SkyPhase, rainy: boolean, cloudy: boolean, isNight: boolean): SkyBgKey {
  if (rainy) return isNight ? 'rain-night' : 'rain';
  if (phase === 'night') return cloudy ? 'night-cloudy' : 'night-clear';
  if (phase === 'dawn') return 'dawn';
  if (phase === 'golden' || phase === 'dusk') return 'sunset';
  return cloudy ? 'day-cloudy' : 'day-clear';
}

export function getSkyScene(hour: number, w?: WeatherBits): SkyScene {
  const isDay = w ? w.isDay : hour >= 6 && hour < 19;
  const phase = phaseFor(hour, isDay);
  const rainy = w?.rainy ?? false;
  const cloudy = w?.cloudy ?? false;
  const isNight = phase === 'night';

  const bg = bgFor(phase, rainy, cloudy, isNight);

  // 밝은 배경일수록 흰 글자 대비를 위해 스크림을 키운다.
  const bright = bg === 'day-clear' || bg === 'day-cloudy';
  const scrimTop = isNight ? 0.06 : bright ? 0.24 : rainy ? 0.14 : 0.18;
  const scrimBottom = isNight ? 0.1 : bright ? 0.26 : 0.16;

  return { phase, bg, scrimTop, scrimBottom };
}
