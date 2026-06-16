import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';

import type { ImageAsset } from '@/types/payload';
import { compressImage } from '@/utils/image';

/**
 * 갤러리 선택 + 디바이스 단 1차 압축 훅 (지침서 §1 Image Asset State).
 *
 * 카메라 촬영은 앱 내 카메라 모드(CameraCaptureOverlay)에서 처리하므로,
 * 이 훅은 갤러리 선택만 담당한다. 압축은 공용 compressImage 로 일관 처리.
 */

export interface UseImageCaptureOptions {
  onError?: (message: string) => void;
}

export interface UseImageCapture {
  pickFromLibrary: () => Promise<ImageAsset | null>;
}

export function useImageCapture(options: UseImageCaptureOptions = {}): UseImageCapture {
  const { onError } = options;

  const pickFromLibrary = useCallback(async (): Promise<ImageAsset | null> => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        onError?.('사진 보관함 권한이 거부되었습니다. 설정에서 허용해 주세요.');
        return null;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        // SDK 56: MediaTypeOptions 는 deprecated → MediaType 배열 사용.
        mediaTypes: ['images'],
        quality: 1, // 원본 품질로 받고 압축은 우리가 일관되게 수행.
        exif: false,
      });
      if (res.canceled || !res.assets?.[0]) return null;
      return await compressImage(res.assets[0], 'library');
    } catch (e) {
      onError?.(`이미지 선택 실패: ${(e as Error).message}`);
      return null;
    }
  }, [onError]);

  return { pickFromLibrary };
}
