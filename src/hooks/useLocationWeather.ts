import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { AGENT_ACCESS_TOKEN, WEATHER_ENDPOINT } from '@/api/agentClient';
import { useMultimodalStore } from '@/store/multimodalStore';
import {
  conditionEmoji,
  summarizeWeather,
  wmoEmoji,
  type DayPoint,
  type HourPoint,
  type OpenMeteoResponse,
  type WeatherSummary,
} from '@/utils/weatherSummary';

/** 백엔드 /v1/weather 응답을 앱의 WeatherSummary 형태로 매핑(케이웨더/Open-Meteo 공통). */
interface BackendWeather {
  ok: boolean;
  place?: string;
  source?: 'KWeather' | 'Open-Meteo';
  summary?: { headline: string; advice: string; condition: string; tempC: number; emoji: string; isDay: boolean };
  current?: { raining?: boolean };
  hourly?: Array<{ time: string; tempC: number; popPct: number | null; condition: string; isDay: boolean }>;
  daily?: Array<{ date: string; maxC: number | null; minC: number | null; popPct: number | null; condition: string }>;
  monthly?: Array<{ date: string; maxC: number | null; minC: number | null; popPct: number | null; condition: string }>;
  monthlyRegion?: string | null;
}

export type WeatherSource = 'KWeather' | 'Open-Meteo';

async function fetchFromBackend(
  lat: number,
  lon: number,
  place: string | null,
): Promise<{
  place: string | null;
  summary: WeatherSummary;
  hourly: HourPoint[];
  daily: DayPoint[];
  monthly: DayPoint[];
  monthlyRegion: string | null;
  source: WeatherSource | null;
} | null> {
  try {
    const url =
      `${WEATHER_ENDPOINT}?lat=${lat}&lon=${lon}` + (place ? `&place=${encodeURIComponent(place)}` : '');
    const headers: Record<string, string> = {};
    if (AGENT_ACCESS_TOKEN) headers['x-access-token'] = AGENT_ACCESS_TOKEN;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const d = (await res.json()) as BackendWeather;
    if (!d.ok || !d.summary) return null;
    const cond = d.summary.condition ?? '';
    const hourly: HourPoint[] = (d.hourly ?? []).map((h) => ({
      time: h.time,
      tempC: h.tempC,
      popPct: h.popPct,
      emoji: conditionEmoji(h.condition, h.isDay),
    }));
    const toDay = (day: { date: string; maxC: number | null; minC: number | null; popPct: number | null; condition: string }): DayPoint => ({
      date: day.date,
      maxC: day.maxC,
      minC: day.minC,
      popPct: day.popPct,
      emoji: conditionEmoji(day.condition, true),
    });
    const daily: DayPoint[] = (d.daily ?? []).map(toDay);
    const monthly: DayPoint[] = (d.monthly ?? []).map(toDay);
    return {
      place: d.place ?? place,
      hourly,
      daily,
      monthly,
      monthlyRegion: d.monthlyRegion ?? null,
      source: d.source ?? null,
      summary: {
        headline: d.summary.headline,
        advice: d.summary.advice,
        condition: cond,
        tempC: d.summary.tempC,
        emoji: d.summary.emoji,
        isDay: d.summary.isDay,
        code: 0,
        rainy: Boolean(d.current?.raining),
        cloudy: /흐림|구름/.test(cond),
      },
    };
  } catch {
    return null;
  }
}

/** Open-Meteo 폴백 응답 → 시간별(현재 시각부터 maxHours개). */
function hourlyFromOpenMeteo(data: OpenMeteoResponse, maxHours = 24): HourPoint[] {
  const h = data.hourly ?? {};
  const times = h.time ?? [];
  const temps = h.temperature_2m ?? [];
  const pops = h.precipitation_probability ?? [];
  const codes = h.weather_code ?? [];
  const cutoffHour = (data.current?.time ?? times[0] ?? '').slice(0, 13);

  const out: HourPoint[] = [];
  for (let i = 0; i < times.length && out.length < maxHours; i++) {
    const t = times[i];
    const temp = temps[i];
    if (!t || t.slice(0, 13) < cutoffHour) continue;
    if (typeof temp !== 'number') continue;
    const hour = Number(t.slice(11, 13));
    const isDay = hour >= 6 && hour < 19;
    out.push({
      time: t,
      tempC: Math.round(temp),
      popPct: typeof pops[i] === 'number' ? (pops[i] as number) : null,
      emoji: wmoEmoji(codes[i], isDay),
    });
  }
  return out;
}

/** Open-Meteo 폴백 응답 → 주간(일별). */
function dailyFromOpenMeteo(data: OpenMeteoResponse): DayPoint[] {
  const d = data.daily ?? {};
  const dates = d.time ?? [];
  const maxs = d.temperature_2m_max ?? [];
  const mins = d.temperature_2m_min ?? [];
  const pops = d.precipitation_probability_max ?? [];
  const codes = d.weather_code ?? [];
  const out: DayPoint[] = [];
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    if (!date) continue;
    out.push({
      date,
      maxC: typeof maxs[i] === 'number' ? Math.round(maxs[i] as number) : null,
      minC: typeof mins[i] === 'number' ? Math.round(mins[i] as number) : null,
      popPct: typeof pops[i] === 'number' ? (pops[i] as number) : null,
      emoji: wmoEmoji(codes[i], true),
    });
  }
  return out;
}

export type WeatherPhase = 'idle' | 'locating' | 'loading' | 'ready' | 'denied' | 'error';

export interface LocationWeather {
  phase: WeatherPhase;
  /** 표시용 지명(예: "강남구"). */
  place: string | null;
  summary: WeatherSummary | null;
  /** 시간별 예보(현재 시각부터). 없으면 빈 배열. */
  hourly: HourPoint[];
  /** 주간(일별) 예보. 없으면 빈 배열. */
  daily: DayPoint[];
  /** 30일 장기전망(국내만). 없으면 빈 배열. */
  monthly: DayPoint[];
  /** 30일 전망 권역명(예: "수도권"). 해외/미지원 시 null. */
  monthlyRegion: string | null;
  /** 데이터 출처(케이웨더/Open-Meteo). */
  source: WeatherSource | null;
  error: string | null;
  /** 위치 권한 재요청 + 새로고침. */
  reload: () => void;
}

function pickPlaceName(geo: Location.LocationGeocodedAddress | undefined): string | null {
  if (!geo) return null;
  return (
    geo.district ||
    geo.city ||
    geo.subregion ||
    geo.region ||
    geo.name ||
    null
  );
}

async function fetchWeather(lat: number, lon: number): Promise<OpenMeteoResponse> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day,precipitation',
  );
  url.searchParams.set('hourly', 'precipitation_probability,precipitation,weather_code,temperature_2m');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '7');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`날씨 조회 실패 (HTTP ${res.status})`);
  return (await res.json()) as OpenMeteoResponse;
}

/**
 * 현재 위치 기반 날씨 요약 훅.
 *  - 온보딩에서 이미 권한을 받았으면 자동으로 조용히 로드.
 *  - 좌표/도시명을 스토어에 저장해, 사용자가 "날씨" 류 질문 시 에이전트가 현재 위치를 기본으로 쓰게 한다.
 */
export function useLocationWeather(): LocationWeather {
  const [phase, setPhase] = useState<WeatherPhase>('idle');
  const [place, setPlace] = useState<string | null>(null);
  const [summary, setSummary] = useState<WeatherSummary | null>(null);
  const [hourly, setHourly] = useState<HourPoint[]>([]);
  const [daily, setDaily] = useState<DayPoint[]>([]);
  const [monthly, setMonthly] = useState<DayPoint[]>([]);
  const [monthlyRegion, setMonthlyRegion] = useState<string | null>(null);
  const [source, setSource] = useState<WeatherSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setLocation = useMultimodalStore((s) => s.setLocation);

  const run = useCallback(
    async (askIfNeeded: boolean) => {
      try {
        setError(null);
        let perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted' && askIfNeeded) {
          perm = await Location.requestForegroundPermissionsAsync();
        }
        if (perm.status !== 'granted') {
          setPhase('denied');
          return;
        }

        setPhase('locating');
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = pos.coords;

        // 도시명(역지오코딩) — 실패해도 좌표만으로 진행.
        let placeName: string | null = null;
        try {
          const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
          placeName = pickPlaceName(geo[0]);
        } catch {
          placeName = null;
        }
        setPlace(placeName);
        setLocation({ place: placeName, lat: latitude, lon: longitude });

        setPhase('loading');
        // 1) 백엔드(케이웨더 우선) — 키가 서버에만 있으므로 서버 경유.
        const fromBackend = await fetchFromBackend(latitude, longitude, placeName);
        if (fromBackend) {
          if (fromBackend.place) setPlace(fromBackend.place);
          setSummary(fromBackend.summary);
          setHourly(fromBackend.hourly);
          setDaily(fromBackend.daily);
          setMonthly(fromBackend.monthly);
          setMonthlyRegion(fromBackend.monthlyRegion);
          setSource(fromBackend.source);
          setPhase('ready');
          return;
        }
        // 2) 폴백 — 클라이언트 Open-Meteo(백엔드 미연결/실패 시). 30일은 국내 케이웨더만 → 없음.
        const data = await fetchWeather(latitude, longitude);
        setSummary(summarizeWeather(data));
        setHourly(hourlyFromOpenMeteo(data));
        setDaily(dailyFromOpenMeteo(data));
        setMonthly([]);
        setMonthlyRegion(null);
        setSource('Open-Meteo');
        setPhase('ready');
      } catch (e) {
        setError((e as Error).message ?? '알 수 없는 오류');
        setPhase('error');
      }
    },
    [setLocation],
  );

  // 마운트 시: 이미 허용돼 있으면 자동 로드(묻지 않음).
  useEffect(() => {
    run(false);
  }, [run]);

  const reload = useCallback(() => {
    run(true);
  }, [run]);

  return { phase, place, summary, hourly, daily, monthly, monthlyRegion, source, error, reload };
}
