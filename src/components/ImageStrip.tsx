import { Feather } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ImageAsset } from '@/types/payload';
import { colors, radius, spacing } from '@/theme/tokens';

interface Props {
  images: ImageAsset[];
  onRemove: (uri: string) => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 첨부된 이미지 썸네일 가로 스트립 + 개별 삭제. */
export function ImageStrip({ images, onRemove }: Props) {
  if (images.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {images.map((img) => (
        <View key={img.uri} style={styles.thumbWrap}>
          <Image source={{ uri: img.uri }} style={styles.thumb} />
          <Pressable
            style={styles.removeBtn}
            hitSlop={8}
            onPress={() => onRemove(img.uri)}
            accessibilityLabel="이미지 삭제"
          >
            <Feather name="x" size={13} color={colors.text} />
          </Pressable>
          {!!img.bytes && (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{formatBytes(img.bytes)}</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const THUMB = 72;

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeTxt: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 1,
    alignItems: 'center',
  },
  badgeTxt: {
    color: colors.text,
    fontSize: 9,
  },
});
