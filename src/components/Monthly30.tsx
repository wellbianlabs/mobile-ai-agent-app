import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import type { DayPoint } from '@/utils/weatherSummary';

/**
 * 30일 장기전망(케이웨더, 국내 권역 단위) — 가로 스크롤 일별 카드.
 * ⚠️ 권역 단위·추세 위주(2주 이후 신뢰도 낮음)임을 헤더에 명시.
 */

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
} as const;

function parts(date: string): { wd: string; md: string } {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return { wd: '', md: '' };
  return { wd: WD[new Date(y, m - 1, d).getDay()] ?? '', md: `${m}/${d}` };
}

export function Monthly30({ data, region }: { data: DayPoint[]; region: string | null }) {
  if (data.length === 0) return null;
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>30일 장기전망</Text>
        {region && (
          <View style={styles.regionChip}>
            <Text style={styles.regionText}>{region}</Text>
          </View>
        )}
      </View>
      <Text style={styles.note}>권역 단위 추세 · 2주 이후는 참고용</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {data.map((d, i) => {
          const { wd, md } = parts(d.date);
          const weekend = wd === '일' || wd === '토';
          return (
            <View key={d.date} style={[styles.cell, i === 0 && styles.cellNow]}>
              <Text style={[styles.wd, weekend && styles.weekend]}>{i === 0 ? '오늘' : wd}</Text>
              <Text style={styles.md}>{md}</Text>
              <Text style={styles.emoji}>{d.emoji}</Text>
              <Text style={styles.max}>{d.maxC != null ? `${d.maxC}°` : '–'}</Text>
              <Text style={styles.min}>{d.minC != null ? `${d.minC}°` : '–'}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(20,40,70,0.28)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  title: { color: '#fff', fontSize: 13, fontWeight: '700', ...SHADOW },
  regionChip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  regionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  note: { color: '#fff', opacity: 0.7, fontSize: 11, paddingHorizontal: spacing.lg, marginTop: 2, ...SHADOW },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  cell: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    minWidth: 50,
  },
  cellNow: { backgroundColor: 'rgba(20,40,70,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  wd: { color: '#fff', fontSize: 12.5, fontWeight: '600', ...SHADOW },
  weekend: { color: '#FFD9C2' },
  md: { color: '#fff', opacity: 0.7, fontSize: 10.5, ...SHADOW },
  emoji: { fontSize: 18, marginVertical: 1 },
  max: { color: '#fff', fontSize: 14, fontWeight: '700', ...SHADOW },
  min: { color: '#fff', opacity: 0.75, fontSize: 12, ...SHADOW },
});
