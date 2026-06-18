import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, sky, spacing } from '@/theme/tokens';
import { INDUSTRIES } from '@/utils/industries';

/**
 * 업종(산업군) 선택 시트 — 선택 시 모든 답변이 그 업종 관점으로 처방된다.
 */
interface Props {
  visible: boolean;
  current: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function IndustryPicker({ visible, current, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.header}>
            <Feather name="briefcase" size={18} color={sky.brand} />
            <Text style={styles.title}>업종 선택</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="닫기">
              <Feather name="x" size={20} color={sky.inkMuted} />
            </Pressable>
          </View>
          <Text style={styles.desc}>업종을 고르면 날씨를 그 사업 관점으로 분석·처방해드려요.</Text>

          <View style={styles.grid}>
            {INDUSTRIES.map((ind) => {
              const active = ind.id === current;
              return (
                <Pressable
                  key={ind.id}
                  style={[styles.cell, active && styles.cellActive]}
                  onPress={() => {
                    onSelect(ind.id);
                    onClose();
                  }}
                >
                  <Feather name={ind.icon} size={18} color={active ? sky.brand : sky.inkMuted} />
                  <Text style={[styles.cellText, active && styles.cellTextActive]}>{ind.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,24,40,0.45)', justifyContent: 'flex-end' },
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  cell: {
    width: '31.5%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: sky.border,
    backgroundColor: sky.surfaceSoft,
  },
  cellActive: { borderColor: sky.brand, backgroundColor: sky.brandSoft, borderWidth: 2 },
  cellText: { color: sky.inkMuted, fontSize: 13, fontWeight: '600' },
  cellTextActive: { color: sky.brand },
});
