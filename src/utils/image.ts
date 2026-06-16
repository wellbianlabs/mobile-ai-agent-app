import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { ImageAsset } from '@/types/payload';

/**
 * 디바이스 단 1차 이미지 압축 (지침서 §1 Image Asset State).
 *
 * 카메라 촬영 결과와 갤러리 선택 결과 모두 이 함수를 통해 일관되게
 * 리사이즈/압축한다. 원본을 그대로 올리면 페이로드가 비대해지므로,
 * 업로드 전에 긴 변 기준 maxDimension 으로 줄이고 JPEG 로 인코딩한다.
 *
 * SDK 56: 구버전 manipulateAsync / FileSystem.getInfoAsync 는 deprecated 되어
 * 새 ImageManipulator 컨텍스트 API 를 사용한다.
 */

/** 압축 후 이미지 긴 변의 최대 픽셀. */
const MAX_DIMENSION = 1600;
/** JPEG 압축 품질(0~1). */
const COMPRESS_QUALITY = 0.7;

export interface RawImage {
  uri: string;
  width?: number;
  height?: number;
}

export async function compressImage(
  input: RawImage,
  source: ImageAsset['source'],
): Promise<ImageAsset> {
  // 긴 변이 MAX_DIMENSION 을 넘을 때만 리사이즈(업스케일 방지).
  const longest = Math.max(input.width ?? 0, input.height ?? 0);

  const context = ImageManipulator.manipulate(input.uri);
  if (longest > MAX_DIMENSION) {
    if ((input.width ?? 0) >= (input.height ?? 0)) {
      context.resize({ width: MAX_DIMENSION });
    } else {
      context.resize({ height: MAX_DIMENSION });
    }
  }

  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    compress: COMPRESS_QUALITY,
    format: SaveFormat.JPEG,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: 'image/jpeg',
    source,
  };
}
