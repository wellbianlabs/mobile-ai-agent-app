import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * 능동형 아침 날씨 브리핑 — 로컬 알림 서비스.
 *
 * ⚠️ Expo Go 회피: `expo-notifications`는 SDK 53+부터 Expo Go에서 제거되어,
 * **import 하는 순간(번들 평가 시) 크래시**한다. 따라서 Expo Go 런타임에서는
 * 이 모듈을 **동적으로도 로드하지 않는다**(아래 isExpoGo 가드 + 지연 import()).
 * 실제 알림은 **개발 빌드/APK** 에서만 동작하며, Expo Go 에서는 모든 함수가
 * 안전하게 no-op(스케줄은 false 반환) 한다.
 */

const BRIEFING_ID = 'morning-briefing';
const ANDROID_CHANNEL = 'briefing';

/** Expo Go 런타임 여부. true 면 expo-notifications 를 절대 로드하지 않는다. */
const isExpoGo = Constants.executionEnvironment === 'storeClient';

type NotificationsModule = typeof import('expo-notifications');
let modPromise: Promise<NotificationsModule> | null = null;

/** expo-notifications 지연 로드. Expo Go 면 null(평가 자체를 회피). */
async function getNotifications(): Promise<NotificationsModule | null> {
  if (isExpoGo) return null;
  if (!modPromise) modPromise = import('expo-notifications');
  try {
    return await modPromise;
  } catch {
    return null;
  }
}

let handlerConfigured = false;

/** 포그라운드에서도 알림 배너가 뜨도록 핸들러 설정(앱 시작 시 1회). Expo Go 면 no-op. */
export async function configureNotifications(): Promise<void> {
  if (handlerConfigured) return;
  const N = await getNotifications();
  if (!N) return;
  handlerConfigured = true;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** 알림 권한 확보(이미 있으면 즉시 true). Expo Go 면 false. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  if (current.canAskAgain === false) return false;
  const requested = await N.requestPermissionsAsync();
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
 * @returns 예약 성공 여부. 권한 거부/Expo Go(미지원) 시 false.
 */
export async function scheduleMorningBriefing(
  time: BriefingTime,
  content: BriefingContent,
): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false; // Expo Go → 조용히 비활성(개발 빌드에서 동작)
  try {
    await configureNotifications();
    const granted = await ensureNotificationPermission();
    if (!granted) return false;

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: '아침 날씨 브리핑',
        importance: N.AndroidImportance.DEFAULT,
      });
    }

    // 기존 예약을 지우고 최신 내용으로 다시 건다.
    await N.cancelScheduledNotificationAsync(BRIEFING_ID).catch(() => undefined);
    await N.scheduleNotificationAsync({
      identifier: BRIEFING_ID,
      content: {
        title: content.title,
        body: content.body,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** 예약된 아침 브리핑을 취소. Expo Go 면 no-op. */
export async function cancelMorningBriefing(): Promise<void> {
  const N = await getNotifications();
  if (!N) return;
  try {
    await N.cancelScheduledNotificationAsync(BRIEFING_ID);
  } catch {
    /* noop */
  }
}
