import { getDeviceKind, getNetworkType } from '@/utils/deviceContext';
import type {
  AgentResponse,
  IMobileAgentUnifiedPayload,
  UnifiedPayload,
} from '@/types/payload';

/**
 * 통합 페이로드를 multipart/form-data 로 패킷화해 AI 에이전트 백엔드로 전송.
 *
 * 와이어 계약은 IMobileAgentUnifiedPayload(types/payload.ts)를 정본으로 한다.
 * 구조 JSON 은 "payload" 파트로, 바이너리는 별도 파일 파트로 전송하며,
 * JSON 내 uri 는 해당 파일 파트의 field name(폼데이터 포인터)이다.
 *
 * 폼 구조:
 *   - "payload"           : IMobileAgentUnifiedPayload JSON 문자열
 *   - "audio"             : 오디오 파일 파트 (hasAudio 일 때만)
 *   - <fileName> (image)  : 이미지 파일 파트들 (각 images[i].fileName 이름으로)
 */

/**
 * 백엔드(두뇌) 엔드포인트.
 *
 * 우선순위: EXPO_PUBLIC_AGENT_ENDPOINT 환경변수 → 플랫폼별 기본값.
 *  - Android 에뮬레이터에서 PC 의 localhost 는 10.0.2.2 로 접근한다.
 *  - iOS 시뮬레이터/웹은 localhost 그대로 접근한다.
 *  - 실기기(Expo Go)는 PC 의 LAN IP 를 EXPO_PUBLIC_AGENT_ENDPOINT 로 지정하세요.
 *    예) EXPO_PUBLIC_AGENT_ENDPOINT=http://192.168.0.10:8787/v1/agent/multimodal
 */
import { Platform } from 'react-native';

const DEFAULT_PORT = 8787;
const DEFAULT_PATH = '/v1/agent/multimodal';

function defaultEndpoint(): string {
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:${DEFAULT_PORT}${DEFAULT_PATH}`;
}

export const AGENT_ENDPOINT =
  process.env.EXPO_PUBLIC_AGENT_ENDPOINT?.trim() || defaultEndpoint();

/** 현재 위치 날씨 엔드포인트(케이웨더/Open-Meteo, 서버 경유). AGENT_ENDPOINT 와 같은 오리진. */
export const WEATHER_ENDPOINT = AGENT_ENDPOINT.replace(/\/v1\/agent\/multimodal\/?$/, '/v1/weather');

/**
 * 백엔드 접근 토큰. 백엔드에 AGENT_ACCESS_TOKEN 이 설정된 경우(공개 배포 보호),
 * 앱은 동일 토큰을 EXPO_PUBLIC_AGENT_ACCESS_TOKEN 으로 주입받아 헤더로 보낸다.
 */
export const AGENT_ACCESS_TOKEN = process.env.EXPO_PUBLIC_AGENT_ACCESS_TOKEN?.trim() || '';

/** 오디오 바이너리가 실리는 multipart field name(포인터 대상). */
const AUDIO_FIELD = 'audio';

export interface SendOptions {
  endpoint?: string;
  /** 인증 토큰 등 추가 헤더. Content-Type 은 직접 지정하지 마세요(경계값 자동 생성). */
  headers?: Record<string, string>;
  /** 요청 타임아웃(ms). 기본 30s. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** RN FormData 가 기대하는 파일 파트 형태. */
interface RNFilePart {
  uri: string;
  name: string;
  type: string;
}

function imageFileName(uri: string, index: number): string {
  const tail = uri.split('/').pop();
  if (tail && /\.(jpe?g|png|webp|heic)$/i.test(tail)) return tail;
  return `image_${index}.jpg`;
}

/** 리치 내부 상태 → 와이어 계약 JSON. uri 는 폼데이터 포인터로 설정한다. */
export function toWirePayload(
  payload: UnifiedPayload,
  ctx: { device: IMobileAgentUnifiedPayload['meta']['device']; networkType: IMobileAgentUnifiedPayload['meta']['networkType'] },
): { wire: IMobileAgentUnifiedPayload; imageNames: string[] } {
  const imageNames = payload.images.map((img, i) => imageFileName(img.uri, i));

  const wire: IMobileAgentUnifiedPayload = {
    meta: {
      device: ctx.device,
      networkType: ctx.networkType,
      sentTimestamp: payload.clientTimestamp,
      locale: payload.locale,
      place: payload.location?.place ?? undefined,
      coords: payload.location
        ? { lat: payload.location.lat, lon: payload.location.lon }
        : undefined,
    },
    inputs: {
      text: payload.text,
      hasAudio: payload.voice !== null,
      audioData: payload.voice
        ? {
            uri: AUDIO_FIELD, // 포인터: "audio" 파일 파트
            format: 'aac', // HIGH_QUALITY(m4a) 컨테이너의 코덱은 AAC
            durationSec: Math.round(payload.voice.durationMs / 100) / 10,
          }
        : undefined,
      images: payload.images.map((img, i) => ({
        uri: imageNames[i], // 포인터: 동일 이름의 파일 파트
        mimeType: 'image/jpeg',
        fileName: imageNames[i],
      })),
    },
  };

  return { wire, imageNames };
}

export function buildFormData(
  payload: UnifiedPayload,
  ctx: { device: IMobileAgentUnifiedPayload['meta']['device']; networkType: IMobileAgentUnifiedPayload['meta']['networkType'] },
): FormData {
  const form = new FormData();
  const { wire, imageNames } = toWirePayload(payload, ctx);

  // 1) 구조 JSON.
  form.append('payload', JSON.stringify(wire));

  // 2) 오디오 파일 파트.
  if (payload.voice) {
    const part: RNFilePart = {
      uri: payload.voice.uri,
      name: 'voice.m4a',
      type: payload.voice.mimeType,
    };
    // RN 의 FormData 는 {uri,name,type} 객체를 파일로 직렬화한다.
    form.append(AUDIO_FIELD, part as unknown as Blob);
  }

  // 3) 이미지 파일 파트들 (field name = fileName, JSON 의 포인터와 일치).
  payload.images.forEach((img, i) => {
    const part: RNFilePart = {
      uri: img.uri,
      name: imageNames[i],
      type: img.mimeType,
    };
    form.append(imageNames[i], part as unknown as Blob);
  });

  return form;
}

export async function sendUnifiedPayload(
  payload: UnifiedPayload,
  options: SendOptions = {},
): Promise<AgentResponse> {
  const {
    endpoint = AGENT_ENDPOINT,
    headers = {},
    timeoutMs = 30_000,
    signal,
  } = options;

  // 디바이스/네트워크 컨텍스트는 전송 시점에 수집해 meta 에 채운다.
  const [device, networkType] = await Promise.all([
    Promise.resolve(getDeviceKind()),
    getNetworkType(),
  ]);

  const form = buildFormData(payload, { device, networkType });

  // 외부 signal 과 내부 타임아웃을 함께 관리.
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(AGENT_ACCESS_TOKEN ? { 'x-access-token': AGENT_ACCESS_TOKEN } : {}),
        // ⚠️ Content-Type 을 직접 설정하면 multipart boundary 가 깨진다. 생략 필수.
        ...headers,
      },
      body: form,
      signal: controller.signal,
    });

    const requestId = res.headers.get('x-request-id') ?? undefined;

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Agent API ${res.status}: ${text || res.statusText}`);
    }

    const data = (await res.json().catch(() => ({}))) as Partial<AgentResponse>;
    return { ok: true, requestId, ...data };
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('요청이 시간 초과되었거나 취소되었습니다.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
