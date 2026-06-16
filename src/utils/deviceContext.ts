import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

import type { DeviceKind, NetworkType } from '@/types/payload';

/**
 * 와이어 페이로드 meta 를 채우기 위한 디바이스/네트워크 컨텍스트 수집.
 * (지침서: 서버 단 타임라인 정렬 및 대역폭 기반 처리 최적화 컨텍스트)
 */

export function getDeviceKind(): DeviceKind {
  // 계약상 iOS|Android 만 허용. web 등은 Android 로 보수적 매핑.
  return Platform.OS === 'ios' ? 'iOS' : 'Android';
}

/**
 * 네트워크 유형 판별.
 *  - wifi/ethernet → WiFi
 *  - cellular + 5g → 5G, 그 외 셀룰러 → LTE
 *  - 알 수 없음/오프라인 → LTE (저대역 보수적 가정)
 *
 * expo-network 는 5G/LTE 를 구분하지 못하므로 NetInfo 의
 * cellularGeneration 을 사용합니다.
 */
export async function getNetworkType(): Promise<NetworkType> {
  try {
    const state = await NetInfo.fetch();
    if (state.type === 'wifi' || state.type === 'ethernet') return 'WiFi';
    if (state.type === 'cellular') {
      const gen = state.details?.cellularGeneration;
      return gen === '5g' ? '5G' : 'LTE';
    }
    return 'LTE';
  } catch {
    return 'LTE';
  }
}
