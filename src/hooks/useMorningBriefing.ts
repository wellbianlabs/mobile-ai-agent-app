import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import {
  cancelMorningBriefing,
  scheduleMorningBriefing,
  type BriefingTime,
} from '@/services/notifications';
import type { WeatherSummary } from '@/utils/weatherSummary';

/**
 * 능동형 아침 날씨 브리핑 토글 + 자동 (재)예약 훅.
 *
 * - 켜져 있고 날씨 요약이 들어오면, 매일 아침 그 날 헤드라인으로 알림을 재예약한다
 *   (앱을 열 때마다 최신 요약으로 갱신 → 로컬 알림만으로도 신선도 유지).
 * - 선호값은 AsyncStorage 에 영속. 기본 OFF(사용자가 명시적으로 켠다).
 * - Expo Go 에서는 예약이 조용히 실패하므로 토글이 자동으로 되돌아간다(개발 빌드 필요).
 */

const PREF_KEY = 'briefing.enabled.v1';
const DEFAULT_TIME: BriefingTime = { hour: 7, minute: 30 };

function briefingContent(summary: WeatherSummary, place: string | null) {
  const title = place ? `${place} 아침 날씨` : '오늘 아침 날씨';
  const body = summary.advice ? `${summary.headline} ${summary.advice}` : summary.headline;
  return { title, body };
}

export interface MorningBriefing {
  enabled: boolean;
  /** 선호값 로드 완료 여부(초기 깜빡임 방지). */
  ready: boolean;
  /** 토글. 켜기 실패(Expo Go/권한 거부) 시 false 로 되돌아가며 결과를 반환. */
  toggle: () => Promise<boolean>;
}

export function useMorningBriefing(
  summary: WeatherSummary | null,
  place: string | null,
): MorningBriefing {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY)
      .then((v) => setEnabled(v === '1'))
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  // 켜져 있고 날씨 요약이 있으면 최신 내용으로 재예약.
  useEffect(() => {
    if (!ready || !enabled || !summary) return;
    void scheduleMorningBriefing(DEFAULT_TIME, briefingContent(summary, place));
  }, [ready, enabled, summary, place]);

  const toggle = useCallback(async (): Promise<boolean> => {
    if (enabled) {
      setEnabled(false);
      await AsyncStorage.setItem(PREF_KEY, '0').catch(() => undefined);
      await cancelMorningBriefing();
      return false;
    }

    // 켜기: 날씨 요약이 있으면 즉시 예약 시도, 성공해야 ON 확정.
    if (summary) {
      const ok = await scheduleMorningBriefing(DEFAULT_TIME, briefingContent(summary, place));
      if (!ok) return false; // 권한 거부/Expo Go → OFF 유지
    }
    setEnabled(true);
    await AsyncStorage.setItem(PREF_KEY, '1').catch(() => undefined);
    return true;
  }, [enabled, summary, place]);

  return { enabled, ready, toggle };
}
