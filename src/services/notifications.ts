import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * 능동형 아침 날씨 브리핑 — 로컬 알림 서비스.
 *
 * ⚠️ 런타임 주의: `expo-notifications`는 SDK 53+부터 **Expo Go에서 미지원**(특히 Android).
 * 따라서 실제 알림은 **개발 빌드/APK**에서만 동작한다. Expo Go에서는 스케줄 호출이
 * 조용히 실패(false 반환)하도록 try/catch 로 감싼다. 코드는 빌드 시 그대로 활성화된다.
 */

const BRIEFING_ID = 'morning-briefing';
const ANDROID_CHANNEL = 'briefing';

let handlerConfigured = false;

/** 포그라운드에서도 알림 배너가 뜨도록 핸들러 설정(앱 시작 시 1회). */
export function configureNotifications(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** 알림 권한 확보(이미 있으면 즉시 true, 없으면 요청). */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.canAskAgain === false) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export interface BriefingTime {
  hour: number;
  minute: number;
}
export interface BriefingContent {
  title: string;
  body: string;
}

/**
 * 매일 지정 시각에 울리는 아침 브리핑 알림을 (재)예약한다.
 * @returns 예약 성공 여부. 권한 거부/Expo Go 미지원 시 false.
 */
export async function scheduleMorningBriefing(
  time: BriefingTime,
  content: BriefingContent,
): Promise<boolean> {
  try {
    configureNotifications();
    const granted = await ensureNotificationPermission();
    if (!granted) return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: '아침 날씨 브리핑',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // 기존 예약을 지우고 최신 내용으로 다시 건다.
    await Notifications.cancelScheduledNotificationAsync(BRIEFING_ID).catch(() => undefined);
    await Notifications.scheduleNotificationAsync({
      identifier: BRIEFING_ID,
      content: {
        title: content.title,
        body: content.body,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      },
    });
    return true;
  } catch {
    // Expo Go(미지원)/기타 환경 → 조용히 실패. 개발 빌드에서 정상 동작.
    return false;
  }
}

/** 예약된 아침 브리핑을 취소. */
export async function cancelMorningBriefing(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(BRIEFING_ID);
  } catch {
    /* noop */
  }
}
