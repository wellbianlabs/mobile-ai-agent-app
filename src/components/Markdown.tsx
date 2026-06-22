import { Fragment, type ReactNode } from 'react';
import { Linking, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { radius, sky, spacing } from '@/theme/tokens';
import { WbViz } from './WbViz';

/**
 * 의존성 없는 경량 마크다운 렌더러.
 * Claude 답변이 내뱉는 흔한 마크다운(헤딩·볼드·이탤릭·인라인코드·코드블록·
 * 순서/비순서 리스트·표·인용·구분선·링크)만 골라 라이트(sky) 테마로 렌더링한다.
 * react-native-markdown-display 미사용 — React 19 / RN 0.85 peer-dep 충돌 회피.
 */
export function Markdown({ text, style }: { text?: string; style?: TextStyle }) {
  const blocks = parseBlocks((text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
  return (
    <View style={styles.root}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} baseStyle={style} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 블록 파싱
// ---------------------------------------------------------------------------

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'hr' }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'viz'; vizType: string; text: string };

function parseBlocks(src: string): Block[] {
  const lines = src.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  const isTableSep = (s: string) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(s) && s.includes('-');

  while (i < lines.length) {
    const line = lines[i];

    // 빈 줄 → 블록 구분
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 코드 펜스 ``` ... ``` (언어 캡처: wb:* 는 인텔리전스 비주얼로 라우팅)
    const fence = line.match(/^\s*```\s*([\w:-]+)?/);
    if (fence) {
      const lang = fence[1] ?? '';
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // 닫는 펜스 소비
      if (lang.startsWith('wb:')) {
        blocks.push({ kind: 'viz', vizType: lang.slice(3), text: body.join('\n') });
      } else {
        blocks.push({ kind: 'code', text: body.join('\n') });
      }
      continue;
    }

    // 헤딩
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }

    // 구분선
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push({ kind: 'hr' });
      i++;
      continue;
    }

    // 표: 현재 줄에 |, 다음 줄이 구분선
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ kind: 'table', header, rows });
      continue;
    }

    // 인용
    if (/^\s*>\s?/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ kind: 'quote', text: body.join('\n') });
      continue;
    }

    // 리스트(순서/비순서) — 연속 항목 수집
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    // 문단 — 빈 줄/블록 경계 전까지 합침
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*```/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) &&
      !/^\s*([-*_])\1{2,}\s*$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ kind: 'paragraph', text: para.join('\n') });
  }

  return blocks;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

// ---------------------------------------------------------------------------
// 블록 렌더
// ---------------------------------------------------------------------------

function Block({ block, baseStyle }: { block: Block; baseStyle?: TextStyle }) {
  switch (block.kind) {
    case 'heading': {
      const hStyle =
        block.level <= 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3;
      return <Text style={[styles.body, hStyle, baseStyle]}>{renderInline(block.text)}</Text>;
    }
    case 'paragraph':
      return <Text style={[styles.body, baseStyle]}>{renderInline(block.text)}</Text>;
    case 'code':
      return (
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>{block.text}</Text>
        </View>
      );
    case 'quote':
      return (
        <View style={styles.quote}>
          <Text style={[styles.body, styles.quoteText, baseStyle]}>
            {renderInline(block.text)}
          </Text>
        </View>
      );
    case 'hr':
      return <View style={styles.hr} />;
    case 'list':
      return (
        <View style={styles.list}>
          {block.items.map((item, idx) => (
            <View key={idx} style={styles.listItem}>
              <Text style={[styles.body, styles.bullet, baseStyle]}>
                {block.ordered ? `${idx + 1}.` : '•'}
              </Text>
              <Text style={[styles.body, styles.listText, baseStyle]}>
                {renderInline(item)}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'table':
      return <Table header={block.header} rows={block.rows} baseStyle={baseStyle} />;
    case 'viz':
      return <WbViz type={block.vizType} raw={block.text} />;
    default:
      return null;
  }
}

function Table({
  header,
  rows,
  baseStyle,
}: {
  header: string[];
  rows: string[][];
  baseStyle?: TextStyle;
}) {
  const cols = header.length;
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeaderRow]}>
        {header.map((cell, i) => (
          <View key={i} style={[styles.tableCell, i < cols - 1 && styles.tableCellBorder]}>
            <Text style={[styles.body, styles.tableHeaderText, baseStyle]}>
              {renderInline(cell)}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={[styles.tableRow, r < rows.length - 1 && styles.tableRowBorder]}>
          {Array.from({ length: cols }).map((_, c) => (
            <View key={c} style={[styles.tableCell, c < cols - 1 && styles.tableCellBorder]}>
              <Text style={[styles.body, styles.tableText, baseStyle]}>
                {renderInline(row[c] ?? '')}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 인라인 렌더 (볼드/이탤릭/코드/링크) — 재귀
// ---------------------------------------------------------------------------

const INLINE = /(`[^`]+`)|(\*\*[\s\S]+?\*\*)|(\[[^\]]+\]\([^)]+\))|(\*[^*\n]+\*)|(_[^_\n]+_)/;

function renderInline(text: string, keyPrefix = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let key = 0;

  while (rest.length > 0) {
    const m = rest.match(INLINE);
    if (!m || m.index === undefined) {
      out.push(<Fragment key={`${keyPrefix}-${key++}`}>{rest}</Fragment>);
      break;
    }
    if (m.index > 0) {
      out.push(<Fragment key={`${keyPrefix}-${key++}`}>{rest.slice(0, m.index)}</Fragment>);
    }
    const token = m[0];
    const k = `${keyPrefix}-${key++}`;

    if (token.startsWith('`')) {
      out.push(
        <Text key={k} style={styles.inlineCode}>
          {token.slice(1, -1)}
        </Text>,
      );
    } else if (token.startsWith('**')) {
      out.push(
        <Text key={k} style={styles.bold}>
          {renderInline(token.slice(2, -2), k)}
        </Text>,
      );
    } else if (token.startsWith('[')) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const label = link ? link[1] : token;
      const url = link ? link[2] : '';
      out.push(
        <Text
          key={k}
          style={styles.link}
          onPress={() => url && Linking.openURL(url).catch(() => undefined)}
        >
          {renderInline(label, k)}
        </Text>,
      );
    } else {
      // *이탤릭* 또는 _이탤릭_
      out.push(
        <Text key={k} style={styles.italic}>
          {renderInline(token.slice(1, -1), k)}
        </Text>,
      );
    }
    rest = rest.slice(m.index + token.length);
  }

  return out;
}

// ---------------------------------------------------------------------------
// 스타일
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  body: { color: sky.ink, fontSize: 15, lineHeight: 23 },

  h1: { fontSize: 20, lineHeight: 27, fontWeight: '700' },
  h2: { fontSize: 18, lineHeight: 25, fontWeight: '700' },
  h3: { fontSize: 16, lineHeight: 23, fontWeight: '700' },

  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  link: { color: sky.brand, textDecorationLine: 'underline' },

  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 13.5,
    color: sky.brand,
    backgroundColor: sky.brandSoft,
  },
  codeBlock: {
    backgroundColor: sky.surfaceSoft,
    borderColor: sky.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  codeText: { fontFamily: 'monospace', fontSize: 13, lineHeight: 19, color: sky.ink },

  quote: {
    borderLeftWidth: 3,
    borderLeftColor: sky.brand,
    paddingLeft: spacing.md,
    paddingVertical: 2,
  },
  quoteText: { color: sky.inkMuted },

  hr: { height: 1, backgroundColor: sky.border, marginVertical: spacing.xs },

  list: { gap: spacing.xs },
  listItem: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bullet: { color: sky.brand, fontWeight: '700', minWidth: 18 },
  listText: { flex: 1 },

  table: {
    borderColor: sky.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  tableRow: { flexDirection: 'row' },
  tableHeaderRow: { backgroundColor: sky.brandSoft },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: sky.border },
  tableCell: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  tableCellBorder: { borderRightWidth: 1, borderRightColor: sky.border },
  tableHeaderText: { fontWeight: '700', fontSize: 13.5 },
  tableText: { fontSize: 13.5, lineHeight: 20 },
});
