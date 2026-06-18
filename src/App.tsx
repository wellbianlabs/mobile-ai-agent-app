import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ComposerBar } from '@/components/ComposerBar';
import { ConversationView } from '@/components/ConversationView';
import { Onboarding } from '@/components/Onboarding';
import { WeatherHero } from '@/components/WeatherHero';
import { configureNotifications } from '@/services/notifications';
import { useMultimodalStore } from '@/store/multimodalStore';
import { sky } from '@/theme/tokens';

const ONBOARD_KEY = 'onboarded.v1';

/**
 * 앱 셸 — 나만의 모바일 AI 비서.
 *   1) 첫 실행: 권한 온보딩(위치·카메라·사진) → 영속화 후 다시 안 물음.
 *   2) 홈: 날씨 히어로(현재 위치 날씨 요약 + 입력 바).
 *   3) 질문하면 대화 화면으로 전환(라이트 테마).
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

function AppInner() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const turns = useMultimodalStore((s) => s.turns);
  const clearTurns = useMultimodalStore((s) => s.clearTurns);
  const place = useMultimodalStore((s) => s.location?.place ?? null);

  useEffect(() => {
    void configureNotifications(); // 포그라운드 알림 배너 핸들러(아침 브리핑, Expo Go 면 no-op)
    AsyncStorage.getItem(ONBOARD_KEY)
      .then((v) => setOnboarded(v === '1'))
      .catch(() => setOnboarded(false));
  }, []);

  const finishOnboarding = () => {
    AsyncStorage.setItem(ONBOARD_KEY, '1').catch(() => undefined);
    setOnboarded(true);
  };

  if (onboarded === null) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!onboarded) {
    return (
      <>
        <StatusBar style="light" />
        <Onboarding onDone={finishOnboarding} />
      </>
    );
  }

  // 홈(날씨 히어로) — 대화 턴이 없을 때.
  if (turns.length === 0) {
    return (
      <>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <WeatherHero />
        </KeyboardAvoidingView>
      </>
    );
  }

  // 대화 화면.
  return (
    <SafeAreaView style={styles.chatSafe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable onPress={clearTurns} hitSlop={8} style={styles.homeBtn} accessibilityLabel="홈으로">
            <Feather name="chevron-left" size={24} color={sky.ink} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {place ? `${place} · 비서` : '비서'}
          </Text>
          <Pressable onPress={clearTurns} hitSlop={8} accessibilityLabel="새로 시작">
            <Feather name="home" size={20} color={sky.inkMuted} />
          </Pressable>
        </View>
        <ConversationView />
        <ComposerBar />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  splash: { flex: 1, backgroundColor: sky.brand, alignItems: 'center', justifyContent: 'center' },
  chatSafe: { flex: 1, backgroundColor: sky.surfaceSoft },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: sky.surface,
    borderBottomColor: sky.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  homeBtn: { marginLeft: -4 },
  headerTitle: { flex: 1, color: sky.ink, fontSize: 16, fontWeight: '600' },
});
