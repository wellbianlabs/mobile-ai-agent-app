import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { colors, spacing } from '@/theme/tokens';

interface Props {
  /** 닫기(취소). */
  onClose: () => void;
  /** 무음 자동 종료 후 확정된 검색어 전달 → 자동 검색. */
  onSearch: (query: string) => void;
}

/**
 * 풀스크린 음성 검색 오버레이 (YouTube/Google 음성검색 스타일).
 *
 * 마운트 즉시 인식 시작 → 실시간 문자화 → 무음 감지 시 자동으로
 * '검색 중' 상태로 전환 후 onSearch 호출. 이 컴포넌트는 visible 일 때만
 * 부모에서 마운트하세요(마운트=시작, 언마운트=중단).
 */
export function VoiceSearchOverlay({ onClose, onSearch }: Props) {
  const [searching, setSearching] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const orb = useRef(new Animated.Value(1)).current;

  const { transcript, listening, volume, start, abort } = useVoiceSearch({
    onComplete: (query) => {
      setSearching(true);
      // '검색 중' 상태를 잠깐 보여준 뒤 검색 실행.
      setTimeout(() => onSearch(query), 650);
    },
    onError: () => onClose(),
  });

  // 마운트 시 인식 시작, 언마운트 시 중단.
  useEffect(() => {
    void start();
    return () => abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 펄스 링 애니메이션(무한 루프).
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1900,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // 입력 레벨에 따라 마이크 오브 스케일 반응.
  useEffect(() => {
    Animated.spring(orb, {
      toValue: 1 + volume * 0.18,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  }, [volume, orb]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0] });

  return (
    <Modal visible animationType="fade" transparent={false} statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.top}>
          <Pressable style={styles.close} hitSlop={10} onPress={onClose} accessibilityLabel="닫기">
            <Feather name="x" size={18} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={[styles.transcript, !transcript && styles.transcriptEmpty]}>
            {transcript || '말씀하세요'}
          </Text>
        </View>

        <View style={styles.foot}>
          {!searching && <Equalizer active={listening} />}
          <Animated.View style={[styles.orb, { transform: [{ scale: searching ? 1 : orb }] }]}>
            {!searching && (
              <Animated.View
                style={[styles.pulse, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]}
              />
            )}
            {searching ? (
              <Spinner />
            ) : (
              <Feather name="mic" size={30} color="#1A1306" />
            )}
          </Animated.View>
          <Text style={styles.hint}>{searching ? '검색 중…' : '듣고 있어요'}</Text>
        </View>
      </View>
    </Modal>
  );
}

/** 골드 이퀄라이저 바(5개) — 듣는 동안 위아래로 바운스. */
function Equalizer({ active }: { active: boolean }) {
  const bars = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0.25))).current;

  useEffect(() => {
    if (!active) return;
    const delays = [0, 180, 360, 180, 60];
    const loops = bars.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delays[i]),
          Animated.timing(v, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(v, { toValue: 0.25, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, bars]);

  return (
    <View style={styles.eq}>
      {bars.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.eqBar,
            { height: v.interpolate({ inputRange: [0, 1], outputRange: [10, 40] }) },
          ]}
        />
      ))}
    </View>
  );
}

/** 검색 중 스피너. */
function Spinner() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  top: {
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  transcript: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '300',
    lineHeight: 38,
    letterSpacing: 0.2,
  },
  transcriptEmpty: {
    color: colors.faint,
  },
  foot: {
    paddingBottom: 70,
    alignItems: 'center',
    gap: spacing.xl,
  },
  eq: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
  },
  eqBar: {
    width: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  orb: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.accentSoft,
  },
  hint: {
    color: colors.faint,
    fontSize: 13,
    fontWeight: '300',
    letterSpacing: 0.6,
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: colors.accentSoft,
    borderTopColor: '#1A1306',
  },
});
