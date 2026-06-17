import { create } from 'zustand';

import type {
  ConversationMessage,
  ImageAsset,
  LocationContext,
  UnifiedPayload,
  VoiceClip,
} from '@/types/payload';

/**
 * 입력 수단별 로컬 상태를 독립적으로 제어하는 단일 스토어.
 *
 * 설계 원칙(지침서 §1):
 *  - Text / Voice / Image 상태는 서로 간섭 없이 갱신된다.
 *  - 전송 시점에만 buildPayload() 로 단일 UnifiedPayload 로 결합한다.
 *  - 전송 라이프사이클(idle/sending/...)은 UI 잠금/스피너 제어에 사용한다.
 */

export type SendStatus = 'idle' | 'sending' | 'success' | 'error';

/** 화면에 누적되는 대화 한 턴(사용자 질문 + 비서 응답). */
export interface ConversationTurn {
  id: string;
  /** 사용자가 보낸 텍스트(이미지/음성 첨부 표식 포함 가능). */
  question: string;
  /** 첨부 이미지 수(있으면 말풍선에 표시). */
  imageCount: number;
  /** 음성 첨부 여부. */
  hasVoice: boolean;
  status: 'pending' | 'done' | 'error';
  /** 비서 응답(done 일 때). */
  answer?: string;
  toolsUsed?: string[];
  citations?: Array<{ title?: string; url: string }>;
  error?: string;
}

interface MultimodalState {
  // ---- 모달리티별 상태 ----
  text: string;
  voice: VoiceClip | null;
  images: ImageAsset[];

  // ---- 전송 라이프사이클 ----
  sendStatus: SendStatus;
  lastError: string | null;
  lastRequestId: string | null;

  // ---- 위치 컨텍스트 ----
  location: LocationContext | null;
  setLocation: (loc: LocationContext | null) => void;

  // ---- 대화 로그 ----
  turns: ConversationTurn[];
  /** 새 사용자 턴을 추가하고 그 id 를 반환. */
  startTurn: (t: Omit<ConversationTurn, 'status' | 'id'>) => string;
  /** 기존 턴을 갱신(응답/에러 채움). */
  resolveTurn: (id: string, patch: Partial<ConversationTurn>) => void;
  clearTurns: () => void;

  // ---- 액션: Text ----
  setText: (text: string) => void;
  clearText: () => void;

  // ---- 액션: Voice ----
  setVoice: (clip: VoiceClip) => void;
  clearVoice: () => void;

  // ---- 액션: Image ----
  addImage: (asset: ImageAsset) => void;
  removeImage: (uri: string) => void;
  clearImages: () => void;

  // ---- 전송/리셋 ----
  setSendStatus: (status: SendStatus, opts?: { error?: string | null; requestId?: string | null }) => void;
  buildPayload: () => UnifiedPayload;
  resetAll: () => void;
}

/** 한 디바이스가 한 번에 첨부할 수 있는 이미지 상한(과도한 페이로드 방지). */
export const MAX_IMAGES = 6;

/** 멀티턴 메모리로 보낼 직전 대화 턴 상한(컨텍스트/비용 보호). */
const MAX_HISTORY_TURNS = 6;

/** 완료된 대화 턴들 → 백엔드로 보낼 history(텍스트만). 첨부는 표식으로 남긴다. */
function buildHistory(turns: ConversationTurn[]): ConversationMessage[] {
  const recent = turns.filter((t) => t.status === 'done' && t.answer).slice(-MAX_HISTORY_TURNS);
  const history: ConversationMessage[] = [];
  for (const turn of recent) {
    const marks: string[] = [];
    if (turn.imageCount > 0) marks.push(`이미지 ${turn.imageCount}장 첨부`);
    if (turn.hasVoice) marks.push('음성 첨부');
    let question = turn.question?.trim() ?? '';
    if (marks.length) question = question ? `${question} (${marks.join(', ')})` : `(${marks.join(', ')})`;
    if (!question) question = '(첨부만 전송)';
    history.push({ role: 'user', text: question });
    history.push({ role: 'assistant', text: turn.answer as string });
  }
  return history;
}

export const useMultimodalStore = create<MultimodalState>((set, get) => ({
  text: '',
  voice: null,
  images: [],

  sendStatus: 'idle',
  lastError: null,
  lastRequestId: null,

  location: null,
  setLocation: (loc) => set({ location: loc }),

  turns: [],
  startTurn: (t) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({ turns: [...state.turns, { ...t, id, status: 'pending' }] }));
    return id;
  },
  resolveTurn: (id, patch) =>
    set((state) => ({
      turns: state.turns.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)),
    })),
  clearTurns: () => set({ turns: [] }),

  setText: (text) => set({ text }),
  clearText: () => set({ text: '' }),

  setVoice: (clip) => set({ voice: clip }),
  clearVoice: () => set({ voice: null }),

  addImage: (asset) =>
    set((state) => {
      // 동일 URI 중복 첨부 방지 + 상한 적용.
      if (state.images.some((img) => img.uri === asset.uri)) return state;
      if (state.images.length >= MAX_IMAGES) return state;
      return { images: [...state.images, asset] };
    }),
  removeImage: (uri) =>
    set((state) => ({ images: state.images.filter((img) => img.uri !== uri) })),
  clearImages: () => set({ images: [] }),

  setSendStatus: (status, opts) =>
    set({
      sendStatus: status,
      lastError: opts?.error ?? (status === 'error' ? get().lastError : null),
      lastRequestId: opts?.requestId ?? get().lastRequestId,
    }),

  buildPayload: () => {
    const { text, voice, images, location, turns } = get();
    return {
      text: text.trim(),
      voice,
      images,
      clientTimestamp: Date.now(),
      location,
      history: buildHistory(turns),
    };
  },

  resetAll: () =>
    set({
      text: '',
      voice: null,
      images: [],
      sendStatus: 'idle',
      lastError: null,
    }),
}));

/** 전송 가능한 콘텐츠가 하나라도 있는지(빈 전송 방지) 판별하는 셀렉터. */
export const selectHasContent = (s: MultimodalState): boolean =>
  s.text.trim().length > 0 || s.voice !== null || s.images.length > 0;
