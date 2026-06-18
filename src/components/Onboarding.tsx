import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SkyBackground } from '@/components/SkyBackground';
import { radius, sky, spacing } from '@/theme/tokens';
import { getSkyScene } from '@/utils/skyTheme';

interface Props {
  /** 권한 요청(혹은 건너뛰기) 완료 후 호출 — 온보딩 완료로 영속화한다. */
  onDone: () => void;
}

const ITEMS: Array<{ icon: keyof typeof Feather.glyphMap; title: string; desc: string }> = [
  { icon: 'map-pin', title: '위치', desc: '현재 위치의 날씨를 바로 알려드려요.' },
  { icon: 'camera', title: '카메라', desc: '사진을 찍어 바로 질문에 첨부해요.' },
  { icon: 'image', title: '사진', desc: '갤러리 이미지를 분석·번역할 수 있어요.' },
];

/**
 * 첫 실행 권한 온보딩.
 * 위치·카메라·사진 동의를 한 번에 받고, 이후에는 자동으로 적용된다(다시 묻지 않음).
 */
export function Onboarding({ onDone }: Props) {
  const [busy, setBusy] = useState(false);

  const requestAll = async () => {
    setBusy(true);
    try {
      // 순차 요청(각각 실패해도 계속 진행 — 거부는 추후 사용 시 안내).
      try {
        await Location.requestForegroundPermissionsAsync();
      } catch {}
      try {
        await ImagePicker.requestCameraPermissionsAsync();
      } catch {}
      try {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      } catch {}
    } finally {
      setBusy(false);
      onDone();
    }
  };

  return (
    <SkyBackground scene={getSkyScene(new Date().getHours())}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.content}>
          <View style={styles.badge}>
            <Feather name="cloud" size={26} color="#fff" />
          </View>
          <Text style={styles.eyebrow}>WELLBIAN AI · KWEATHER</Text>
          <Text style={styles.title}>날씨를 비즈니스의{'\n'}전략 자산으로</Text>
          <Text style={styles.subtitle}>
            케이웨더 기반 날씨 AI 에이전트가 날씨를 사업의 의사결정 자산으로 바꿔드려요.{'\n'}정확한 위치 분석을 위해 아래 권한이 필요해요 — 동의는 한 번만.
          </Text>

          <View style={styles.list}>
            {ITEMS.map((it) => (
              <View key={it.title} style={styles.item}>
                <View style={styles.itemIcon}>
                  <Feather name={it.icon} size={18} color="#fff" />
                </View>
                <View style={styles.itemText}>
                  <Text style={styles.itemTitle}>{it.title}</Text>
                  <Text style={styles.itemDesc}>{it.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.cta} onPress={requestAll} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={sky.brand} />
            ) : (
              <Text style={styles.ctaText}>권한 허용하고 시작하기</Text>
            )}
          </Pressable>
          <Pressable onPress={onDone} disabled={busy} hitSlop={8}>
            <Text style={styles.skip}>나중에 설정하기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: sky.glass,
    borderWidth: 1,
    borderColor: sky.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#fff',
    opacity: 0.85,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
  },
  title: {
    color: sky.heroText,
    fontFamily: 'serif',
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  subtitle: { color: sky.heroDim, fontSize: 15, lineHeight: 22 },
  list: { gap: spacing.md, marginTop: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: sky.chip,
    borderWidth: 1,
    borderColor: sky.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1 },
  itemTitle: { color: sky.heroText, fontSize: 16, fontWeight: '600' },
  itemDesc: { color: sky.heroDim, fontSize: 13.5, marginTop: 1 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  cta: {
    backgroundColor: '#fff',
    borderRadius: radius.pill,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16243A',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ctaText: { color: sky.brand, fontSize: 16, fontWeight: '700' },
  skip: { color: sky.heroDim, fontSize: 14, textAlign: 'center' },
});
