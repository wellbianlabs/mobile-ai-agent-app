import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { HERO_TEXT_SHADOW, IS_WEB, sky, spacing } from '@/theme/tokens';
import type { HourPoint } from '@/utils/weatherSummary';

/**
 * 시간별 예보 가로 스트립 — 히어로 위 칩(웹=모노 연회색 / 네이티브=다크 유리).
 * 첫 칸은 "지금", 이후 "HH시". 강수확률이 있으면 하단에 표기.
 */

const SHADOW = HERO_TEXT_SHADOW;

function hourLabel(iso: string, index: number): string {
  if (index === 0) return '지금';
  const h = Number(iso.slice(11, 13));
  return Number.isNaN(h) ? '' : `${h}시`;
}

export function HourlyStrip({ data }: { data: HourPoint[] }) {
  if (!data.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={IS_WEB}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {data.slice(0, 24).map((h, i) => (
        <View key={h.time} style={[styles.cell, i === 0 && styles.cellNow]}>
          <Text style={styles.time} numberOfLines={1}>
            {hourLabel(h.time, i)}
          </Text>
          <Text style={styles.emoji}>{h.emoji}</Text>
          <Text style={styles.temp}>{h.tempC}°</Text>
          <Text style={styles.pop}>
            {h.popPct != null && h.popPct > 0 ? `💧${h.popPct}%` : ' '}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  cell: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    backgroundColor: sky.panelBg,
    borderWidth: 1,
    borderColor: sky.panelBorder,
    minWidth: 60,
  },
  cellNow: { backgroundColor: sky.panelBgStrong, borderColor: sky.panelBorder },
  time: { color: sky.panelText, fontSize: 12.5, fontWeight: '600', ...SHADOW },
  emoji: { fontSize: 20 },
  temp: { color: sky.panelText, fontSize: 15, fontWeight: '700', ...SHADOW },
  pop: { color: sky.panelDim, fontSize: 11, fontWeight: '700', ...SHADOW },
});
