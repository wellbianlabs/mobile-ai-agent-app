import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BriefingSettings } from '@/components/BriefingSettings';
import { ComposerBar } from '@/components/ComposerBar';
import { HourlyStrip } from '@/components/HourlyStrip';
import { SkyBackground } from '@/components/SkyBackground';
import { useLocationWeather } from '@/hooks/useLocationWeather';
import { useMorningBriefing } from '@/hooks/useMorningBriefing';
import { sky, spacing } from '@/theme/tokens';
import { getSkyScene } from '@/utils/skyTheme';

const BRIEFING_GO_HINT =
  'Expo Go에서는 알림이 동작하지 않아요. 개발 빌드(APK)에서 켜집니다.';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatClock(d: Date): string {
  const h = d.getHours();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

/** 출처 표기는 국내외 모두 케이웨더로 통일(앱 브랜딩). */
const SOURCE_LABEL = '케이웨더(KWeather)';

/**
 * 날씨 히어로 홈 — 첫 화면.
 * 시간대·날씨 반응형 하늘 배경 위에 현재 위치 날씨 요약(큰 헤드라인 + 조언)을 보여주고,
 * 하단의 입력 바로 무엇이든 물어볼 수 있다.
 */
export function WeatherHero() {
  const { phase, place, summary, hourly, source, reload } = useLocationWeather();
  const briefing = useMorningBriefing(summary, place);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [briefingHint, setBriefingHint] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  // 현재 시각 — 매 분 갱신(다음 분 경계에 맞춰 정렬) + 앱 재활성화 시 즉시 새로고침.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => setNow(new Date());
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60 * 1000);
    }, (60 - new Date().getSeconds()) * 1000);
    // 잠금 해제/포그라운드 복귀 시 멈춰 있던 타이머 대신 즉시 갱신.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
      sub.remove();
    };
  }, []);

  const loading = phase === 'idle' || phase === 'locating' || phase === 'loading';

  const onToggleBriefing = async (next: boolean) => {
    const ok = await briefing.setEnabled(next);
    // 켜기를 눌렀는데 실패하면(Expo Go/권한 거부) 안내, 성공/끄기면 안내 제거.
    setBriefingHint(next && !ok ? BRIEFING_GO_HINT : null);
  };

  const scene = getSkyScene(
    now.getHours(),
    summary
      ? { code: summary.code, isDay: summary.isDay, rainy: summary.rainy, cloudy: summary.cloudy }
      : undefined,
  );

  const sourceLabel = source ? SOURCE_LABEL : null;

  return (
    <SkyBackground scene={scene}>
      <SafeAreaView style={styles.fill}>
        {/* 상단 칩 + 아침 브리핑 토글 */}
        <View style={styles.top}>
          <View style={styles.chip}>
            <Feather name="cloud" size={15} color="#fff" />
            <Text style={styles.chipText}>
              {place ? `${place} 날씨` : '오늘 날씨 요약'}
            </Text>
          </View>
          {briefing.ready && (
            <Pressable
              onPress={() => setSettingsOpen(true)}
              hitSlop={8}
              style={[styles.bell, briefing.enabled && styles.bellOn]}
              accessibilityLabel="아침 브리핑 설정"
            >
              <Feather name={briefing.enabled ? 'bell' : 'bell-off'} size={16} color="#fff" />
            </Pressable>
          )}
        </View>

        {/* 헤드라인 영역 */}
        <View style={styles.hero}>
          {/* 현재 시각 */}
          <View style={styles.clock}>
            <Text style={styles.clockTime}>{formatClock(now)}</Text>
            <Text style={styles.clockDate}>{formatDate(now)}</Text>
          </View>

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.loadingText}>현재 위치 날씨를 불러오는 중…</Text>
            </View>
          )}

          {phase === 'ready' && summary && (
            <>
              <Text style={styles.headline} numberOfLines={2}>{summary.headline}</Text>
              <Text style={styles.advice} numberOfLines={2}>{summary.advice}</Text>
              {summary.tempC != null && (
                <Text style={styles.temp}>
                  {summary.emoji}  {summary.tempC}°  ·  {summary.condition}
                </Text>
              )}
              {sourceLabel && (
                <View style={styles.sourceRow}>
                  <Feather name="database" size={11} color={sky.heroDim} />
                  <Text style={styles.sourceText}>데이터 제공 · {sourceLabel}</Text>
                </View>
              )}
            </>
          )}

          {phase === 'denied' && (
            <>
              <Text style={styles.headline}>무엇을{'\n'}도와드릴까요?</Text>
              <Pressable style={styles.permBtn} onPress={reload}>
                <Feather name="map-pin" size={15} color="#fff" />
                <Text style={styles.permText}>위치 권한 허용하고 날씨 보기</Text>
              </Pressable>
            </>
          )}

          {phase === 'error' && (
            <>
              <Text style={styles.headline}>무엇을{'\n'}도와드릴까요?</Text>
              <Pressable style={styles.permBtn} onPress={reload}>
                <Feather name="refresh-cw" size={14} color="#fff" />
                <Text style={styles.permText}>날씨 다시 불러오기</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* 시간별 예보 스트립 */}
        {phase === 'ready' && hourly.length > 0 && (
          <View style={styles.hourly}>
            <HourlyStrip data={hourly} />
          </View>
        )}

        {/* 입력 바 */}
        <ComposerBar />
      </SafeAreaView>

      <BriefingSettings
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        enabled={briefing.enabled}
        time={briefing.time}
        onToggle={onToggleBriefing}
        onChangeTime={briefing.setTime}
        hint={briefingHint}
      />
    </SkyBackground>
  );
}

/** 배경 이미지 위 흰 글자 가독성용 그림자. */
const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 8,
} as const;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  bell: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sky.chip,
    borderWidth: 1,
    borderColor: sky.chipBorder,
  },
  bellOn: { backgroundColor: 'rgba(255,255,255,0.32)' },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: sky.chip,
    borderWidth: 1,
    borderColor: sky.chipBorder,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  chipText: { color: '#fff', fontSize: 13.5, fontWeight: '600', ...TEXT_SHADOW },
  hero: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: spacing.xl, paddingTop: spacing.lg },

  clock: { marginBottom: spacing.md },
  clockTime: {
    color: sky.heroText,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    ...TEXT_SHADOW,
  },
  clockDate: { color: '#fff', opacity: 0.9, fontSize: 13, fontWeight: '500', marginTop: 2, ...TEXT_SHADOW },

  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  sourceText: { color: '#fff', opacity: 0.9, fontSize: 12, fontWeight: '500', ...TEXT_SHADOW },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  loadingText: { color: '#fff', fontSize: 15, ...TEXT_SHADOW },
  headline: {
    color: sky.heroText,
    fontFamily: 'serif',
    fontSize: 29,
    fontWeight: '700',
    lineHeight: 37,
    letterSpacing: -0.5,
    ...TEXT_SHADOW,
  },
  advice: {
    color: '#fff',
    fontFamily: 'serif',
    fontSize: 19,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.2,
    marginTop: spacing.sm,
    ...TEXT_SHADOW,
  },
  temp: { color: '#fff', opacity: 0.95, fontSize: 15, marginTop: spacing.md, fontWeight: '500', ...TEXT_SHADOW },
  hourly: { paddingBottom: spacing.md },
  permBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: sky.glass,
    borderWidth: 1,
    borderColor: sky.chipBorder,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  permText: { color: '#fff', fontSize: 14.5, fontWeight: '600' },
});
