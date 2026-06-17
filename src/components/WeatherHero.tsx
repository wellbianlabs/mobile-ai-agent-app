import { Feather } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComposerBar } from '@/components/ComposerBar';
import { SkyBackground } from '@/components/SkyBackground';
import { useLocationWeather } from '@/hooks/useLocationWeather';
import { useMorningBriefing } from '@/hooks/useMorningBriefing';
import { sky, spacing } from '@/theme/tokens';
import { getSkyScene } from '@/utils/skyTheme';

/**
 * 날씨 히어로 홈 — 첫 화면.
 * 시간대·날씨 반응형 하늘 배경 위에 현재 위치 날씨 요약(큰 헤드라인 + 조언)을 보여주고,
 * 하단의 입력 바로 무엇이든 물어볼 수 있다.
 */
export function WeatherHero() {
  const { phase, place, summary, reload } = useLocationWeather();
  const briefing = useMorningBriefing(summary, place);

  const loading = phase === 'idle' || phase === 'locating' || phase === 'loading';

  const onToggleBriefing = async () => {
    const on = await briefing.toggle();
    if (on) {
      Alert.alert('아침 브리핑 켜짐', '매일 오전 7:30에 오늘 날씨를 알려드릴게요.');
    } else if (!briefing.enabled) {
      // 켜기 시도가 실패한 경우(권한 거부/Expo Go 미지원)에만 안내.
      Alert.alert(
        '브리핑을 켤 수 없어요',
        '알림 권한을 허용했는지 확인해 주세요. (개발 빌드에서 동작 — Expo Go는 알림 미지원)',
      );
    }
  };

  const scene = getSkyScene(
    new Date().getHours(),
    summary
      ? { code: summary.code, isDay: summary.isDay, rainy: summary.rainy, cloudy: summary.cloudy }
      : undefined,
  );

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
              onPress={onToggleBriefing}
              hitSlop={8}
              style={[styles.bell, briefing.enabled && styles.bellOn]}
              accessibilityLabel={briefing.enabled ? '아침 브리핑 끄기' : '아침 브리핑 켜기'}
            >
              <Feather name={briefing.enabled ? 'bell' : 'bell-off'} size={16} color="#fff" />
            </Pressable>
          )}
        </View>

        {/* 헤드라인 영역 */}
        <View style={styles.hero}>
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.loadingText}>현재 위치 날씨를 불러오는 중…</Text>
            </View>
          )}

          {phase === 'ready' && summary && (
            <>
              <Text style={styles.headline}>{summary.headline}</Text>
              <Text style={styles.advice}>{summary.advice}</Text>
              {summary.tempC != null && (
                <Text style={styles.temp}>
                  {summary.emoji}  {summary.tempC}°  ·  {summary.condition}
                </Text>
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

        {/* 입력 바 */}
        <ComposerBar />
      </SafeAreaView>
    </SkyBackground>
  );
}

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
  chipText: { color: '#fff', fontSize: 13.5, fontWeight: '600' },
  hero: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  loadingText: { color: sky.heroDim, fontSize: 15 },
  headline: {
    color: sky.heroText,
    fontFamily: 'serif',
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 52,
    letterSpacing: -0.6,
  },
  advice: {
    color: sky.heroAccent,
    fontFamily: 'serif',
    fontSize: 34,
    fontWeight: '600',
    lineHeight: 44,
    letterSpacing: -0.4,
    marginTop: spacing.lg,
  },
  temp: { color: sky.heroDim, fontSize: 16, marginTop: spacing.xl, fontWeight: '500' },
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
