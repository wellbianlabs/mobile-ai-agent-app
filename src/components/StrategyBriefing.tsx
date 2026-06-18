import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Markdown } from '@/components/Markdown';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useStrategyBriefing } from '@/hooks/useStrategyBriefing';
import { radius, sky, spacing } from '@/theme/tokens';

/**
 * 능동 전략 브리핑 카드 — 홈에서 묻기 전에 먼저 인사이트 + 후속 제안 칩을 제시.
 * 흰 카드(하늘 배경 위 가독성). 칩 탭 시 즉시 대화로 흐른다.
 */
export function StrategyBriefing() {
  const { status, text, suggestions } = useStrategyBriefing();
  const { send, sending } = useSendMessage();

  if (status === 'idle' || status === 'error') return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Feather name="zap" size={14} color={sky.brand} />
        <Text style={styles.title}>wellbianAI 전략 브리핑</Text>
      </View>

      {status === 'loading' ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={sky.brand} />
          <Text style={styles.loadingText}>오늘의 전략을 분석하고 있어요…</Text>
        </View>
      ) : (
        <>
          <Markdown text={text} />
          {suggestions.length > 0 && (
            <View style={styles.chips}>
              {suggestions.map((s) => (
                <Pressable
                  key={s}
                  style={[styles.chip, sending && styles.chipDim]}
                  disabled={sending}
                  onPress={() => void send(s)}
                >
                  <Feather name="corner-up-right" size={12} color={sky.brand} />
                  <Text style={styles.chipText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: sky.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: sky.border,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#16243A',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: sky.brand, fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  loadingText: { color: sky.inkMuted, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: sky.brandSoft,
    borderWidth: 1,
    borderColor: 'rgba(46,134,222,0.35)',
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
  },
  chipDim: { opacity: 0.5 },
  chipText: { color: sky.brand, fontSize: 13, fontWeight: '600' },
});
