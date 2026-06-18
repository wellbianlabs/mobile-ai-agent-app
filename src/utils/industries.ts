import type { Feather } from '@expo/vector-icons';

/**
 * wellbianAI 산업군(서비스 소개서 기준) — 업종별 맞춤 처방·프리셋 질문.
 * 선택한 업종은 페이로드 meta.industry 로 백엔드에 전달되어 답변이 그 업종 관점으로 처방된다.
 */
export interface Industry {
  id: string;
  /** 백엔드/표시용 한국어 라벨. */
  label: string;
  icon: keyof typeof Feather.glyphMap;
  /** 홈 빠른 질문 칩. */
  presets: string[];
}

export const INDUSTRIES: Industry[] = [
  {
    id: 'construction',
    label: '건설·조선',
    icon: 'tool',
    presets: ['오늘 야외 작업 가능할까?', '이번 주 타설·고소작업 적기는?', '강풍·강수 안전 경보 있어?'],
  },
  {
    id: 'logistics',
    label: '물류·유통',
    icon: 'truck',
    presets: ['배송에 영향 줄 날씨 있어?', '이번 주 물류 리스크 요일은?', '폭우·폭설 대비 뭘 준비할까?'],
  },
  {
    id: 'food',
    label: '식음료·외식',
    icon: 'coffee',
    presets: ['주말 날씨로 식자재 발주량 조정?', '비 오는 날 배달 수요 어때?', '폭염 대비 메뉴·재고 전략은?'],
  },
  {
    id: 'energy',
    label: '에너지·발전',
    icon: 'zap',
    presets: ['이번 주 냉난방 수요 피크는?', '한파·폭염 부하 경보 있어?', '태양광·풍력 발전 여건은?'],
  },
  {
    id: 'manufacturing',
    label: '제조',
    icon: 'settings',
    presets: ['습도·온도가 공정에 영향 줄까?', '이번 주 생산 일정 리스크는?', '자재 보관 날씨 주의사항?'],
  },
  {
    id: 'leisure',
    label: '레저·관광',
    icon: 'sun',
    presets: ['주말 야외 행사 적기는?', '관광객 몰릴 좋은 날은?', '우천 대비 운영 조정 필요?'],
  },
  {
    id: 'general',
    label: '일반',
    icon: 'cloud',
    presets: ['오늘 외출하기 좋아?', '이번 주 우산 챙길 날은?', '주말 나들이 적기 추천'],
  },
];

export const DEFAULT_INDUSTRY = 'general';

export function getIndustry(id: string | null | undefined): Industry {
  return INDUSTRIES.find((i) => i.id === id) ?? INDUSTRIES[INDUSTRIES.length - 1]!;
}
