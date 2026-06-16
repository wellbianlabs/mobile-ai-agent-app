import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

import type { SkyScene } from '@/utils/skyTheme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  scene: SkyScene;
  children: ReactNode;
}

/**
 * 시간대·날씨 반응형 하늘 배경.
 * 그라데이션 + 해/달 글로우 + 천천히 떠다니는 구름 레이어 위에 children 을 얹는다.
 * (네트워크/이미지 의존 없이 항상 안정적으로 렌더링)
 */
export function SkyBackground({ scene, children }: Props) {
  // 구름 레이아웃은 장면(개수/색/투명도)이 바뀔 때만 재계산.
  const clouds = useMemo(() => {
    const arr: CloudConfig[] = [];
    const count = scene.cloudCount;
    for (let i = 0; i < count; i++) {
      arr.push({
        key: `${scene.phase}-${i}`,
        top: SCREEN_H * (0.08 + ((i * 0.6131 + 0.05) % 1) * 0.5),
        scale: 1.0 + ((i * 0.53 + 0.2) % 1) * 1.1,
        duration: 46000 + ((i * 9000) % 34000),
        delay: i * 3200,
        startPct: ((i * 0.37 + 0.1) % 1),
        color: scene.cloudColor,
        opacity: scene.cloudOpacity * (0.75 + ((i * 0.4) % 1) * 0.25),
      });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.phase, scene.cloudCount, scene.cloudColor, scene.cloudOpacity]);

  return (
    <LinearGradient colors={scene.colors} style={styles.fill}>
      {/* 해 / 달 */}
      {scene.orb.kind !== 'none' && (
        <Orb
          color={scene.orb.color}
          glow={scene.orb.glow}
          size={scene.orb.size}
          left={SCREEN_W * scene.orb.xPct - scene.orb.size / 2}
          top={SCREEN_H * scene.orb.yPct - scene.orb.size / 2}
        />
      )}

      {/* 구름 */}
      {clouds.map(({ key, ...c }) => (
        <Cloud key={key} {...c} />
      ))}

      {/* 상단 스크림(텍스트 대비) */}
      {scene.scrim > 0 && (
        <LinearGradient
          colors={[`rgba(10,20,40,${scene.scrim})`, 'rgba(10,20,40,0)']}
          style={[styles.scrim, { pointerEvents: 'none' }]}
        />
      )}

      <View style={styles.content}>{children}</View>
    </LinearGradient>
  );
}

function Orb({
  color,
  glow,
  size,
  left,
  top,
}: {
  color: string;
  glow: string;
  size: number;
  left: number;
  top: number;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.8] });

  return (
    <View style={[styles.orbWrap, { left, top, width: size, height: size, pointerEvents: 'none' }]}>
      <Animated.View
        style={[
          styles.halo,
          {
            width: size * 2.4,
            height: size * 2.4,
            borderRadius: size * 1.2,
            backgroundColor: glow,
            left: -size * 0.7,
            top: -size * 0.7,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <View
        style={[
          styles.halo,
          { width: size * 1.5, height: size * 1.5, borderRadius: size * 0.75, backgroundColor: glow, left: -size * 0.25, top: -size * 0.25, opacity: 0.5 },
        ]}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

interface CloudConfig {
  key: string;
  top: number;
  scale: number;
  duration: number;
  delay: number;
  startPct: number;
  color: string;
  opacity: number;
}

function Cloud({ top, scale, duration, delay, startPct, color, opacity }: Omit<CloudConfig, 'key'>) {
  const t = useRef(new Animated.Value(startPct)).current;
  useEffect(() => {
    const run = () => {
      t.setValue(0);
      Animated.timing(t, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) run();
      });
    };
    run();
    return () => t.stopAnimation();
  }, [t, duration, delay]);

  const travel = SCREEN_W + 260;
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-260, travel] });

  return (
    <Animated.View
      style={[styles.cloud, { top, opacity, transform: [{ translateX }, { scale }], pointerEvents: 'none' }]}
    >
      {/* 부드러운 외곽 글로우(엣지 softening) */}
      <View style={[styles.glow, { backgroundColor: color }]} />
      {/* 뭉게뭉게 퍼프 */}
      <View style={[styles.puff, { width: 78, height: 58, backgroundColor: color, left: 4, bottom: 2 }]} />
      <View style={[styles.puff, { width: 104, height: 84, backgroundColor: color, left: 42, bottom: 2 }]} />
      <View style={[styles.puff, { width: 92, height: 72, backgroundColor: color, left: 110, bottom: 2 }]} />
      <View style={[styles.puff, { width: 72, height: 54, backgroundColor: color, left: 170, bottom: 2 }]} />
      <View style={[styles.puffBase, { backgroundColor: color }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_H * 0.4 },
  orbWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  cloud: { position: 'absolute', left: 0, width: 250, height: 96 },
  glow: { position: 'absolute', left: -10, bottom: -6, width: 270, height: 84, borderRadius: 999, opacity: 0.4 },
  puff: { position: 'absolute', borderRadius: 999 },
  puffBase: { position: 'absolute', left: 8, bottom: 0, width: 226, height: 40, borderRadius: 999 },
});
