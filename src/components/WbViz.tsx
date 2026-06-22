import { StyleSheet, Text, View } from 'react-native';

import { radius, sky, spacing } from '@/theme/tokens';

/**
 * wellbianAI 인텔리전스 비주얼 — 에이전트가 답변에 끼워 보낸 구조화 데이터 블록을
 * 채팅 안에서 네이티브로 렌더한다(의존성 없음). Markdown.tsx 가 ```wb:* 펜스를 라우팅.
 *  - wb:metric  핵심 수치 카드(+예년 대비 delta)
 *  - wb:bars    가로 막대(시간별·요일별·지역 비교 등)
 *  - wb:gauge   리스크/가능도 게이지
 */

const STATUS_COLOR: Record<string, string> = {
  ok: '#1D9E75',
  warn: '#E8833A',
  danger: '#D84A3F',
};

export function WbViz({ type, raw }: { type: string; raw: string }) {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>{raw.trim()}</Text>
      </View>
    );
  }
  if (type === 'metric') return <Metric d={data} />;
  if (type === 'bars') return <Bars d={data} />;
  if (type === 'gauge') return <Gauge d={data} />;
  return null;
}

function Metric({ d }: { d: Record<string, unknown> }) {
  const delta = typeof d.delta === 'number' ? d.delta : null;
  const up = d.deltaDir === 'up';
  const deltaColor = delta == null ? sky.inkMuted : up ? '#D84A3F' : '#2E86DE';
  return (
    <View style={styles.card}>
      <Text style={styles.metricLabel}>{String(d.label ?? '')}</Text>
      <View style={styles.metricRow}>
        <Text style={styles.metricValue}>{String(d.value ?? '')}</Text>
        {!!d.unit && <Text style={styles.metricUnit}>{String(d.unit)}</Text>}
        {delta != null && (
          <Text style={[styles.metricDelta, { color: deltaColor }]}>
            {up ? '▲' : '▼'} {Math.abs(delta)}
            {d.unit ? String(d.unit) : ''}
          </Text>
        )}
      </View>
      {!!d.sub && <Text style={styles.metricSub}>{String(d.sub)}</Text>}
    </View>
  );
}

function Bars({ d }: { d: Record<string, unknown> }) {
  const items = Array.isArray(d.items) ? (d.items as Array<Record<string, unknown>>) : [];
  const vals = items.map((it) => (typeof it.value === 'number' ? it.value : 0));
  const max = Math.max(1, ...vals);
  return (
    <View style={styles.card}>
      {!!d.title && <Text style={styles.vizTitle}>{String(d.title)}</Text>}
      {items.map((it, i) => {
        const v = typeof it.value === 'number' ? it.value : 0;
        const pct = Math.max(3, Math.round((v / max) * 100));
        const flag = it.flag === true;
        return (
          <View key={i} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {String(it.label ?? '')}
            </Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%` }, flag && styles.barFlag]} />
            </View>
            <Text style={styles.barValue}>
              {v}
              {d.unit ? String(d.unit) : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Gauge({ d }: { d: Record<string, unknown> }) {
  const value = typeof d.value === 'number' ? d.value : 0;
  const max = typeof d.max === 'number' && d.max > 0 ? d.max : 100;
  const pct = Math.max(2, Math.min(100, Math.round((value / max) * 100)));
  const status = typeof d.status === 'string' ? d.status : 'ok';
  const color = STATUS_COLOR[status] ?? sky.brand;
  return (
    <View style={styles.card}>
      <View style={styles.gaugeHead}>
        <Text style={styles.vizTitle}>{String(d.label ?? '')}</Text>
        <Text style={[styles.gaugeStatus, { color }]}>
          {value}
          {d.unit ? String(d.unit) : ''}
        </Text>
      </View>
      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      {!!d.note && <Text style={styles.metricSub}>{String(d.note)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: sky.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: sky.border,
    padding: spacing.md,
    gap: 6,
  },
  fallback: { backgroundColor: sky.surfaceSoft, borderRadius: radius.sm, padding: spacing.sm },
  fallbackText: { color: sky.inkMuted, fontFamily: 'monospace', fontSize: 12 },

  vizTitle: { color: sky.ink, fontSize: 13, fontWeight: '700' },

  metricLabel: { color: sky.inkMuted, fontSize: 12.5, fontWeight: '600' },
  metricRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  metricValue: { color: sky.ink, fontSize: 30, fontWeight: '800', lineHeight: 34 },
  metricUnit: { color: sky.ink, fontSize: 16, fontWeight: '600', marginBottom: 3 },
  metricDelta: { fontSize: 13, fontWeight: '700', marginBottom: 5, marginLeft: 4 },
  metricSub: { color: sky.inkMuted, fontSize: 12 },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 56, color: sky.inkMuted, fontSize: 12 },
  barTrack: { flex: 1, height: 12, borderRadius: 999, backgroundColor: 'rgba(20,40,70,0.08)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: sky.brand },
  barFlag: { backgroundColor: '#E8833A' },
  barValue: { width: 48, textAlign: 'right', color: sky.ink, fontSize: 12.5, fontWeight: '700' },

  gaugeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gaugeStatus: { fontSize: 15, fontWeight: '800' },
  gaugeTrack: { height: 12, borderRadius: 999, backgroundColor: 'rgba(20,40,70,0.08)', overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 999 },
});
