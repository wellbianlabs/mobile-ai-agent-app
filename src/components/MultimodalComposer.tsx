import { Feather } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CameraCaptureOverlay } from '@/components/CameraCaptureOverlay';
import { ImageStrip } from '@/components/ImageStrip';
import { TextInputField } from '@/components/TextInputField';
import { VoiceClipChip } from '@/components/VoiceClipChip';
import { VoiceSearchOverlay } from '@/components/VoiceSearchOverlay';
import { useImageCapture } from '@/hooks/useImageCapture';
import { compressImage, type RawImage } from '@/utils/image';
import { sendUnifiedPayload } from '@/api/agentClient';
import {
  MAX_IMAGES,
  selectHasContent,
  useMultimodalStore,
} from '@/store/multimodalStore';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * 통합 멀티모달 컴포저 (지침서 §1).
 *
 * Text / Voice / Image 세 입력을 한 화면에서 독립 제어하고,
 * 전송 버튼 하나로 단일 페이로드를 백엔드 에이전트에 보낸다.
 */
export function MultimodalComposer() {
  const text = useMultimodalStore((s) => s.text);
  const voice = useMultimodalStore((s) => s.voice);
  const images = useMultimodalStore((s) => s.images);
  const sendStatus = useMultimodalStore((s) => s.sendStatus);
  const hasContent = useMultimodalStore(selectHasContent);

  const setText = useMultimodalStore((s) => s.setText);
  const clearVoice = useMultimodalStore((s) => s.clearVoice);
  const addImage = useMultimodalStore((s) => s.addImage);
  const removeImage = useMultimodalStore((s) => s.removeImage);
  const setSendStatus = useMultimodalStore((s) => s.setSendStatus);
  const buildPayload = useMultimodalStore((s) => s.buildPayload);
  const resetAll = useMultimodalStore((s) => s.resetAll);
  const startTurn = useMultimodalStore((s) => s.startTurn);
  const resolveTurn = useMultimodalStore((s) => s.resolveTurn);

  const [notice, setNotice] = useState<string | null>(null);
  const [voiceSearchOpen, setVoiceSearchOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const onError = useCallback((message: string) => {
    setNotice(message);
  }, []);

  const { pickFromLibrary } = useImageCapture({ onError });

  const sending = sendStatus === 'sending';
  const imagesFull = images.length >= MAX_IMAGES;

  // 사진 버튼 → 앱 내 카메라 촬영 모드로 전환.
  const handleCamera = useCallback(() => {
    if (imagesFull) {
      setNotice(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`);
      return;
    }
    setNotice(null);
    setCameraOpen(true);
  }, [imagesFull]);

  // 촬영된 원본 → 디바이스 압축 → 첨부 → 카메라 닫기.
  const handleCameraCapture = useCallback(
    async (photo: RawImage) => {
      setCameraOpen(false);
      try {
        const asset = await compressImage(photo, 'camera');
        addImage(asset);
        setNotice(null);
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

  const handleSend = useCallback(async () => {
    if (!hasContent || sending) return;
    setNotice(null);
    setSendStatus('sending');

    const payload = buildPayload();
    const turnId = startTurn({
      question: payload.text || (payload.images.length ? '(이미지 첨부)' : '(음성)'),
      imageCount: payload.images.length,
      hasVoice: payload.voice !== null,
    });

    try {
      const res = await sendUnifiedPayload(payload);
      setSendStatus('success', { requestId: res.requestId ?? null });
      resolveTurn(turnId, {
        status: 'done',
        answer: res.message ?? '(응답 없음)',
        toolsUsed: res.toolsUsed,
        citations: res.citations,
      });
      resetAll();
    } catch (e) {
      const message = (e as Error).message ?? '알 수 없는 오류';
      setSendStatus('error', { error: message });
      resolveTurn(turnId, { status: 'error', error: message });
      setNotice(`전송 실패: ${message}`);
    }
  }, [hasContent, sending, buildPayload, setSendStatus, resetAll, startTurn, resolveTurn]);

  // 음성 검색 결과(문자화된 질의)를 즉시 검색(전송)으로 넘김.
  const submitQuery = useCallback(
    async (query: string) => {
      setVoiceSearchOpen(false);
      const q = query.trim();
      if (!q) return;
      setText(q); // zustand set 은 동기 → 아래 buildPayload 가 최신 text 포함
      setNotice(null);
      setSendStatus('sending');

      const payload = buildPayload();
      const turnId = startTurn({
        question: payload.text || q,
        imageCount: payload.images.length,
        hasVoice: payload.voice !== null,
      });

      try {
        const res = await sendUnifiedPayload(payload);
        setSendStatus('success', { requestId: res.requestId ?? null });
        resolveTurn(turnId, {
          status: 'done',
          answer: res.message ?? '(응답 없음)',
          toolsUsed: res.toolsUsed,
          citations: res.citations,
        });
        resetAll();
      } catch (e) {
        const message = (e as Error).message ?? '알 수 없는 오류';
        setSendStatus('error', { error: message });
        resolveTurn(turnId, { status: 'error', error: message });
        setNotice(`검색 실패: ${message}`);
      }
    },
    [setText, buildPayload, setSendStatus, resetAll, startTurn, resolveTurn],
  );

  return (
    <View style={styles.container}>
      {/* 첨부 미리보기 영역 */}
      {voice && <VoiceClipChip clip={voice} onRemove={clearVoice} />}
      <ImageStrip images={images} onRemove={removeImage} />

      {/* 텍스트 입력 */}
      <TextInputField value={text} onChangeText={setText} editable={!sending} />

      {notice && <Text style={styles.notice}>{notice}</Text>}

      {/* 액션 바 */}
      <View style={styles.actions}>
        <View style={styles.attachGroup}>
          <AttachButton icon="camera" hint="촬영" onPress={handleCamera} disabled={sending || imagesFull} />
          <AttachButton icon="image" hint="갤러리" onPress={handleLibrary} disabled={sending || imagesFull} />
        </View>

        <View style={styles.rightGroup}>
          <Pressable
            onPress={() => setVoiceSearchOpen(true)}
            disabled={sending}
            style={[styles.attach, sending && styles.attachDisabled]}
            accessibilityLabel="음성 검색"
            accessibilityRole="button"
          >
            <Feather name="mic" size={21} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={handleSend}
            disabled={!hasContent || sending}
            style={[styles.send, (!hasContent || sending) && styles.sendDisabled]}
            accessibilityLabel="전송"
            accessibilityRole="button"
          >
            {sending ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Feather name="arrow-up" size={20} color={hasContent ? '#1A1306' : colors.faint} />
            )}
          </Pressable>
        </View>
      </View>

      {voiceSearchOpen && (
        <VoiceSearchOverlay
          onClose={() => setVoiceSearchOpen(false)}
          onSearch={submitQuery}
        />
      )}

      {cameraOpen && (
        <CameraCaptureOverlay
          onClose={() => setCameraOpen(false)}
          onCapture={handleCameraCapture}
        />
      )}
    </View>
  );
}

function AttachButton({
  icon,
  hint,
  onPress,
  disabled,
}: {
  icon: keyof typeof Feather.glyphMap;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.attach, disabled && styles.attachDisabled]}
      accessibilityLabel={hint}
      accessibilityRole="button"
    >
      <Feather name={icon} size={21} color={colors.textMuted} />
    </Pressable>
  );
}

const SEND = 52;

const styles = StyleSheet.create({
  // 글래스 패널: 입력 요소를 하나의 라운드 카드로 묶는다.
  container: {
    gap: spacing.sm,
    margin: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  notice: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '300',
    paddingHorizontal: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  attachGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  rightGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  // 고스트 버튼: 테두리 없이 투명, 아이콘만.
  attach: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachDisabled: {
    opacity: 0.35,
  },
  send: {
    width: SEND,
    height: SEND,
    borderRadius: SEND / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    backgroundColor: colors.accentMuted,
  },
});
