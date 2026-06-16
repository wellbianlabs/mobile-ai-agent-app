import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { VoiceClip } from '@/types/payload';
import { colors, radius, spacing } from '@/theme/tokens';

interface Props {
  clip: VoiceClip;
  onRemove: () => void;
}

/** 첨부된 음성 클립을 작은 파형 미리보기 칩으로 표시. */
export function VoiceClipChip({ clip, onRemove }: Props) {
  // meterSamples 를 최대 24개 막대로 다운샘플해 미니 파형으로 그린다.
  const bars = downsample(clip.meterSamples, 24);
  return (
    <View style={styles.chip}>
      <Feather name="mic" size={16} color={colors.accent} />
      <View style={styles.wave}>
        {bars.map((h, i) => (
          <View key={i} style={[styles.bar, { height: 4 + h * 18 }]} />
        ))}
      </View>
      <Text style={styles.dur}>{formatDuration(clip.durationMs)}</Text>
      <Pressable style={styles.remove} hitSlop={8} onPress={onRemove} accessibilityLabel="음성 삭제">
        <Feather name="x" size={13} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

/** dBFS 샘플(-60~0)을 0~1 높이로 정규화하면서 count 개로 평균 다운샘플. */
function downsample(samples: number[], count: number): number[] {
  if (samples.length === 0) return new Array(count).fill(0);
  const out: number[] = [];
  const bucket = Math.ceil(samples.length / count);
  for (let i = 0; i < count; i++) {
    const slice = samples.slice(i * bucket, (i + 1) * bucket);
    if (slice.length === 0) {
      out.push(0);
      continue;
    }
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    const norm = Math.max(0, Math.min(1, (avg + 60) / 60));
    out.push(norm);
  }
  return out;
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  icon: {
    fontSize: 16,
  },
  wave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
  },
  bar: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  dur: {
    color: colors.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  remove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeTxt: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
