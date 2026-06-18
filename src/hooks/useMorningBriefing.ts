import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import {
  cancelMorningBriefing,
  scheduleMorningBriefing,
  type BriefingTime,
} from '@/services/notifications';
import type { WeatherSummary } from '@/utils/weatherSummary';

/**
 * 능동형 아침 날씨 브리핑 — 켜기/끄기 + 시각 설정 + 자동 (재)예약 훅.
 *
 * - 켜져 있고 날씨 요약이 들어오면, 설정 시각에 그 날 헤드라인으로 알림을 재예약한다
 *   (앱을 열 때마다 최신 요약으로 갱신 → 로컬 알림만으로도 신선도 유지).
 * - enabled/time 선호값은 AsyncStorage 에 영속. 기본 OFF · 07:30.
 * - Expo Go 에서는 예약이 조용히 실패하므로 setEnabled(true) 가 false 를 반환한다(개발 빌드 필요).
 */

const PREF_KEY = 'briefing.enabled.v1';
const TIME_KEY = 'briefing.time.v1';
const DEFAULT_TIME: BriefingTime = { hour: 7, minute: 30 };

function isValidTime(t: unknown): t is BriefingTime {
  return (
    !!t &&
    typeof t === 'object' &&
    Number.isInteger((t as BriefingTime).hour) &&
    Number.isInteger((t as BriefingTime).minute) &&
    (t as BriefingTime).hour >= 0 &&
    (t as BriefingTime).hour <= 23 &&
    (t as BriefingTime).minute >= 0 &&
    (t as BriefingTime).minute <= 59
  );
}

function briefingContent(summary: WeatherSummary, place: string | null) {
  const title = place ? `${place} 아침 날씨` : '오늘 아침 날씨';
  const body = summary.advice ? `${summary.headline} ${summary.advice}` : summary.headline;
  return { title, body };
}

export interface MorningBriefing {
  enabled: boolean;
  /** 선호값 로드 완료 여부(초기 깜빡임 방지). */
  ready: boolean;
  /** 예약 시각(매일). */
  time: BriefingTime;
  /** 켜기/끄기. 켜기 실패(Expo Go/권한 거부) 시 false 를 반환하며 OFF 를 유지. */
  setEnabled: (next: boolean) => Promise<boolean>;
  /** 예약 시각 변경(영속 + 켜져 있으면 재예약). */
  setTime: (t: BriefingTime) => Promise<void>;
}

export function useMorningBriefing(
  summary: WeatherSummary | null,
  place: string | null,
): MorningBriefing {
  const [enabled, setEnabledState] = useState(false);
  const [time, setTimeState] = useState<BriefingTime>(DEFAULT_TIME);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [e, t] = await Promise.all([
          AsyncStorage.getItem(PREF_KEY),
          AsyncStorage.getItem(TIME_KEY),
        ]);
        setEnabledState(e === '1');
        if (t) {
          const parsed = JSON.parse(t) as unknown;
          if (isValidTime(parsed)) setTimeState(parsed);
        }
      } catch {
        /* 기본값 사용 */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // 켜져 있고 날씨 요약이 있으면 최신 내용 + 현재 시각으로 재예약.
  useEffect(() => {
    if (!ready || !enabled || !summary) return;
    void scheduleMorningBriefing(time, briefingContent(summary, place));
  }, [ready, enabled, summary, place, time]);

  const setEnabled = useCallback(
    async (next: boolean): Promise<boolean> => {
      if (!next) {
        setEnabledState(false);
        await AsyncStorage.setItem(PREF_KEY, '0').catch(() => undefined);
        await cancelMorningBriefing();
        return false;
      }
      // 켜기: 날씨 요약이 있으면 즉시 예약 시도, 성공해야 ON 확정.
      if (summary) {
        const ok = await scheduleMorningBriefing(time, briefingContent(summary, place));
        if (!ok) return false; // 권한 거부/Expo Go → OFF 유지
      }
      setEnabledState(true);
      await AsyncStorage.setItem(PREF_KEY, '1').catch(() => undefined);
      return true;
    },
    [summary, place, time],
  );

  const setTime = useCallback(async (t: BriefingTime): Promise<void> => {
    setTimeState(t);
    await AsyncStorage.setItem(TIME_KEY, JSON.stringify(t)).catch(() => undefined);
    // 재예약은 위 effect(deps에 time 포함)가 처리.
  }, []);

  return { enabled, ready, time, setEnabled, setTime };
}
