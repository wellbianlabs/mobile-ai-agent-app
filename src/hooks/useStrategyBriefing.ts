import { useEffect, useState } from 'react';

import { sendUnifiedPayload } from '@/api/agentClient';
import { useMultimodalStore } from '@/store/multimodalStore';

/**
 * 능동 전략 브리핑 — 앱을 열면 묻기 전에 위치·업종 기준 핵심 날씨 인사이트를
 * 먼저 생성해 보여준다("척하면 척"). 날짜+위치+업종 단위로 모듈 캐시(세션 내 재호출 방지).
 */

const BRIEF_PROMPT =
  '[자동 전략 브리핑] 인사말 없이, 지금 내 위치·업종 기준으로 오늘(또는 임박한) 가장 중요한 날씨 영향과 권고를 2문장 이내로 아주 짧게 브리핑해줘. 표·목록 없이 핵심만. 끝에 후속 제안 포함.';

interface BriefingState {
  status: 'idle' | 'loading' | 'done' | 'error';
  text: string;
  suggestions: string[];
}

let cache: { key: string; text: string; suggestions: string[] } | null = null;
let inflight: string | null = null;

export function useStrategyBriefing(): BriefingState {
  const location = useMultimodalStore((s) => s.location);
  const industry = useMultimodalStore((s) => s.industry);
  const [state, setState] = useState<BriefingState>({ status: 'idle', text: '', suggestions: [] });

  const place = location?.place ?? null;
  const dateKey = new Date().toISOString().slice(0, 10);
  const key = `${dateKey}|${place}|${industry ?? ''}`;

  useEffect(() => {
    if (!location) return;
    if (cache?.key === key) {
      setState({ status: 'done', text: cache.text, suggestions: cache.suggestions });
      return;
    }
    if (inflight === key) return;
    inflight = key;
    setState({ status: 'loading', text: '', suggestions: [] });

    let alive = true;
    (async () => {
      try {
        const res = await sendUnifiedPayload({
          text: BRIEF_PROMPT,
          voice: null,
          images: [],
          clientTimestamp: Date.now(),
          location,
          industry,
          history: [],
        });
        cache = { key, text: res.message ?? '', suggestions: res.suggestions ?? [] };
        if (alive) setState({ status: 'done', text: cache.text, suggestions: cache.suggestions });
      } catch {
        if (alive) setState({ status: 'error', text: '', suggestions: [] });
      } finally {
        inflight = null;
      }
    })();

    return () => {
      alive = false;
    };
  }, [key, location, industry]);

  return state;
}
