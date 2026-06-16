import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useCallback, useRef, useState } from 'react';

/**
 * 풀스크린 음성 검색용 음성 인식 훅 (YouTube/Google 스타일).
 *
 * 동작:
 *  - start() → 권한 요청 후 실시간 인식 시작 (interimResults: 부분 결과 즉시 반영)
 *  - "result" 이벤트마다 transcript 갱신 → 화면에 실시간 문자화
 *  - "volumechange" 로 입력 레벨(0~1) 제공 → 펄스/이퀄라이저 애니메이션
 *  - 무음이 silenceMs 이상 지속되면 자동 stop() → "end" 에서 onComplete(검색)
 *    (네이티브 엔드포인팅 + 자체 무음 타이머 이중 안전장치)
 */

export interface UseVoiceSearchOptions {
  lang?: string;
  /** 무음 자동 종료 임계값(ms). */
  silenceMs?: number;
  /** 최종 인식 결과가 확정되면 호출(자동 검색 트리거). */
  onComplete?: (query: string) => void;
  onError?: (message: string) => void;
}

export interface UseVoiceSearch {
  transcript: string;
  listening: boolean;
  /** 0~1 정규화된 입력 레벨. */
  volume: number;
  start: () => Promise<void>;
  stop: () => void;
  abort: () => void;
}

export function useVoiceSearch(options: UseVoiceSearchOptions = {}): UseVoiceSearch {
  const { lang = 'ko-KR', silenceMs = 1600, onComplete, onError } = options;

  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [volume, setVolume] = useState(0);

  const finalRef = useRef('');
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  const clearSilence = useCallback(() => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  }, []);

  const armSilence = useCallback(() => {
    clearSilence();
    silenceTimer.current = setTimeout(() => {
      // 무음 지속 → 인식 종료(곧 "end" 이벤트 발생).
      ExpoSpeechRecognitionModule.stop();
    }, silenceMs);
  }, [clearSilence, silenceMs]);

  useSpeechRecognitionEvent('start', () => {
    setListening(true);
    completedRef.current = false;
  });

  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results?.[0]?.transcript ?? '';
    setTranscript(text);
    finalRef.current = text;
    // 말이 들어올 때마다 무음 타이머 리셋.
    if (text.trim().length > 0) armSilence();
  });

  useSpeechRecognitionEvent('volumechange', (e) => {
    // value 는 대략 -2(무음) ~ 10(큰 소리). 0~1 로 정규화.
    const v = Math.max(0, Math.min(1, ((e.value ?? -2) + 2) / 12));
    setVolume(v);
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setVolume(0);
    clearSilence();
    const q = finalRef.current.trim();
    if (q.length > 0 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.(q);
    }
  });

  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    clearSilence();
    // no-speech 는 조용히 무시(사용자가 말하지 않음).
    if (e.error !== 'no-speech') {
      onError?.(e.message || '음성 인식 중 오류가 발생했습니다.');
    }
  });

  const start = useCallback(async () => {
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        onError?.('음성 인식 권한이 필요합니다. 설정에서 허용해 주세요.');
        return;
      }
      setTranscript('');
      finalRef.current = '';
      completedRef.current = false;
      ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: true, // 부분 결과 → 실시간 문자화
        continuous: false, // 무음 시 네이티브 엔드포인팅으로 자동 종료
        addsPunctuation: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      });
    } catch (err) {
      onError?.(`음성 인식을 시작할 수 없습니다: ${(err as Error).message}`);
    }
  }, [lang, onError]);

  const stop = useCallback(() => {
    clearSilence();
    ExpoSpeechRecognitionModule.stop();
  }, [clearSilence]);

  const abort = useCallback(() => {
    clearSilence();
    completedRef.current = true; // 취소 시 onComplete 방지
    ExpoSpeechRecognitionModule.abort();
    setListening(false);
    setVolume(0);
  }, [clearSilence]);

  return { transcript, listening, volume, start, stop, abort };
}
