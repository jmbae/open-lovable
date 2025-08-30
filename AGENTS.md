# 저장소 가이드라인 (Repository Guidelines)

> 본 문서는 원문 영어 가이드를 한국어로 번역한 것입니다. 내용 차이가 발생하면 최신 영어 커밋을 우선 확인하세요.

## 프로젝트 구조 & 모듈 구성

- `app/`: Next.js App Router. 페이지(`app/page.tsx`, `app/layout.tsx`) 및 API 라우트 (`app/api/<name>/route.ts`) – 샌드박스 제어, 코드 적용, 스크래핑 기능 포함.
- `components/`: 재사용 가능한 UI 및 기능 컴포넌트 (예: `components/ui/button.tsx`, `components/SandboxPreview.tsx`).
- `lib/`: 핵심 유틸리티와 AI 관련 헬퍼 (파서, 선택 로직, 실행 로직).
- `types/`: 공유 TypeScript 타입 정의.
- `config/app.config.ts`: 런타임 중앙 설정 (모델, 타임아웃, UI 플래그).
- `public/`: 정적 에셋. `docs/`: 내부 문서 및 참고 가이드. `test/`: E2B 연동 통합 테스트 프로젝트.

## 빌드 / 테스트 / 개발 명령어

- `npm run dev`: 로컬 개발 서버 실행 (`http://localhost:3000`, Turbopack 기반).
- `npm run build`: 프로덕션 빌드 생성.
- `npm start`: 프로덕션 빌드 서빙.
- `npm run lint`: ESLint (Next + TypeScript 규칙) 실행.
- 통합 테스트: `cd test && npm install && npm run test:all` (환경 변수 `E2B_API_KEY`, `FIRECRAWL_API_KEY` 필요).

## 코딩 스타일 & 네이밍 규칙

- TypeScript (strict). 모듈 경계에서는 명시적 타입을 선호. `tsconfig.json` 의 `@/*` import alias 사용.
- ESLint: `next/core-web-vitals`, `next/typescript` 사용. 미사용 변수, hook deps 경고 해결. PR 전에 모든 경고 제거.
- 네이밍: React 컴포넌트 PascalCase; 함수·변수 camelCase; API 라우트 세그먼트 kebab-case (예: `app/api/create-zip/route.ts`).
- 스타일링: Tailwind CSS (`app/globals.css`). 변형(variants)은 className 조합으로 처리, 인라인 스타일 남발 금지.

## 테스트 가이드

- 별도의 단위 테스트 프레임워크는 설정되지 않음. 통합 테스트는 `test/` 디렉터리의 Node 스크립트 형태.
- 복잡한 새 로직 추가 시 가능하면 집중 테스트(소규모) 추가 및 PR 설명에 수동 검증 절차 문서화.
- 주요 흐름 커버 목표: 샌드박스 생성, 패키지 설치, 코드 적용, 오류 보고.

## 커밋 & PR 가이드

- 커밋 메시지: 명령형 + 범위 + 간결 (예: `refactor: improve sandbox creation useEffect`). Conventional Commits 포맷은 선택.
- 브랜치 이름: `feat/<summary>`, `fix/<summary>`, `chore/<summary>`.
- PR: 관련 이슈 링크, 변경 이유 및 요약, UI 변경 시 스크린샷/GIF 첨부, 재현/검증 스텝 명시, `npm run lint` & `npm run build` 통과 필수. 동작/설정 변화 시 `docs/` 업데이트.

## 보안 & 설정 팁

- 시크릿 커밋 금지. `.env.example` 기반으로 `.env.local` 생성 후 `E2B_API_KEY`, `FIRECRAWL_API_KEY` 와 최소 1개 모델 프로바이더 키(`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`) 설정.
- 모델 선택, 타임아웃, UI 동작 조정은 `config/app.config.ts` 에서. 기본값은 합리적으로 유지하고 변경 시 PR에 근거 기록.

## 추가 권장 사항

- 새 유틸 작성 시: 입력/출력 인터페이스와 오류 케이스를 JSDoc 또는 간단한 주석으로 설명.
- AI 관련 로직: 결정적이지 않은(비결정적) 출력은 재시도 / 타임아웃 전략 고려.
- 퍼포먼스: 빈번한 파일 시스템 / 네트워크 호출은 캐싱 또는 디바운스 검토.

---
문서 개선 사항이나 번역 수정 제안은 자유롭게 PR 생성 바랍니다.
