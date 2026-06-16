/**
 * Open-Meteo(무료, 키 불필요) 응답을 받아 한국어 날씨 요약을 만든다.
 * 히어로 화면의 큰 헤드라인 + 조언 라인 + 아이콘에 사용.
 */

export interface OpenMeteoResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    is_day?: number;
    precipitation?: number;
  };
  hourly?: {
    time?: string[];
    precipitation_probability?: number[];
    precipitation?: number[];
    weather_code?: number[];
    temperature_2m?: number[];
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
}

export interface WeatherSummary {
  /** 큰 헤드라인(예: "오후 3시에 강한 비가 예상돼요"). */
  headline: string;
  /** 강조 조언 라인(예: "우산을 챙기세요"). */
  advice: string;
  /** 현재 상태 한국어(맑음/흐림 등). */
  condition: string;
  /** 현재 기온(반올림). */
  tempC: number | null;
  /** 이모지(상단 칩/배경 보조). */
  emoji: string;
  /** 낮/밤. */
  isDay: boolean;
  /** 현재 WMO 날씨 코드(배경 연출용). */
  code: number;
  /** 비/눈 등 강수 중. */
  rainy: boolean;
  /** 구름 많음(부분~흐림). */
  cloudy: boolean;
}

const WMO: Record<number, { ko: string; emoji: string }> = {
  0: { ko: '맑음', emoji: '☀️' },
  1: { ko: '대체로 맑음', emoji: '🌤️' },
  2: { ko: '부분적으로 흐림', emoji: '⛅' },
  3: { ko: '흐림', emoji: '☁️' },
  45: { ko: '안개', emoji: '🌫️' },
  48: { ko: '서리 안개', emoji: '🌫️' },
  51: { ko: '약한 이슬비', emoji: '🌦️' },
  53: { ko: '이슬비', emoji: '🌦️' },
  55: { ko: '강한 이슬비', emoji: '🌧️' },
  61: { ko: '약한 비', emoji: '🌦️' },
  63: { ko: '비', emoji: '🌧️' },
  65: { ko: '강한 비', emoji: '🌧️' },
  66: { ko: '어는 비', emoji: '🌧️' },
  67: { ko: '강한 어는 비', emoji: '🌧️' },
  71: { ko: '약한 눈', emoji: '🌨️' },
  73: { ko: '눈', emoji: '❄️' },
  75: { ko: '강한 눈', emoji: '❄️' },
  77: { ko: '싸락눈', emoji: '🌨️' },
  80: { ko: '소나기', emoji: '🌦️' },
  81: { ko: '강한 소나기', emoji: '🌧️' },
  82: { ko: '매우 강한 소나기', emoji: '⛈️' },
  85: { ko: '약한 눈소나기', emoji: '🌨️' },
  86: { ko: '강한 눈소나기', emoji: '❄️' },
  95: { ko: '뇌우', emoji: '⛈️' },
  96: { ko: '우박 동반 뇌우', emoji: '⛈️' },
  99: { ko: '강한 우박 뇌우', emoji: '⛈️' },
};

function describe(code: number | undefined): { ko: string; emoji: string } {
  return WMO[code ?? 0] ?? { ko: '흐림', emoji: '☁️' };
}

function isRainCode(code: number | undefined): boolean {
  if (code == null) return false;
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
}

/** "HH시" 형태의 한국어 시간 문구(오전/오후 포함). */
function timePhrase(iso: string): string {
  const hour = Number(iso.slice(11, 13));
  if (Number.isNaN(hour)) return '곧';
  if (hour === 0) return '자정';
  if (hour === 12) return '정오';
  if (hour < 12) return `오전 ${hour}시`;
  return `오후 ${hour - 12}시`;
}

export function summarizeWeather(data: OpenMeteoResponse): WeatherSummary {
  const cur = data.current ?? {};
  const isDay = cur.is_day !== 0;
  const tempC = cur.temperature_2m != null ? Math.round(cur.temperature_2m) : null;
  const here = describe(cur.weather_code);
  const rainingNow = (cur.precipitation ?? 0) > 0 || isRainCode(cur.weather_code);

  // 오늘 남은 시간 중 비 시작 시점 탐색.
  const times = data.hourly?.time ?? [];
  const probs = data.hourly?.precipitation_probability ?? [];
  const precs = data.hourly?.precipitation ?? [];
  const codes = data.hourly?.weather_code ?? [];
  const nowIso = cur.time ?? times[0] ?? '';
  const today = nowIso.slice(0, 10);

  let rainOnset: { iso: string; strong: boolean } | null = null;
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (!t || t.slice(0, 10) !== today) continue;
    if (t < nowIso) continue;
    const prob = probs[i] ?? 0;
    const prec = precs[i] ?? 0;
    const rainy = isRainCode(codes[i]) || prec >= 0.5 || prob >= 60;
    if (rainy) {
      rainOnset = { iso: t, strong: prec >= 4 || (codes[i] != null && [65, 82, 95, 96, 99].includes(codes[i]!)) };
      break;
    }
  }

  let headline: string;
  let advice: string;

  if (rainingNow) {
    headline = `지금 ${here.ko}이 내리고 있어요.`;
    advice = '우산을 챙기세요.';
  } else if (rainOnset) {
    const when = timePhrase(rainOnset.iso);
    const strength = rainOnset.strong ? '강한 비' : '비';
    headline = `${when}에 ${strength}가 예상돼요.`;
    advice = '우산을 챙기세요.';
  } else {
    const tempPart = tempC != null ? `, ${tempC}°C` : '';
    headline = `지금은 ${here.ko}${tempPart}.`;
    if (tempC != null && tempC >= 30) advice = '한낮 더위, 수분 보충 잊지 마세요.';
    else if (tempC != null && tempC <= 2) advice = '쌀쌀해요, 따뜻하게 입으세요.';
    else if (here.ko.includes('맑')) advice = '나들이 좋은 날이에요.';
    else advice = '좋은 하루 보내세요.';
  }

  // 비가 오지만 헤드라인이 비 관련이면 강조 이모지를 비로.
  const emoji = rainingNow ? describe(cur.weather_code).emoji : rainOnset ? '🌧️' : here.emoji;

  const code = cur.weather_code ?? 0;
  const cloudy = code === 2 || code === 3 || code === 45 || code === 48;

  return { headline, advice, condition: here.ko, tempC, emoji, isDay, code, rainy: rainingNow, cloudy };
}
