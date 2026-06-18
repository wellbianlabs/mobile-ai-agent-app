import { useCallback } from 'react';

import { sendUnifiedPayload } from '@/api/agentClient';
import { useMultimodalStore } from '@/store/multimodalStore';

/**
 * 메시지 전송 + 대화 턴 라이프사이클. 입력 바와 후속 제안 칩이 공유한다.
 * overrideText 가 주어지면 그 텍스트로(첨부 무시 가능) 즉시 전송한다.
 */
export function useSendMessage() {
  const setText = useMultimodalStore((s) => s.setText);
  const setSendStatus = useMultimodalStore((s) => s.setSendStatus);
  const buildPayload = useMultimodalStore((s) => s.buildPayload);
  const resetAll = useMultimodalStore((s) => s.resetAll);
  const startTurn = useMultimodalStore((s) => s.startTurn);
  const resolveTurn = useMultimodalStore((s) => s.resolveTurn);
  const sendStatus = useMultimodalStore((s) => s.sendStatus);

  const send = useCallback(
    async (overrideText?: string) => {
      if (useMultimodalStore.getState().sendStatus === 'sending') return;
      setSendStatus('sending');
      if (overrideText !== undefined) setText(overrideText);

      const payload = buildPayload();
      const finalText = overrideText !== undefined ? overrideText.trim() : payload.text;
      if (!finalText && payload.images.length === 0 && !payload.voice) {
        setSendStatus('idle');
        return;
      }

      const turnId = startTurn({
        question: finalText || (payload.images.length ? '(이미지 첨부)' : '(음성)'),
        imageCount: payload.images.length,
        hasVoice: payload.voice !== null,
      });

      try {
        const res = await sendUnifiedPayload({ ...payload, text: finalText });
        setSendStatus('success', { requestId: res.requestId ?? null });
        resolveTurn(turnId, {
          status: 'done',
          answer: res.message ?? '(응답 없음)',
          toolsUsed: res.toolsUsed,
          citations: res.citations,
          suggestions: res.suggestions,
        });
        resetAll();
      } catch (e) {
        const message = (e as Error).message ?? '알 수 없는 오류';
        setSendStatus('error', { error: message });
        resolveTurn(turnId, { status: 'error', error: message });
      }
    },
    [buildPayload, resetAll, resolveTurn, setSendStatus, setText, startTurn],
  );

  return { send, sending: sendStatus === 'sending' };
}
