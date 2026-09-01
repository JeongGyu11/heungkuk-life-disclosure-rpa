# LLM 기반 UI 자동화 실행 가이드

## 1. UiPath Studio 디버그 실행

`Main.xaml`을 열고 좌측 하단의 **데이터 관리자 → 인수**에서 실행값을 수정한다.

### 입력 인수

| 인수명 | 설명 |
|---|---|
| `in_ObjectiveText` | 수행할 자연어 업무 목표 |
| `in_StartUrl` | 최초 접속 URL |
| `in_LlmApiBase` | LLM API 주소 |
| `in_LlmModel` | 사용할 LLM 모델명 |
| `in_LlmApiKey` | LLM API Key |
| `in_MaxSteps` | 생성 가능한 최대 실행 단계 수 |
| `in_ControlCode` | 업무 식별 코드. 사용하지 않으면 빈 문자열 |

### 설정 예시

```vb
in_ObjectiveText = "<ID>,<PW>로 로그인 후 전체메일함에 진입하고 회식 관련 메일을 찾아 진입 후 화면을 캡쳐한다."
in_StartUrl = "https://TARGET_URL"
in_LlmApiBase = "http://LLM_SERVER_IP:PORT/v1"
in_LlmModel = "MODEL_NAME"
in_LlmApiKey = "API_KEY"
in_MaxSteps = 20
in_ControlCode = ""
```

인수를 설정한 뒤 `Main.xaml`을 `Debug File` 또는 `Run File`로 실행한다.

---

## 2. 로컬 CMD 실행

UiPath Studio에서 프로젝트를 Publish한 뒤 생성된 `.nupkg` 파일을 `UiRobot.exe`로 실행한다.

```cmd
"C:\Program Files\UiPath\Studio\UiRobot.exe" execute ^
  --file "C:\RPA\packages\PACKAGE_NAME.1.0.0.nupkg" ^
  --entry "Main.xaml" ^
  --input "{\"in_ObjectiveText\":\"<ID>,<PW>로 로그인 후 전체메일함에 진입하고 회식 관련 메일을 찾아 진입 후 화면을 캡쳐한다.\",\"in_StartUrl\":\"https://TARGET_URL\",\"in_LlmApiBase\":\"http://LLM_SERVER_IP:PORT/v1\",\"in_LlmModel\":\"MODEL_NAME\",\"in_LlmApiKey\":\"API_KEY\",\"in_MaxSteps\":20,\"in_ControlCode\":\"\"}"
```

실행 환경에 맞게 다음 값을 수정한다.

```text
UiRobot.exe 경로
NUPKG 파일 경로
in_ObjectiveText
in_StartUrl
in_LlmApiBase
in_LlmModel
in_LlmApiKey
in_MaxSteps
in_ControlCode
```

현재 프로젝트는 CMD에서 `Main.xaml`을 직접 실행하는 방식보다 Publish된 `.nupkg` 실행을 기준으로 한다.

---

## 3. 원격 curl 실행

RPA 실행 PC의 FastAPI Runner를 호출하여 UiPath 프로세스를 실행한다.

현재 원격 실행 API의 최종 요청 규격은 확정 전이며, 아래 형식을 기준으로 구성할 예정이다.

### Linux 또는 Git Bash

```bash
curl -X POST "http://RPA_PC_IP:8787/run-control" \
  -H "Content-Type: application/json" \
  -d '{
    "in_ObjectiveText": "<ID>,<PW>로 로그인 후 전체메일함에 진입하고 회식 관련 메일을 찾아 진입 후 화면을 캡쳐한다.",
    "in_StartUrl": "https://TARGET_URL",
    "in_LlmApiBase": "http://LLM_SERVER_IP:PORT/v1",
    "in_LlmModel": "MODEL_NAME",
    "in_LlmApiKey": "API_KEY",
    "in_MaxSteps": 20,
    "in_ControlCode": ""
  }'
```

### Windows CMD

```cmd
curl -X POST "http://RPA_PC_IP:8787/run-control" ^
  -H "Content-Type: application/json" ^
  -d "{\"in_ObjectiveText\":\"<ID>,<PW>로 로그인 후 전체메일함에 진입하고 회식 관련 메일을 찾아 진입 후 화면을 캡쳐한다.\",\"in_StartUrl\":\"https://TARGET_URL\",\"in_LlmApiBase\":\"http://LLM_SERVER_IP:PORT/v1\",\"in_LlmModel\":\"MODEL_NAME\",\"in_LlmApiKey\":\"API_KEY\",\"in_MaxSteps\":20,\"in_ControlCode\":\"\"}"
```

원격 실행 API 구현이 완료되면 FastAPI Swagger에서 실제 요청 필드를 확인하고 curl 예시를 수정한다.

```text
http://RPA_PC_IP:8787/docs
```

---

## 4. 프롬프트 위치

### 실행 계획 생성 프롬프트

```text
Generate_Llm_Plan.xaml
```

사용자가 입력한 `in_ObjectiveText`를 `CLICK`, `TYPE_INTO`, `DOWNLOAD`, `CAPTURE` 등의 실행 단계로 변환한다.

### UI 요소 선택 프롬프트

```text
Select_UI_Element.xaml
```

현재 화면에서 수집한 UI 후보 중 현재 Step을 수행할 `element_id`를 선택한다.

---

## 5. 로그 확인

### UiPath Studio 디버그 실행

UiPath Studio 하단의 `Output` 패널에서 확인한다.

### NUPKG 또는 Runner 실행

기본 Robot 로그 경로:

```text
%LOCALAPPDATA%\UiPath\Logs
```

로그 폴더 열기:

```cmd
explorer "%LOCALAPPDATA%\UiPath\Logs"
```

주요 실행 상태는 각 XAML에 구성된 `Write Line` 로그로 확인한다.

```text
Initialize Result
Load Current Step
Select UI Element
Resolve Selected Element
Download Detection Started
Download Final Result
Runtime Completed
Process Failed
```

---

## 6. 실행 목표 예시

```text
<ID>,<PW>로 로그인 후 전체메일함에 진입하고 회식 관련 메일을 찾아 진입 후 화면을 캡쳐한다.
```

## 7. 추가 목표

```
<ID>,<PW>로 로그인 후 전체메일함에 진입하고 회식 관련 메일을 찾아 진입 후 화면을 캡쳐한다. -> <ID>,<PW>로 로그인 후 전체메일함에 진입하고 회식 관련 메일을 찾고, 있으면 해당 진입 후 화면을 캡쳐한다. 없으면 다음 페이지로 이동하여 다시 찾는다. 전체 순회 후 없으면 마지막 페이지의 화면을 캡처한다.
= 조건 + 반복 추가
```