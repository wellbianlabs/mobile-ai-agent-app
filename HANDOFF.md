# 핸드오프 — 멀티모달 입력 프론트엔드 → 나만의 AI 비서

> 이 문서는 새 세션(본격 AI 비서 제작)이 빠르게 맥락을 잡도록 정리한 인수인계 노트입니다.
> 새 세션 첫 메시지에 이 파일을 첨부하거나 핵심 단락을 붙여넣으세요.

작성일: 2026-06-02

---

## 1. 한 줄 요약

`D:\Project` 는 **모바일 멀티모달 입력 인터페이스**(텍스트·음성·이미지를 하나의 페이로드로 묶어 AI 에이전트로 보내는 프론트엔드)입니다. 빈 폴더에서 시작해 **실기기에서 단독 실행되는 서명 APK**까지 전 과정 실측 검증을 끝낸 상태입니다. 백엔드(에이전트 두뇌)는 아직 없고, 엔드포인트만 플레이스홀더입니다.

---

## 2. 기술 스택 / 환경

| 항목 | 값 |
|---|---|
| 프레임워크 | Expo SDK 52, React Native 0.76.9, TypeScript(strict) |
| 상태관리 | Zustand |
| 주요 네이티브 모듈 | expo-camera, expo-speech-recognition, expo-image-picker, expo-image-manipulator, expo-haptics, @react-native-community/netinfo, @expo/vector-icons(Feather) |
| 빌드 도구(설치됨) | Node 24, npm 11, JDK 17(`C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot`), Android SDK(`C:\Android\Sdk`, platform-tools·android-35·build-tools 35.0.0) |
| 경로 별칭 | `@/*` → `src/*` (babel-plugin-module-resolver + tsconfig paths) |

**환경 제약(중요):** 이 호스트는 비관리자 + 가상화 없음 → **에뮬레이터 부팅 불가**, 물리 USB 버스도 없어 **실기기도 이 호스트엔 안 닿음**. 단, **빌드는 정상 가능**. 실기기 테스트는 빌드한 APK를 사용자가 직접 폰에 사이드로드하는 방식으로 함.

---

## 3. 아키텍처 / 데이터 흐름

```
[텍스트 / 음성(풀스크린 STT) / 카메라·갤러리]
        │  (각 모달리티 독립 상태)
        ▼
[Zustand 스토어: src/store/multimodalStore.ts]
        │  buildPayload()
        ▼
[디바이스 컨텍스트 수집: src/utils/deviceContext.ts]  device(iOS/Android), networkType(WiFi/5G/LTE)
        │
        ▼
[multipart/form-data 패킷화: src/api/agentClient.ts]
   payload(JSON: IMobileAgentUnifiedPayload) + audio 파트 + image_N 파트
        │  fetch POST
        ▼
[AI Agent 백엔드 API]   ← ⚠️ 아직 없음. AGENT_ENDPOINT 플레이스홀더.
```

### 핵심 파일

| 경로 | 역할 |
|---|---|
| `src/App.tsx` | 앱 셸 — 미니멀 인사("안녕하세요") + 하단 컴포저 |
| `src/components/MultimodalComposer.tsx` | 메인 입력 컴포저 (텍스트·카메라·갤러리·마이크·전송) |
| `src/components/VoiceSearchOverlay.tsx` | 풀스크린 음성검색 (실시간 문자화 → 무음 자동검색) |
| `src/components/CameraCaptureOverlay.tsx` | 앱 내 카메라 촬영 모드 (CameraView + 셔터) |
| `src/components/VoiceClipChip.tsx`, `ImageStrip.tsx`, `TextInputField.tsx` | 입력 프리뷰/필드 |
| `src/hooks/useVoiceSearch.ts` | expo-speech-recognition 래핑(부분결과·볼륨·무음 VAD) |
| `src/hooks/useImageCapture.ts` | 갤러리 선택 + 압축 |
| `src/utils/image.ts` | 공용 이미지 압축(긴 변 1600px, JPEG 0.7) |
| `src/api/agentClient.ts` | 통합 페이로드 → multipart 전송 |
| `src/types/payload.ts` | **와이어 계약 `IMobileAgentUnifiedPayload`** (백엔드와 공유 기준) |
| `src/theme/tokens.ts` | 디자인 토큰(잉크블랙·아이보리·샴페인골드) |
| `preview/index.html` | 디자인 확인용 인터랙티브 HTML 목업(Python 서버 `.claude/launch.json`의 `mockup`) |

---

## 4. 디자인 방향

- **심플 & 럭셔리**: 잉크블랙 배경 + 아이보리 텍스트 + 샴페인 골드 포인트, 헤어라인 보더, 글래스 패널.
- 제목 세리프, 본문 가벼운 산세리프, 이모지 금지 → **얇은 라인 아이콘(Feather)**.

---

## 5. 검증 상태 (실측 완료)

`npm install`(903 패키지) → `tsc --noEmit`(0 에러) → `expo export`(670 모듈) → `expo-doctor`(18/18) → Metro 구동·HTTP 번들 서빙 → **디버그 APK**(140MB) → **릴리스 APK**(81.4MB, 자립·서명).

**산출물:** `D:\Project\multimodal-composer-v1.0.0.apk` (단독 실행, 디버그키 서명, 사이드로드용)

---

## 6. 알려진 미완성 / TODO

- [ ] **백엔드 연결**: `src/api/agentClient.ts`의 `AGENT_ENDPOINT`(현재 `https://api.example.com/...`)를 실제 API로 교체. 이게 유일하게 실패하는 부분.
- [ ] **앱 아이콘/스플래시**: 현재 기본 Expo 아이콘.
- [ ] **정식 릴리스 서명키**: 현재 디버그키 서명 → 스토어 배포 시 키스토어 발급 필요.
- [ ] **README 갱신**: 음성검색·카메라 모드·빌드 절차 미반영.
- [ ] (선택) 다크/라이트 자동전환: `expo-system-ui` 미설치 경고 있음.
- [ ] iOS 미검증(빌드/실행). macOS+Xcode 필요.

---

## 7. 새 AI 비서 세션에서 정할 것

1. **이 프론트엔드 재사용 여부** — 비서의 입력 UI로 그대로 쓸지, 새로 시작할지.
2. **비서의 두뇌** — Claude API 직접 호출 vs 에이전트 프레임워크 / 백엔드 위치(로컬·클라우드) / 메모리·도구사용(캘린더·메일·파일 등).
3. **와이어 계약** — 백엔드를 만들면 `IMobileAgentUnifiedPayload`(§3, `src/types/payload.ts`) 형태를 그대로 받게 설계하면 프론트 수정 없이 연결됨.

---

## 8. 자주 쓰는 명령 (참고)

```powershell
# 환경 PATH (이 호스트 기준)
$env:Path = "C:\Program Files\nodejs;" + $env:Path
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
$env:ANDROID_HOME = "C:\Android\Sdk"

npm install
npm run typecheck                 # tsc --noEmit
npx expo export --platform android  # JS 번들 검증
# 네이티브 빌드:
npx expo prebuild --platform android
cmd /c "android\gradlew.bat -p android assembleRelease --no-daemon"  # → app-release.apk
```
