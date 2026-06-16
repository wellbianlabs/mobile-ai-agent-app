import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useMultimodalStore, type ConversationTurn } from '@/store/multimodalStore';
import { radius, sky, spacing } from '@/theme/tokens';

/**
 * 비서와의 대화 로그(라이트 테마). 사용자/비서 말풍선을 시간순으로 보여준다.
 */
export function ConversationView() {
  const turns = useMultimodalStore((s) => s.turns);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [turns.length, turns[turns.length - 1]?.status]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {turns.map((turn) => (
        <Turn key={turn.id} turn={turn} />
      ))}
    </ScrollView>
  );
}

function Turn({ turn }: { turn: ConversationTurn }) {
  return (
    <View style={styles.turn}>
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{turn.question}</Text>
          {(turn.imageCount > 0 || turn.hasVoice) && (
            <View style={styles.attachRow}>
              {turn.imageCount > 0 && <Badge icon="image" label={`이미지 ${turn.imageCount}`} onUser />}
              {turn.hasVoice && <Badge icon="mic" label="음성" onUser />}
            </View>
          )}
        </View>
      </View>

      <View style={styles.agentRow}>
        <View style={styles.agentBubble}>
          {turn.status === 'pending' && (
            <View style={styles.pending}>
              <ActivityIndicator color={sky.brand} size="small" />
              <Text style={styles.pendingText}>답변 중…</Text>
            </View>
          )}
          {turn.status === 'error' && <Text style={styles.errorText}>⚠ {turn.error}</Text>}
          {turn.status === 'done' && (
            <>
              <Text style={styles.agentText}>{turn.answer}</Text>
              {!!turn.toolsUsed?.length && (
                <View style={styles.attachRow}>
                  {turn.toolsUsed.map((t) => (
                    <Badge key={t} icon={toolIcon(t)} label={toolLabel(t)} />
                  ))}
                </View>
              )}
              {!!turn.citations?.length && (
                <View style={styles.citations}>
                  {turn.citations.slice(0, 4).map((c, i) => (
                    <Text
                      key={c.url + i}
                      style={styles.citation}
                      numberOfLines={1}
                      onPress={() => Linking.openURL(c.url).catch(() => undefined)}
                    >
                      {i + 1}. {c.title || c.url}
                    </Text>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function Badge({
  icon,
  label,
  onUser,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onUser?: boolean;
}) {
  return (
    <View style={[styles.badge, onUser && styles.badgeOnUser]}>
      <Feather name={icon} size={11} color={onUser ? 'rgba(255,255,255,0.9)' : sky.brand} />
      <Text style={[styles.badgeText, onUser && styles.badgeTextOnUser]}>{label}</Text>
    </View>
  );
}

function toolIcon(tool: string): keyof typeof Feather.glyphMap {
  if (tool === 'web_search') return 'search';
  if (tool === 'get_weather') return 'cloud';
  return 'tool';
}
function toolLabel(tool: string): string {
  if (tool === 'web_search') return '웹검색';
  if (tool === 'get_weather') return '날씨';
  return tool;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: sky.surfaceSoft },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },

  turn: { gap: spacing.sm },
  userRow: { alignItems: 'flex-end' },
  userBubble: {
    maxWidth: '86%',
    backgroundColor: sky.brand,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  userText: { color: '#fff', fontSize: 15, lineHeight: 21 },

  agentRow: { alignItems: 'flex-start' },
  agentBubble: {
    maxWidth: '92%',
    backgroundColor: sky.surface,
    borderColor: sky.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: '#16243A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  agentText: { color: sky.ink, fontSize: 15, lineHeight: 23 },

  pending: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pendingText: { color: sky.inkMuted, fontSize: 14 },
  errorText: { color: sky.warn, fontSize: 14 },

  attachRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: sky.brandSoft,
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  badgeOnUser: { backgroundColor: 'rgba(255,255,255,0.18)' },
  badgeText: { color: sky.brand, fontSize: 11, fontWeight: '600' },
  badgeTextOnUser: { color: 'rgba(255,255,255,0.95)' },

  citations: { marginTop: spacing.sm, gap: 3 },
  citation: { color: sky.brand, fontSize: 12, textDecorationLine: 'underline' },
});
