// src/services/geminiService.ts

// [최종 수정] 가장 안정적인 import 방식으로 변경
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold
} from "@google/generative-ai"; // 패키지 이름이 @google/generative-ai 로 변경될 수 있음. 확인 필요.

// 만약 위 import가 안되면, 아래 것으로 시도.
// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/genai";


import { SERMON_STYLES, SermonStyleKey, ScriptureResultItem, ScriptureSearchSchema } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY is not set.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const MODEL_NAME = "gemini-2.5-pro";

const generateContent = async (systemInstruction: string, userPrompt: string, jsonResponse = false, schema: object | null = null): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: { parts: [{ text: systemInstruction }], role: "model" },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ]
    });

    const generationConfig: any = {
      responseMimeType: jsonResponse ? "application/json" : "text/plain",
    };
    
    if (jsonResponse && schema) {
      generationConfig.responseSchema = schema;
    }

    const result = await model.generateContent(userPrompt, generationConfig);
    const response = result.response;
    return response.text() || "";
  } catch (error) {
    console.error("Error generating content:", error);
    if (error instanceof Error) {
      throw new Error(`콘텐츠 생성 중 오류가 발생했습니다: ${error.message}`);
    }
    throw new Error("콘텐츠 생성 중 알 수 없는 오류가 발생했습니다.");
  }
};

// --- 각 기능별 생성 함수 ---

export const generateSermon = (topic: string, scripture: string, notes: string, styles: SermonStyleKey[]) => {
  const systemInstruction = `당신은 대한예수교장로회(통합) 교단의 목회자를 돕는 AI 목회 비서입니다. 당신의 임무는 약 30-35분 분량의, 청중에게 깊은 감동과 신학적 통찰을 주는 설교문 전체를 작성하는 것입니다. 설교문은 존중과 격려의 어조를 사용하며, 신학적으로 매우 건전해야 합니다. 응답은 **굵은 글씨**, 제목(##), 소제목(###), 목록(*) 등 마크다운을 사용하여 가독성 높게 구성해주세요. 반드시 ## 서론, ## 본론 (여러 대지로 구성), ## 결론의 명확한 구조를 따라야 합니다. 본론에서는 성경 본문에 대한 깊이 있는 주해와 함께, 성도들이 삶에 적용할 수 있는 구체적인 예시와 실천적 도전을 포함해주세요.`;
  const userPrompt = `
설교 주제: ${topic}
성경 본문: ${scripture}
핵심 메시지 및 메모: ${notes}
요청된 설교 스타일: ${styles.length > 0 ? styles.map(s => `- ${SERMON_STYLES[s]}`).join('\n') : '기본 스타일'}

위 내용을 바탕으로, 서론-본론-결론의 구조를 갖춘 감동적이고 짜임새 있는 30분 분량의 설교문을 작성해주십시오.`;
  return generateContent(systemInstruction, userPrompt);
};

export const generatePrayer = (situation: string, details: string) => {
  const systemInstruction = `당신은 목회자를 위한 기도문 작성 AI 비서입니다. 기도의 어조는 경건하고, 진심이 담겨있어야 하며, 성경적 가르침에 기반해야 합니다. 응답은 **굵은 글씨** 등 마크다운을 사용하여 가독성을 높여주세요.`;
  const userPrompt = `
다음 상황을 위한 대표 기도문을 작성해주세요:
- 기도 상황: ${situation}
- 구체적인 내용 또는 기도 제목: ${details}`;
  return generateContent(systemInstruction, userPrompt);
};

export const generateScriptureSearch = (query: string, existingResultsJson: string = '') => {
  const systemInstruction = `당신은 성경 전문가 AI 비서입니다. 사용자의 요청(특정 구절, 주제, 단어)에 가장 관련성 높은 성경 구절들을 찾아 목록으로 제공합니다. 각 항목에는 정확한 성경 출처(책, 장, 절), 구절 전체 텍스트, 그리고 해당 구절의 의미에 대한 간결한 요약 또는 현대적 적용점이 포함되어야 합니다. 응답은 반드시 지정된 JSON 스키마를 따라야 합니다.`;
  
  let userPrompt = `검색어: "${query}"\n\n이 검색어와 관련된 성경 구절을 5개 찾아주세요.`;
  
  if (existingResultsJson) {
      try {
          const existingResults: ScriptureResultItem[] = JSON.parse(existingResultsJson);
          if (existingResults.length > 0) {
              const existingRefs = existingResults.map(r => r.reference).join(', ');
              userPrompt = `이전 검색어 "${query}"에 대한 추가 검색 요청입니다.\n\n이미 찾은 다음 구절들(${existingRefs})은 **반드시 제외**하고, 관련성이 높은 **새로운** 성경 구절을 5개 더 찾아서 제시해주세요.`;
          }
      } catch(e) {
          console.error("Could not parse existing results for follow-up query", e);
      }
  }
  
  return generateContent(systemInstruction, userPrompt, true, ScriptureSearchSchema);
};

export const generateBulletinContent = (contentType: string, topic: string, info: string) => {
  const systemInstruction = `당신은 교회 행정 및 소식을 담당하는 AI 비서입니다. 당신의 글쓰기 스타일은 명확하고, 간결하며, 따뜻하고 환영하는 분위기여야 합니다. 응답은 **굵은 글씨**, 제목(##), 목록(*) 등 마크다운을 사용하여 가독성 높게 구성해주세요.`;
  const userPrompt = `
교회 주보 또는 공지사항에 사용할 '${contentType}' 초안을 작성해주세요.
- 주제 또는 행사명: ${topic}
- 포함될 주요 정보 (날짜, 시간, 장소 등): ${info}

위 정보를 바탕으로 매력적이고 정보가 명확한 글을 작성해주세요.`;
  return generateContent(systemInstruction, userPrompt);
};

export const generatePersonalMessage = (messageType: string, situation: string) => {
  const systemInstruction = `당신은 목회자가 성도에게 보낼 짧고 개인적인 메시지를 작성하는 AI 비서입니다. 메시지는 따뜻하고, 진심이 담겨 있으며, 개인적인 느낌을 주어야 합니다. 간결하게 작성하여 SMS 문자로 보내기에 적합하도록 해주세요.`;
  const userPrompt = `
다음 대상과 상황에 맞는 '${messageType}' 문자 메시지 초안을 작성해주세요:
- 대상 및 상황: ${situation}`;
  return generateContent(systemInstruction, userPrompt);
};

export const generateEventContent = (eventType: string, names: string, details: string, scripture: string) => {
  let systemInstruction = "";
  let userPrompt = "";

  const basePrompt = (event: string, target: string, info: string, bible: string) => `
- 행사: ${event}
- 대상: ${target}
- 관련 정보: ${info}
- 참고 성경 구절: ${bible || '지정되지 않음'}
위 정보를 바탕으로, 행사의 목적에 맞는 감동적인 글을 작성해주세요.`;

  switch (eventType) {
    case '결혼예배 설교':
      systemInstruction = `당신은 결혼을 앞둔 커플을 축복하는 주례자/목사입니다. 따뜻하고 희망적인 어조로, 성경적 원리에 기반한 결혼 생활의 지혜를 전달하는 설교/주례사를 작성합니다.`;
      userPrompt = basePrompt('결혼예배 설교/주례사', names, details, scripture);
      break;
    case '장례예배 설교':
      systemInstruction = `당신은 유가족을 위로하고 고인의 삶을 기리는 목사입니다. 경건하고 차분한 어조로, 천국 소망과 부활 신앙에 기반한 위로의 메시지를 담은 장례예배 설교/추모사를 작성합니다.`;
      userPrompt = basePrompt('장례예배 설교/추모사', names, details, scripture);
      break;
    case '출산/백일 축사':
      systemInstruction = `당신은 새 생명의 탄생을 축하하는 목사입니다. 기쁨과 사랑이 넘치는 어조로, 아기와 가정을 위한 축복의 메시지를 작성합니다.`;
      userPrompt = basePrompt('출산/백일 축사 또는 기도문', names, details, scripture);
      break;
    case '입학/졸업 격려사':
      systemInstruction = `당신은 학생의 새로운 시작을 격려하고 축복하는 목사/멘토입니다. 희망차고 격려하는 어조로, 믿음 안에서 꿈을 펼쳐나갈 것을 응원하는 메시지를 작성합니다.`;
      userPrompt = basePrompt('입학/졸업 격려사', names, details, scripture);
      break;
    default:
      throw new Error("유효하지 않은 행사 종류입니다.");
  }

  return generateContent(systemInstruction, userPrompt);
};