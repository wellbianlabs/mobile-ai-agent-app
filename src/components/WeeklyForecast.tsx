import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { HERO_TEXT_SHADOW, IS_WEB, sky, spacing } from '@/theme/tokens';
import type { DayPoint } from '@/utils/weatherSummary';

/**
 * 주간(7일) 예보 — 요일·아이콘·강수확률 + 주간 최저~최고 대비 기온 범위 바.
 * 웹=모노 연회색 패널 / 네이티브=다크 유리.
 */

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const SHADOW = HERO_TEXT_SHADOW;
const RANGE_COLORS = IS_WEB
  ? (['#C9C9C9', '#8A8A8A', '#454545'] as const)
  : (['#6FC0F2', '#FFD37A', '#F0934B'] as const);

function dayLabel(date: string, i: number): string {
  if (i === 0) return '오늘';
  if (i === 1) return '내일';
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${WD[new Date(y, m - 1, d).getDay()]}요일`;
}

function shortDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return m && d ? `${m}/${d}` : '';
}

export function WeeklyForecast({ data }: { data: DayPoint[] }) {
  if (data.length === 0) return null;

  const days = data.slice(0, 7);
  const mins = days.map((d) => d.minC).filter((v): v is number => v != null);
  const maxs = days.map((d) => d.maxC).filter((v): v is number => v != null);
  const weekMin = mins.length ? Math.min(...mins) : 0;
  const weekMax = maxs.length ? Math.max(...maxs) : 1;
  const span = Math.max(1, weekMax - weekMin);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>주간 예보</Text>
      {days.map((d, i) => {
        const min = d.minC ?? weekMin;
        const max = d.maxC ?? weekMax;
        const left = ((min - weekMin) / span) * 100;
        const width = Math.max(8, ((max - min) / span) * 100);
        return (
          <View key={d.date} style={[styles.row, i < days.length - 1 && styles.rowBorder]}>
            <View style={styles.dayCol}>
              <Text style={styles.day}>{dayLabel(d.date, i)}</Text>
              <Text style={styles.date}>{shortDate(d.date)}</Text>
            </View>
            <Text style={styles.emoji}>{d.emoji}</Text>
            <Text style={styles.pop}>
              {d.popPct != null && d.popPct > 0 ? `💧${d.popPct}%` : ''}
            </Text>
            <Text style={styles.minT}>{d.minC != null ? `${d.minC}°` : '–'}</Text>
            <View style={styles.track}>
              <LinearGradient
                colors={RANGE_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.fill, { left: `${left}%`, width: `${width}%` }]}
              />
            </View>
            <Text style={styles.maxT}>{d.maxC != null ? `${d.maxC}°` : '–'}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: sky.panelBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: sky.panelBorder,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  title: { color: sky.panelText, fontSize: 13, fontWeight: '700', paddingVertical: spacing.sm, ...SHADOW },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: sky.panelBorder },
  dayCol: { width: 58 },
  day: { color: sky.panelText, fontSize: 14, fontWeight: '600', ...SHADOW },
  date: { color: sky.panelDim, fontSize: 11, marginTop: 1, ...SHADOW },
  emoji: { fontSize: 19, width: 30, textAlign: 'center' },
  pop: { color: sky.panelDim, fontSize: 11, fontWeight: '700', width: 42, ...SHADOW },
  minT: { color: sky.panelDim, fontSize: 13, width: 30, textAlign: 'right', ...SHADOW },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: IS_WEB ? '#E5E5E7' : 'rgba(255,255,255,0.18)',
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  fill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 999 },
  maxT: { color: sky.panelText, fontSize: 13, fontWeight: '700', width: 32, textAlign: 'right', ...SHADOW },
});
