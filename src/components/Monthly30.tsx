import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { HERO_TEXT_SHADOW, IS_WEB, sky, spacing } from '@/theme/tokens';
import type { DayPoint } from '@/utils/weatherSummary';

/**
 * 30일 장기전망(케이웨더, 국내 권역 단위) — 가로 스크롤 일별 카드.
 * 웹=모노 연회색 / 네이티브=다크 유리. ⚠️ 권역 단위·추세 위주임을 헤더에 명시.
 */

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const SHADOW = HERO_TEXT_SHADOW;

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
        showsHorizontalScrollIndicator={IS_WEB}
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
    backgroundColor: sky.panelBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: sky.panelBorder,
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  title: { color: sky.panelText, fontSize: 13, fontWeight: '700', ...SHADOW },
  regionChip: {
    backgroundColor: IS_WEB ? '#E5E5E7' : 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  regionText: { color: sky.panelText, fontSize: 11, fontWeight: '600' },
  note: { color: sky.panelDim, fontSize: 11, paddingHorizontal: spacing.lg, marginTop: 2, ...SHADOW },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  cell: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: IS_WEB ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
    borderWidth: IS_WEB ? 1 : 0,
    borderColor: sky.panelBorder,
    minWidth: 50,
  },
  cellNow: { backgroundColor: sky.panelBgStrong, borderWidth: 1, borderColor: sky.panelBorder },
  wd: { color: sky.panelText, fontSize: 12.5, fontWeight: '600', ...SHADOW },
  weekend: { color: sky.warn },
  md: { color: sky.panelDim, fontSize: 10.5, ...SHADOW },
  emoji: { fontSize: 18, marginVertical: 1 },
  max: { color: sky.panelText, fontSize: 14, fontWeight: '700', ...SHADOW },
  min: { color: sky.panelDim, fontSize: 12, ...SHADOW },
});
