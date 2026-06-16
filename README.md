# Multimodal Agent Composer

모바일에서 **텍스트 · 음성 · 이미지**를 한 번에 묶어 백엔드 AI 에이전트로 보내는
React Native (Expo) 입력 인터페이스. 사용자가 정제되지 않은 형태로 입력해도
(웅얼거리는 음성, 대충 찍은 사진, 단편적인 텍스트) 단일 페이로드로 결합해
전달하는 것을 목표로 합니다.

> 본 저장소는 첨부된 지침서 §1(프론트엔드 아키텍처 및 데이터 흐름)을 구현한
> 프론트엔드 스캐폴드입니다.

---

## ⚙️ 사전 요구사항

이 머신에는 현재 **Node.js 가 설치되어 있지 않습니다.** 먼저 설치하세요.

1. [Node.js LTS](https://nodejs.org/) (v18 이상) 설치
2. 설치 확인:
   ```powershell
   node --version
   npm --version
   ```

## 🚀 실행

```powershell
# 1) 의존성 설치
npm install

# 2) 개발 서버 시작 (QR 코드를 Expo Go 앱으로 스캔)
npm start

# 또는 플랫폼 지정
npm run android
npm run ios      # macOS + Xcode 필요
```

- 마이크 / 카메라는 **실기기 또는 Expo Go** 에서 테스트하세요(시뮬레이터는 제약 있음).
- 타입 검사: `npm run typecheck`

---

## 🏗 아키텍처 (데이터 흐름)

```text
[사용자 입력: 텍스트 / 롱프레스 음성 / 카메라·갤러리]
        │
        ▼
[Zustand 단일 스토어: src/store/multimodalStore.ts]
 ├─ text:   string (실시간 가변 저장)
 ├─ voice:  VoiceClip | null  (uri + dB 샘플 + peak + duration)
 └─ images: ImageAsset[]      (디바이스 1차 압축 완료)
        │  buildPayload()
        ▼
[디바이스/네트워크 컨텍스트 수집: src/utils/deviceContext.ts]
 ├─ device:      Platform.OS → "iOS" | "Android"
 └─ networkType: NetInfo → "WiFi" | "5G" | "LTE"
        │
        ▼
[멀티파트 패킷화: src/api/agentClient.ts → FormData]
 ├─ "payload"   : IMobileAgentUnifiedPayload JSON (meta + inputs)
 ├─ "audio"     : 오디오 파일 파트 (uri 포인터 = "audio")
 └─ <fileName>  : 이미지 파일 파트들 (uri 포인터 = fileName)
        │  fetch POST
        ▼
[AI Agent 백엔드 API]
```

### 디렉터리 구조

| 경로 | 역할 |
|------|------|
| `src/store/multimodalStore.ts` | 모달리티별 독립 상태 + 전송 라이프사이클 (Zustand) |
| `src/hooks/useVoiceRecorder.ts` | hold-to-talk 녹음, dBFS 미터링, 경량 VAD |
| `src/hooks/useImageCapture.ts` | 카메라/갤러리 + 디바이스 단 리사이즈·JPEG 압축 |
| `src/api/agentClient.ts` | 내부 상태 → `IMobileAgentUnifiedPayload` 매핑 + `multipart/form-data` 전송 |
| `src/utils/deviceContext.ts` | device(Platform) / networkType(NetInfo) 컨텍스트 수집 |
| `src/components/MultimodalComposer.tsx` | 세 입력을 묶는 메인 컴포저 |
| `src/components/VoiceRecordButton.tsx` | 롱프레스 버튼 + 실시간 레벨 링 |
| `src/components/VoiceClipChip.tsx` | 녹음 결과 미니 파형 미리보기 |
| `src/components/ImageStrip.tsx` | 첨부 이미지 썸네일/삭제 |
| `src/types/payload.ts` | 페이로드 계약(프론트 ↔ 백엔드 공유 기준) |

---

## 📡 백엔드 계약 (`multipart/form-data`)

`POST {AGENT_ENDPOINT}` — 기본값은 `src/api/agentClient.ts` 의 `AGENT_ENDPOINT`.
**배포 전 실제 엔드포인트로 교체하세요.** (환경변수 주입 권장)

와이어 정본은 `src/types/payload.ts` 의 **`IMobileAgentUnifiedPayload`** 입니다.

| 파트 | 타입 | 설명 |
|------|------|------|
| `payload` | JSON 문자열 | `IMobileAgentUnifiedPayload` (아래) |
| `audio` | 파일 | 오디오(m4a/aac). `inputs.hasAudio === true` 일 때만 존재 |
| `<fileName>` | 파일 | 압축된 JPEG. 파트 이름 = `inputs.images[i].fileName` |

```jsonc
{
  "meta": {
    "device": "iOS" | "Android",
    "networkType": "WiFi" | "5G" | "LTE",
    "sentTimestamp": 1730000000000
  },
  "inputs": {
    "text": "대충 적은 질문",
    "hasAudio": true,
    "audioData": { "uri": "audio", "format": "aac", "durationSec": 3.4 },
    "images": [
      { "uri": "image_0.jpg", "mimeType": "image/jpeg", "fileName": "image_0.jpg" }
    ]
  }
}
```

> **uri = 폼데이터 포인터.** `audioData.uri` 와 `images[i].uri` 는 device-local 경로가
> 아니라 **해당 바이너리가 실린 multipart 파일 파트의 field name** 입니다.
> 서버는 `uri` 로 같은 요청 안의 파일 파트를 찾아 매칭하세요.
>
> ⚠️ 클라이언트에서 `Content-Type` 헤더를 직접 지정하지 마세요.
> RN `fetch` 가 multipart boundary 를 자동 생성합니다.

> ℹ️ 녹음 중 캡처한 dBFS 미터링(peak/samples)은 로컬 파형 UI 전용이며 본 계약에는
> 포함되지 않습니다. 백엔드 프로소디 힌트로 쓰려면 계약을 확장하세요.

성공 응답 예시:
```json
{ "ok": true, "requestId": "...", "message": "에이전트가 입력을 수신했습니다." }
```

---

## 🔧 튜닝 포인트

- **VAD 민감도** — `useVoiceRecorder.ts` 의 `VAD_THRESHOLD_DB`, `VAD_SILENCE_MS`
- **이미지 압축** — `useImageCapture.ts` 의 `MAX_DIMENSION`, `COMPRESS_QUALITY`
- **이미지 최대 첨부 수** — `multimodalStore.ts` 의 `MAX_IMAGES`
- **전송 타임아웃** — `agentClient.ts` `sendUnifiedPayload(payload, { timeoutMs })`

---

## ✅ 다음 단계(스캐폴드 범위 밖)

- 인증 토큰 주입 (`sendUnifiedPayload(..., { headers })`)
- 오프라인 큐 / 재시도, 업로드 진행률
- 에이전트 응답 타임라인 UI
- 음성 인앱 재생, 이미지 풀스크린 프리뷰
