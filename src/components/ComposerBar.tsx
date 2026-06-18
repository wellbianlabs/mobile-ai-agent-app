import { Feather } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Suspense, lazy, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CameraCaptureOverlay } from '@/components/CameraCaptureOverlay';
import { useImageCapture } from '@/hooks/useImageCapture';
import { useSendMessage } from '@/hooks/useSendMessage';
import {
  MAX_IMAGES,
  selectHasContent,
  useMultimodalStore,
} from '@/store/multimodalStore';
import { radius, sky, spacing } from '@/theme/tokens';
import { compressImage, type RawImage } from '@/utils/image';

/**
 * 음성 검색은 네이티브 모듈(expo-speech-recognition)을 쓰므로 Expo Go 에서는 동작하지 않는다.
 * 지연 로드해 Expo Go 에서 앱이 크래시하지 않도록 하고, 개발 빌드/실기기에서만 실제 로드한다.
 */
const VoiceSearchOverlay = lazy(() =>
  import('@/components/VoiceSearchOverlay').then((m) => ({ default: m.VoiceSearchOverlay })),
);
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * 라이트(스카이) 테마 입력 바.
 * 흰색 pill 안에 텍스트 + 갤러리·카메라·마이크, 내용이 있으면 전송 버튼.
 * 음성/카메라는 기존 풀스크린 오버레이를 재사용한다.
 */
export function ComposerBar() {
  const text = useMultimodalStore((s) => s.text);
  const images = useMultimodalStore((s) => s.images);
  const voice = useMultimodalStore((s) => s.voice);
  const hasContent = useMultimodalStore(selectHasContent);

  const setText = useMultimodalStore((s) => s.setText);
  const addImage = useMultimodalStore((s) => s.addImage);
  const removeImage = useMultimodalStore((s) => s.removeImage);
  const clearVoice = useMultimodalStore((s) => s.clearVoice);

  const { send, sending } = useSendMessage();

  const [notice, setNotice] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const { pickFromLibrary } = useImageCapture({ onError: setNotice });

  const imagesFull = images.length >= MAX_IMAGES;

  const handleSend = useCallback(() => {
    if (!hasContent || sending) return;
    setNotice(null);
    void send();
  }, [hasContent, sending, send]);

  const handleVoiceSearch = useCallback(
    (q: string) => {
      setVoiceOpen(false);
      const query = q.trim();
      if (query) void send(query);
    },
    [send],
  );

  const handleCamera = useCallback(() => {
    if (imagesFull) {
      setNotice(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`);
      return;
    }
    setNotice(null);
    setCameraOpen(true);
  }, [imagesFull]);

  const handleCapture = useCallback(
    async (photo: RawImage) => {
      setCameraOpen(false);
      try {
        addImage(await compressImage(photo, 'camera'));
      } catch (e) {
        setNotice(`촬영 처리 실패: ${(e as Error).message}`);
      }
    },
    [addImage],
  );

  const handleLibrary = useCallback(async () => {
    if (imagesFull) {
      setNotice(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`);
      return;
    }
    const asset = await pickFromLibrary();
    if (asset) {
      addImage(asset);
      setNotice(null);
    }
  }, [imagesFull, pickFromLibrary, addImage]);

  return (
    <View style={styles.wrap}>
      {/* 첨부 미리보기 */}
      {(images.length > 0 || voice) && (
        <View style={styles.previews}>
          {images.map((img) => (
            <View key={img.uri} style={styles.thumb}>
              <Image source={{ uri: img.uri }} style={styles.thumbImg} />
              <Pressable style={styles.thumbX} hitSlop={6} onPress={() => removeImage(img.uri)}>
                <Feather name="x" size={12} color="#fff" />
              </Pressable>
            </View>
          ))}
          {voice && (
            <Pressable style={styles.voiceChip} onPress={clearVoice}>
              <Feather name="mic" size={13} color={sky.brand} />
              <Text style={styles.voiceChipText}>음성</Text>
              <Feather name="x" size={12} color={sky.inkMuted} />
            </Pressable>
          )}
        </View>
      )}

      {notice && <Text style={styles.notice}>{notice}</Text>}

      {/* 입력 카드 — 위: 전체 폭 텍스트 / 아래: 아이콘(갤러리·촬영·음성) + 전송 */}
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          editable={!sending}
          placeholder="무엇이든 물어보세요…"
          placeholderTextColor={sky.inkFaint}
          multiline
          textAlignVertical="top"
        />

        <View style={styles.actions}>
          <View style={styles.leftIcons}>
            <IconBtn icon="image" onPress={handleLibrary} disabled={sending || imagesFull} />
            <IconBtn icon="camera" onPress={handleCamera} disabled={sending || imagesFull} />
            <IconBtn
              icon="mic"
              onPress={() =>
                IS_EXPO_GO
                  ? setNotice('음성 입력은 개발 빌드(APK)에서 지원돼요. Expo Go에선 텍스트·사진을 이용해 주세요.')
                  : setVoiceOpen(true)
              }
              disabled={sending}
            />
          </View>

          <Pressable
            onPress={handleSend}
            disabled={!hasContent || sending}
            style={[styles.send, (!hasContent || sending) && styles.sendDisabled]}
            accessibilityLabel="전송"
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="arrow-up" size={22} color={hasContent ? '#fff' : sky.inkFaint} />
            )}
          </Pressable>
        </View>
      </View>

      {voiceOpen && !IS_EXPO_GO && (
        <Suspense fallback={null}>
          <VoiceSearchOverlay onClose={() => setVoiceOpen(false)} onSearch={handleVoiceSearch} />
        </Suspense>
      )}
      {cameraOpen && <CameraCaptureOverlay onClose={() => setCameraOpen(false)} onCapture={handleCapture} />}
    </View>
  );
}

function IconBtn({
  icon,
  onPress,
  disabled,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={[styles.iconBtn, disabled && styles.iconDisabled]}
    >
      <Feather name={icon} size={21} color={sky.inkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 36, gap: spacing.sm },
  previews: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { position: 'relative' },
  thumbImg: { width: 52, height: 52, borderRadius: radius.sm, borderWidth: 1, borderColor: sky.border },
  thumbX: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: sky.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: sky.border,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  voiceChipText: { color: sky.ink, fontSize: 13 },
  notice: { color: sky.warn, fontSize: 12, paddingHorizontal: spacing.xs },

  // 입력 카드(전체 폭) — 위: 텍스트 / 아래: 아이콘 + 전송
  card: {
    backgroundColor: sky.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: sky.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    shadowColor: '#16243A',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  input: {
    width: '100%',
    color: sky.ink,
    fontSize: 17,
    lineHeight: 23,
    minHeight: 46,
    maxHeight: 150,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  leftIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconDisabled: { opacity: 0.4 },
  send: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: sky.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: sky.brand,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sendDisabled: { backgroundColor: sky.surfaceSoft, shadowOpacity: 0, elevation: 0 },
});
