import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { ImageBackground, type ImageSourcePropType, StyleSheet, View } from 'react-native';

import { IS_WEB } from '@/theme/tokens';
import type { SkyBgKey, SkyScene } from '@/utils/skyTheme';

interface Props {
  scene: SkyScene;
  children: ReactNode;
}

/** 시간대·날씨별 하늘 배경 이미지(차분한 그라데이션 + 부드러운 해/달). */
const BG: Record<SkyBgKey, ImageSourcePropType> = {
  'day-clear': require('../../assets/sky/day-clear.png'),
  'day-cloudy': require('../../assets/sky/day-cloudy.png'),
  'night-clear': require('../../assets/sky/night-clear.png'),
  'night-cloudy': require('../../assets/sky/night-cloudy.png'),
  rain: require('../../assets/sky/rain.png'),
  'rain-night': require('../../assets/sky/rain-night.png'),
  dawn: require('../../assets/sky/dawn.png'),
  sunset: require('../../assets/sky/sunset.png'),
};

/**
 * 배경 이미지 위에 상/하단 대비 스크림을 얹고 children 을 올린다.
 * 절차적 구름/해 애니메이션을 제거해 텍스트 가독성을 확보(이미지로 대체).
 */
export function SkyBackground({ scene, children }: Props) {
  // 웹: 배경 이미지/스크림 없이 깔끔한 모노 배경(일반 LLM 스타일).
  if (IS_WEB) {
    return <View style={styles.webBg}>{children}</View>;
  }
  return (
    <ImageBackground source={BG[scene.bg]} style={styles.fill} resizeMode="cover">
      {scene.scrimTop > 0 && (
        <LinearGradient
          colors={[`rgba(8,16,34,${scene.scrimTop})`, 'rgba(8,16,34,0)']}
          style={styles.scrimTop}
          pointerEvents="none"
        />
      )}
      {scene.scrimBottom > 0 && (
        <LinearGradient
          colors={['rgba(8,16,34,0)', `rgba(8,16,34,${scene.scrimBottom})`]}
          style={styles.scrimBottom}
          pointerEvents="none"
        />
      )}
      <View style={styles.content}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  webBg: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1 },
  scrimTop: { position: 'absolute', top: 0, left: 0, right: 0, height: '46%' },
  scrimBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '42%' },
});
