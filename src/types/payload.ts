/**
 * 통합 멀티모달 페이로드 타입 정의.
 *
 * 프론트엔드는 Text / Voice / Image 세 모달리티의 로컬 상태를 독립적으로
 * 보관하다가, 전송 시점에 단 하나의 UnifiedPayload 로 묶어 백엔드 AI 에이전트에
 * 전달합니다. 백엔드는 이 구조를 그대로 신뢰할 수 있어야 하므로, 여기서 정의한
 * 필드 의미를 깨지 않도록 주의하세요.
 */

export type InputModality = 'text' | 'voice' | 'image';

/** 녹음 한 건(한 번의 hold-to-talk)의 결과. */
export interface VoiceClip {
  /** 로컬 파일 URI (file://...). 전송 시 multipart 파트로 첨부됩니다. */
  uri: string;
  /** 녹음 길이(ms). */
  durationMs: number;
  /**
   * 녹음 중 캡처한 데시벨(dBFS) 샘플 시퀀스.
   * VAD/프로소디 힌트로 백엔드에 함께 전달해 의도 파악을 돕습니다.
   * dBFS 는 보통 음수(-160 ~ 0)이며 0 에 가까울수록 큰 소리입니다.
   */
  meterSamples: number[];
  /** 캡처된 최대 음량(dBFS). */
  peakDb: number;
  /** "audio/m4a" 등. */
  mimeType: string;
}

/** 디바이스에서 1차 압축까지 끝난 이미지 1장. */
export interface ImageAsset {
  /** 압축 후 로컬 파일 URI. */
  uri: string;
  width: number;
  height: number;
  /** 압축 후 바이트 크기(가능한 경우). */
  bytes?: number;
  mimeType: string;
  /** 'camera' | 'library' — 출처를 기록해 백엔드 컨텍스트로 활용. */
  source: 'camera' | 'library';
}

/** 사용자의 현재 위치 컨텍스트(권한 허용 시). */
export interface LocationContext {
  /** 표시/검색용 지명(예: "강남구"). 역지오코딩 실패 시 null. */
  place: string | null;
  lat: number;
  lon: number;
}

/** 백엔드로 전송되는 단일 페이로드. */
export interface UnifiedPayload {
  text: string;
  voice: VoiceClip | null;
  images: ImageAsset[];
  /** 클라이언트 전송 시각(epoch ms). */
  clientTimestamp: number;
  /** 디바이스 로케일(예: "ko-KR"). 의도 파악 컨텍스트로 사용. */
  locale?: string;
  /** 현재 위치(있으면). "날씨" 등 위치 기반 질의의 기본값으로 사용. */
  location?: LocationContext | null;
}

// ---------------------------------------------------------------------------
// 와이어 계약 (백엔드와 공유하는 정본). 프론트의 리치 내부 상태(UnifiedPayload)는
// 전송 직전 이 형태로 매핑됩니다. 이 인터페이스는 백엔드 합의 없이 바꾸지 마세요.
// ---------------------------------------------------------------------------

export type DeviceKind = 'iOS' | 'Android';
export type NetworkType = 'WiFi' | '5G' | 'LTE';

/**
 * 모바일 에이전트 통합 페이로드(와이어 정본).
 *
 * ⚠️ uri 의미: 바이너리(audioData, images)는 multipart 파일 파트로 별도 전송되며,
 * 여기 `uri` 필드는 그 **파일 파트의 field name(폼데이터 포인터)** 입니다.
 * 예) audioData.uri === "audio" → form 에 "audio" 라는 파일 파트가 존재.
 *     images[i].uri === images[i].fileName → 동일 이름의 파일 파트가 존재.
 */
export interface IMobileAgentUnifiedPayload {
  meta: {
    device: DeviceKind;
    networkType: NetworkType;
    /** 디바이스 기준 절대 시각(epoch ms). 서버 단 타임라인 정렬용. */
    sentTimestamp: number;
    /** 디바이스 로케일(예: "ko-KR"). */
    locale?: string;
    /** 현재 위치(권한 허용 시). 위치 기반 질의의 기본값. */
    place?: string | null;
    coords?: { lat: number; lon: number };
  };
  inputs: {
    /** 대충 적은 질문 텍스트(없을 시 ""). */
    text: string;
    /** 음성 전송 여부. */
    hasAudio: boolean;
    /** 음성이 있을 때만 존재. uri 는 multipart field name 포인터. */
    audioData?: {
      uri: string;
      format: 'aac' | 'opus';
      durationSec: number;
    };
    /** 디바이스 단 1차 압축 완료된 이미지 배열. uri 는 multipart field name 포인터. */
    images: Array<{
      uri: string;
      mimeType: 'image/jpeg';
      fileName: string;
    }>;
  };
}

/** 백엔드 응답(에이전트 결과). 백엔드 AgentResponse 와 정렬. */
export interface AgentResponse {
  ok: boolean;
  /** 서버가 부여한 요청 추적 ID. */
  requestId?: string;
  /** 비서의 자연어 응답 텍스트. */
  message?: string;
  /** 사용된 도구 이름(web_search / get_weather 등). */
  toolsUsed?: string[];
  /** 웹검색 인용 출처. */
  citations?: Array<{ title?: string; url: string }>;
  /** 음성 첨부가 서버에서 전사된 경우 그 텍스트. */
  transcript?: string;
  [key: string]: unknown;
}
