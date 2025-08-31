# Flutter 확장 프로젝트 사용자 스토리

**프로젝트**: Open Lovable Flutter 확장  
**작성일**: 2025-08-30  
**작성자**: Mary (비즈니스 분석가)

---

## Epic 1: Flutter 코드 생성 엔진 개발

### 🎯 Epic 목표
사용자가 AI 프롬프트를 통해 Flutter 앱을 생성할 수 있도록 기존 React 코드 생성 엔진을 확장

### 📋 Epic 사용자 스토리

**Epic User Story**: "개발자로서 AI 프롬프트를 입력하면 Flutter 모바일 앱이 자동으로 생성되어 React 웹 앱처럼 쉽게 모바일 앱을 만들고 싶다"

---

### Story 1.1: Flutter 프로젝트 타입 선택
**사용자 스토리**: "사용자로서 새 프로젝트를 시작할 때 React 웹앱과 Flutter 모바일 앱 중에서 선택할 수 있어야 한다"

**인수 조건**:
- [ ] 프로젝트 시작 화면에 "React Web App" / "Flutter Mobile App" 선택 버튼이 표시된다
- [ ] Flutter 선택 시 모바일 앱 개발에 특화된 UI가 로드된다  
- [ ] 선택한 프로젝트 타입에 따라 적절한 샌드박스 환경이 생성된다
- [ ] 프로젝트 타입은 세션 동안 유지되며 언제든지 전환 가능하다

**기술 작업**:
- 프로젝트 타입 선택 UI 컴포넌트 개발
- 프로젝트 상태 관리 (React Context 또는 Zustand)
- API 엔드포인트에 프로젝트 타입 파라미터 추가

**추정**: 3 스토리 포인트  
**우선순위**: 높음

---

### Story 1.2: Flutter 프롬프트 패턴 인식
**사용자 스토리**: "개발자로서 '로그인 화면 만들어줘'라고 입력하면 시스템이 이를 Flutter 위젯 생성 의도로 정확히 인식해야 한다"

**인수 조건**:
- [ ] 기존 의도 분석 시스템(`edit-intent-analyzer.ts`)이 Flutter 관련 패턴을 인식한다
- [ ] Flutter 특화 키워드들이 올바르게 분류된다 (위젯, 화면, StatefulWidget 등)
- [ ] 모바일 UI 패턴들이 정확히 식별된다 (AppBar, BottomNavigationBar, FloatingActionButton 등)
- [ ] 잘못된 프롬프트에 대해 적절한 안내 메시지를 제공한다

**Flutter 특화 패턴 예시**:
```typescript
// 새로 추가될 Flutter 패턴들
{
  patterns: [
    /create\s+(a\s+)?(\w+)\s+screen/i,
    /build\s+(a\s+)?(\w+)\s+widget/i,
    /add\s+(a\s+)?app\s?bar/i,
    /implement\s+bottom\s+navigation/i,
  ],
  type: EditType.CREATE_FLUTTER_WIDGET,
  fileResolver: (p, m) => findFlutterInsertionPoints(p, m),
}
```

**기술 작업**:
- `edit-intent-analyzer.ts`에 Flutter 패턴 추가
- Flutter 전용 파일 해석기 개발
- 모바일 UI 컴포넌트 매핑 테이블 구축

**추정**: 5 스토리 포인트  
**우선순위**: 높음

---

### Story 1.3: Dart/Flutter 코드 템플릿 시스템
**사용자 스토리**: "시스템으로서 Flutter 프로젝트가 선택되면 React JSX 대신 Dart 위젯 코드를 생성해야 한다"

**인수 조건**:
- [ ] Flutter 프로젝트 생성 시 기본 Flutter 앱 구조가 생성된다 (`main.dart`, `pubspec.yaml` 등)
- [ ] AI 모델에 전달되는 프롬프트에 Flutter/Dart 관련 컨텍스트가 포함된다
- [ ] 생성된 코드가 유효한 Dart 문법과 Flutter 위젯 구조를 따른다
- [ ] Material Design 3과 Cupertino 디자인 시스템을 선택적으로 적용할 수 있다

**Flutter 코드 템플릿 예시**:
```dart
// 기본 화면 템플릿
class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('{{screen_title}}')),
      body: {{body_content}},
    );
  }
}
```

**기술 작업**:
- Flutter 프로젝트 템플릿 구조 정의
- Dart 코드 생성용 AI 프롬프트 템플릿 개발
- Flutter 위젯 계층 구조 자동 생성
- pubspec.yaml 의존성 관리 시스템

**추정**: 8 스토리 포인트  
**우선순위**: 높음

---

### Story 1.4: Flutter AI 프롬프트 최적화
**사용자 스토리**: "AI 모델로서 Flutter 개발 모범 사례를 반영한 고품질 Dart 코드를 생성해야 한다"

**인수 조건**:
- [ ] AI 모델에 전달되는 프롬프트가 Flutter 모범 사례를 포함한다
- [ ] 생성된 코드가 Flutter 린팅 규칙을 통과한다
- [ ] 상태 관리 패턴이 적절히 적용된다 (StatefulWidget, Provider 등)
- [ ] 성능 최적화 패턴이 자동 적용된다 (const 생성자, builder 패턴 등)

**AI 프롬프트 최적화 예시**:
```typescript
const flutterPromptTemplate = `
You are an expert Flutter developer. Generate Dart code following these principles:
1. Use proper Flutter widget hierarchies
2. Apply const constructors where possible  
3. Follow Material Design guidelines
4. Implement proper state management
5. Use descriptive variable names
6. Add proper documentation comments

User request: ${userPrompt}
Current project structure: ${projectContext}
`;
```

**기술 작업**:
- Flutter 전용 AI 프롬프트 템플릿 개발
- Flutter 모범 사례 데이터베이스 구축
- 코드 품질 검증 시스템 통합
- 자동 코드 포맷팅 적용

**추정**: 8 스토리 포인트  
**우선순위**: 중간

---

### Story 1.5: Flutter 코드 스트리밍 적용
**사용자 스토리**: "사용자로서 Flutter 코드가 생성되는 과정을 실시간으로 볼 수 있어야 한다"

**인수 조건**:
- [ ] 기존 `generate-ai-code-stream` API가 Flutter 코드 생성을 지원한다
- [ ] Flutter 코드가 실시간으로 스트리밍되어 화면에 표시된다
- [ ] 코드 생성 중 Dart 문법 하이라이팅이 적용된다
- [ ] 코드 생성 완료 후 자동으로 Flutter 프로젝트에 적용된다

**기술 작업**:
- `generate-ai-code-stream/route.ts`에 Flutter 지원 추가
- Flutter/Dart 문법 하이라이터 통합
- 실시간 코드 미리보기 UI 개발
- 스트리밍 중 에러 핸들링 강화

**추정**: 5 스토리 포인트  
**우선순위**: 중간

---

## Epic 2: Flutter 개발 환경 통합

### 🎯 Epic 목표
E2B 샌드박스에서 Flutter 프로젝트를 빌드하고 실행할 수 있는 완전한 개발 환경 구축

### 📋 Epic 사용자 스토리

**Epic User Story**: "개발자로서 별도 설정 없이 브라우저에서 Flutter 앱을 개발하고 실시간으로 미리볼 수 있어야 한다"

---

### Story 2.1: Flutter SDK 샌드박스 환경 구성
**사용자 스토리**: "시스템으로서 새로운 Flutter 프로젝트가 생성될 때 필요한 모든 개발 도구가 자동으로 설정되어야 한다"

**인수 조건**:
- [ ] E2B 샌드박스에 Flutter SDK가 자동 설치된다
- [ ] Dart SDK와 필요한 개발 도구들이 함께 설치된다  
- [ ] Android/iOS 빌드 도구가 설정된다
- [ ] 환경 변수와 PATH가 자동으로 구성된다

**기술 작업**:
- E2B 환경에서 Flutter SDK 설치 스크립트 개발
- Docker 이미지에 Flutter 개발 환경 포함
- 자동 환경 설정 스크립트 작성
- 설치 상태 검증 시스템 구축

**추정**: 13 스토리 포인트  
**우선순위**: 높음

---

### Story 2.2: Flutter 프로젝트 빌드 시스템
**사용자 스토리**: "개발자로서 코드 변경 시 Flutter 앱이 자동으로 빌드되고 결과를 확인할 수 있어야 한다"

**인수 조건**:
- [ ] `flutter build` 명령어가 샌드박스에서 정상 실행된다
- [ ] 빌드 에러가 발생하면 상세한 에러 메시지가 표시된다
- [ ] 빌드 성공 시 실행 가능한 앱이 생성된다
- [ ] 빌드 과정이 기존 API 엔드포인트를 통해 모니터링된다

**기술 작업**:
- Flutter 빌드 명령어 통합
- 빌드 에러 파싱 및 표시 시스템
- 빌드 상태 모니터링 API 확장
- 빌드 아티팩트 관리 시스템

**추정**: 8 스토리 포인트  
**우선순위**: 높음

---

### Story 2.3: Flutter 웹 미리보기
**사용자 스토리**: "사용자로서 생성된 Flutter 앱을 브라우저에서 즉시 미리볼 수 있어야 한다"

**인수 조건**:
- [ ] `flutter run -d chrome` 명령어로 웹 버전이 실행된다
- [ ] 미리보기 URL이 자동으로 생성되고 접근 가능하다
- [ ] Hot reload 기능이 정상 작동한다
- [ ] 웹 미리보기와 코드 편집기가 나란히 표시된다

**기술 작업**:
- Flutter 웹 실행 환경 구성
- 미리보기 URL 생성 및 프록시 설정
- Hot reload 이벤트 핸들링
- 반응형 미리보기 UI 개발

**추정**: 8 스토리 포인트  
**우선순위**: 높음

---

### Story 2.4: 패키지 의존성 관리
**사용자 스토리**: "개발자로서 필요한 Flutter 패키지를 프롬프트로 요청하면 자동으로 설치되고 사용할 수 있어야 한다"

**인수 조건**:
- [ ] "http 패키지 추가해줘"와 같은 요청을 인식한다
- [ ] pubspec.yaml 파일이 자동으로 업데이트된다
- [ ] `flutter pub get` 명령어가 자동 실행된다
- [ ] 설치된 패키지의 사용법이 AI에 의해 제안된다

**기술 작업**:
- pub.dev 패키지 검색 API 통합
- pubspec.yaml 자동 업데이트 시스템
- 패키지 설치 프로세스 자동화
- 패키지 사용 예제 생성 시스템

**추정**: 8 스토리 포인트  
**우선순위**: 중간

---

## Epic 3: 통합 사용자 인터페이스 개발

### 🎯 Epic 목표
React와 Flutter 프로젝트를 하나의 직관적인 인터페이스에서 관리할 수 있는 통합 UI 개발

### 📋 Epic 사용자 스토리

**Epic User Story**: "개발자로서 웹과 모바일 프로젝트를 하나의 도구에서 전환하며 개발할 수 있어야 한다"

---

### Story 3.1: 프로젝트 타입 전환 UI
**사용자 스토리**: "사용자로서 현재 작업 중인 프로젝트를 React에서 Flutter로 또는 그 반대로 쉽게 전환할 수 있어야 한다"

**인수 조건**:
- [ ] 헤더에 "React ↔ Flutter" 전환 토글이 표시된다
- [ ] 전환 시 현재 작업이 자동 저장된다
- [ ] 각 프로젝트 타입에 맞는 UI가 로드된다
- [ ] 전환 과정에서 데이터 손실이 없다

**기술 작업**:
- 프로젝트 전환 UI 컴포넌트 개발
- 프로젝트별 상태 저장/복원 시스템
- 전환 애니메이션 및 사용자 피드백
- 전환 중 에러 핸들링

**추정**: 5 스토리 포인트  
**우선순위**: 중간

---

### Story 3.2: 플랫폼별 미리보기 통합
**사용자 스토리**: "사용자로서 React 웹앱과 Flutter 모바일 앱을 동시에 미리보며 비교할 수 있어야 한다"

**인수 조건**:
- [ ] 미리보기 영역이 선택된 프로젝트 타입에 따라 적응적으로 변한다
- [ ] Flutter의 경우 모바일 화면 비율로 미리보기가 표시된다
- [ ] React의 경우 반응형 웹 미리보기가 표시된다
- [ ] 미리보기 간 전환이 부드럽게 이루어진다

**기술 작업**:
- 적응형 미리보기 컨테이너 개발
- 모바일/웹 뷰포트 시뮬레이션
- 미리보기 전환 애니메이션
- 성능 최적화 (불필요한 렌더링 방지)

**추정**: 8 스토리 포인트  
**우선순위**: 중간

---

## Epic 4: Flutter 특화 AI 프롬프트 시스템

### 🎯 Epic 목표
모바일 앱 개발에 특화된 AI 프롬프트 패턴과 Flutter 생태계 지식을 시스템에 통합

---

### Story 4.1: 모바일 UI 패턴 인식
**사용자 스토리**: "개발자로서 '탭 네비게이션 추가해줘'라고 하면 Flutter TabBar와 TabBarView가 자동으로 생성되어야 한다"

**인수 조건**:
- [ ] 모바일 네비게이션 패턴들이 정확히 인식된다 (탭, 드로어, 바텀 네비게이션)
- [ ] Flutter 위젯 계층 구조가 올바르게 생성된다
- [ ] Material Design 가이드라인을 따르는 코드가 생성된다
- [ ] 각 패턴별로 적절한 상태 관리가 적용된다

**기술 작업**:
- 모바일 UI 패턴 데이터베이스 구축
- Flutter 위젯 매핑 시스템 개발
- 패턴별 코드 템플릿 라이브러리
- Material Design 가이드라인 검증

**추정**: 13 스토리 포인트  
**우선순위**: 중간

---

### Story 4.2: 상태 관리 패턴 자동 적용
**사용자 스토리**: "개발자로서 복잡한 상태가 필요한 기능을 요청하면 적절한 상태 관리 패턴이 자동으로 적용되어야 한다"

**인수 조건**:
- [ ] 간단한 로컬 상태는 StatefulWidget으로 구현된다
- [ ] 복잡한 전역 상태는 Provider 또는 Riverpod으로 구현된다
- [ ] 상태 변경에 따른 UI 업데이트가 자동으로 구현된다
- [ ] 상태 관리 패턴 선택 기준이 명확하고 일관성 있다

**추정**: 13 스토리 포인트  
**우선순위**: 낮음

---

## 📊 전체 스토리 포인트 집계

### Epic별 추정치
- **Epic 1**: 29 스토리 포인트 (약 6-7주)
- **Epic 2**: 37 스토리 포인트 (약 7-8주)  
- **Epic 3**: 13 스토리 포인트 (약 3주)
- **Epic 4**: 26 스토리 포인트 (약 5-6주)

### 우선순위별 분류
- **높음**: 7개 스토리 (61 포인트)
- **중간**: 7개 스토리 (44 포인트)
- **낮음**: 1개 스토리 (13 포인트)

### 권장 개발 순서
1. **Phase 1** (Epic 1 + Epic 2 핵심): Story 1.1-1.3, Story 2.1-2.3
2. **Phase 2** (사용자 경험): Story 3.1-3.2, Story 1.4-1.5
3. **Phase 3** (고도화): Story 2.4, Story 4.1-4.2

---

*이 문서는 애자일 개발 방법론과 BMAD-METHOD™을 기반으로 작성되었습니다.*