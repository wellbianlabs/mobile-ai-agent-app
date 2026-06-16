import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { RawImage } from '@/utils/image';
import { colors, radius, spacing } from '@/theme/tokens';

interface Props {
  onClose: () => void;
  /** 촬영된 원본 사진(압축 전)을 부모로 전달. 부모가 압축·첨부·닫기를 처리. */
  onCapture: (photo: RawImage) => void | Promise<void>;
}

/**
 * 앱 내 카메라 촬영 모드.
 *
 * 사진 버튼 → 이 풀스크린 라이브 뷰파인더로 전환 → 셔터로 촬영 →
 * onCapture(원본) → (부모에서 디바이스 압축 후 첨부) → 닫기.
 * visible 일 때만 부모에서 마운트하세요(마운트=카메라 활성).
 */
export function CameraCaptureOverlay({ onClose, onCapture }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [busy, setBusy] = useState(false);
  const camRef = useRef<CameraView>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const shoot = async () => {
    if (!camRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await camRef.current.takePictureAsync({ quality: 1, skipProcessing: false });
      // 셔터 플래시 연출.
      flashAnim.setValue(1);
      Animated.timing(flashAnim, { toValue: 0, duration: 340, useNativeDriver: true }).start();
      if (photo?.uri) {
        await onCapture({ uri: photo.uri, width: photo.width, height: photo.height });
      }
    } catch {
      // 촬영 실패는 조용히 무시(다시 시도 가능).
    } finally {
      setBusy(false);
    }
  };

  const granted = permission?.granted ?? false;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        {granted ? (
          <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing={facing} flash={flash} />
        ) : (
          <View style={styles.perm}>
            <Feather name="camera-off" size={28} color={colors.textMuted} />
            <Text style={styles.permText}>카메라 권한이 필요합니다.</Text>
            <Pressable style={styles.permBtn} onPress={() => requestPermission()}>
              <Text style={styles.permBtnText}>권한 허용</Text>
            </Pressable>
          </View>
        )}

        {/* 구도 가이드(삼분할 + 포커스) */}
        {granted && (
          <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
            <View style={[styles.vline, { left: '33.33%' }]} />
            <View style={[styles.vline, { left: '66.66%' }]} />
            <View style={[styles.hline, { top: '33.33%' }]} />
            <View style={[styles.hline, { top: '66.66%' }]} />
            <View style={styles.focus} />
          </View>
        )}

        {/* 셔터 플래시 */}
        <Animated.View style={[styles.flash, { opacity: flashAnim, pointerEvents: 'none' }]} />

        {/* 상단 바 */}
        <View style={styles.top}>
          <Pressable style={styles.topBtn} hitSlop={8} onPress={onClose} accessibilityLabel="닫기">
            <Feather name="x" size={18} color="#fff" />
          </Pressable>
          <Pressable
            style={styles.topBtn}
            hitSlop={8}
            onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
            accessibilityLabel="플래시"
          >
            <Feather name={flash === 'on' ? 'zap' : 'zap-off'} size={18} color="#fff" />
          </Pressable>
        </View>

        {granted && <Text style={styles.hint}>피사체를 화면에 담고 촬영하세요</Text>}

        {/* 하단 컨트롤 */}
        <View style={styles.bottom}>
          <View style={styles.sidePlaceholder} />
          <Pressable
            style={[styles.shutter, busy && styles.shutterBusy]}
            onPress={shoot}
            disabled={!granted || busy}
            accessibilityLabel="촬영"
          />
          <Pressable
            style={styles.side}
            hitSlop={8}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            accessibilityLabel="카메라 전환"
          >
            <Feather name="refresh-cw" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  perm: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  permText: { color: colors.text, fontSize: 15, fontWeight: '300' },
  permBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  permBtnText: { color: '#1A1306', fontWeight: '600' },

  vline: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  hline: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  focus: {
    position: 'absolute',
    top: '46%',
    left: '50%',
    width: 116,
    height: 116,
    marginLeft: -58,
    marginTop: -58,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 6,
  },

  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', zIndex: 4 },

  top: {
    position: 'absolute',
    top: 50,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    zIndex: 3,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.66)',
    fontSize: 12,
    fontWeight: '300',
  },
  bottom: {
    position: 'absolute',
    bottom: 54,
    left: 32,
    right: 32,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidePlaceholder: { width: 46, height: 46 },
  side: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  shutterBusy: { opacity: 0.6 },
});
