import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import type { BriefingTime } from '@/services/notifications';
import { radius, sky, spacing } from '@/theme/tokens';

/**
 * 아침 브리핑 설정 시트 — 켜기/끄기 + 예약 시각(시/분 스테퍼).
 * 네이티브 피커 의존성 없이 RN 기본 컴포넌트만 사용(Expo Go 호환).
 */

interface Props {
  visible: boolean;
  onClose: () => void;
  enabled: boolean;
  time: BriefingTime;
  onToggle: (next: boolean) => void;
  onChangeTime: (t: BriefingTime) => void;
  /** 켜기 실패(Expo Go/권한 거부) 안내. */
  hint?: string | null;
}

const pad = (n: number) => String(n).padStart(2, '0');
const wrapHour = (h: number) => (h + 24) % 24;
const wrapMin = (m: number) => (m + 60) % 60;

export function BriefingSettings({
  visible,
  onClose,
  enabled,
  time,
  onToggle,
  onChangeTime,
  hint,
}: Props) {
  const stepHour = (d: number) => onChangeTime({ hour: wrapHour(time.hour + d), minute: time.minute });
  const stepMin = (d: number) => onChangeTime({ hour: time.hour, minute: wrapMin(time.minute + d) });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* 시트 내부 탭은 닫히지 않도록 전파 차단 */}
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.header}>
            <Feather name="bell" size={18} color={sky.brand} />
            <Text style={styles.title}>아침 날씨 브리핑</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="닫기">
              <Feather name="x" size={20} color={sky.inkMuted} />
            </Pressable>
          </View>

          <Text style={styles.desc}>매일 아침, 오늘 날씨를 알림으로 받아보세요.</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>브리핑 켜기</Text>
            <Switch
              value={enabled}
              onValueChange={onToggle}
              trackColor={{ false: sky.border, true: sky.brand }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.row, !enabled && styles.dim]}>
            <Text style={styles.rowLabel}>알림 시각</Text>
            <View style={styles.stepperRow}>
              <Unit
                value={pad(time.hour)}
                onUp={() => stepHour(1)}
                onDown={() => stepHour(-1)}
                disabled={!enabled}
              />
              <Text style={styles.colon}>:</Text>
              <Unit
                value={pad(time.minute)}
                onUp={() => stepMin(5)}
                onDown={() => stepMin(-5)}
                disabled={!enabled}
              />
            </View>
          </View>

          <Text style={styles.note}>매일 {pad(time.hour)}:{pad(time.minute)}에 알려드려요.</Text>
          {!!hint && <Text style={styles.hint}>{hint}</Text>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Unit({
  value,
  onUp,
  onDown,
  disabled,
}: {
  value: string;
  onUp: () => void;
  onDown: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.unit}>
      <Pressable
        onPress={onUp}
        disabled={disabled}
        hitSlop={6}
        style={styles.stepBtn}
        accessibilityLabel="증가"
      >
        <Feather name="chevron-up" size={20} color={disabled ? sky.inkFaint : sky.brand} />
      </Pressable>
      <Text style={[styles.unitValue, disabled && styles.unitValueDim]}>{value}</Text>
      <Pressable
        onPress={onDown}
        disabled={disabled}
        hitSlop={6}
        style={styles.stepBtn}
        accessibilityLabel="감소"
      >
        <Feather name="chevron-down" size={20} color={disabled ? sky.inkFaint : sky.brand} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,24,40,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: sky.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xl + spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, color: sky.ink, fontSize: 17, fontWeight: '700' },
  desc: { color: sky.inkMuted, fontSize: 14, lineHeight: 20 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  dim: { opacity: 0.45 },
  rowLabel: { color: sky.ink, fontSize: 15, fontWeight: '600' },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  colon: { color: sky.ink, fontSize: 22, fontWeight: '700', marginBottom: 2 },
  unit: { alignItems: 'center' },
  stepBtn: { paddingHorizontal: spacing.sm, paddingVertical: 2 },
  unitValue: {
    color: sky.ink,
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'center',
  },
  unitValueDim: { color: sky.inkMuted },

  note: { color: sky.inkMuted, fontSize: 13 },
  hint: { color: sky.warn, fontSize: 13, lineHeight: 19 },
});
