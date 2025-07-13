// src/types.ts

// [추가 1] JSON 스키마 정의를 위해 @google/genai에서 Type을 가져옵니다.
import { Type } from "@google/genai";

export enum Feature {
  Sermon = 'sermon',
  Prayer = 'prayer',
  ScriptureSearch = 'scriptureSearch',
  Bulletin = 'bulletin',
  Communication = 'communication',
  Events = 'events',
  QnA = 'qna',
}

export const SERMON_STYLES = {
  biblicalHumor: '성경 유머 추천',
  generalHumor: '설교 유머 추천',
  expository: '성경 강독 강조',
  practical: '생활 속 실천 강조',
  youthFocus: '청년 대상 설교',
  childrenFocus: '어린이/유아 설교',
  newcomerFocus: '새신자 환영 설교',
  testimonyFocus: '간증/경험 중심',
  qaFormat: '질문과 답변 형식',
  parableFocus: '비유/이야기 중심',
  propheticFocus: '도전적/예언자적 강조',
  exegeticalFocus: '주해 설교 강조',
  topicalFocus: '주제 설교 강조',
  theologicalDepth: '신학적 깊이 강조',
};

export type SermonStyleKey = keyof typeof SERMON_STYLES;

export interface ScriptureResultItem {
    reference: string;
    verse: string;
    summary: string;
}

// [추가 2] 성경 검색 기능의 JSON 응답 스키마를 여기서 정의하고 내보냅니다.
// 이렇게 하면 geminiService.ts에서 스키마를 직접 작성하지 않고 가져와서 사용할 수 있어 코드가 깔끔해집니다.
export const ScriptureSearchSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      reference: {
        type: Type.STRING,
        description: "성경 구절의 정확한 출처 (예: '요한복음 3:16')."
      },
      verse: {
        type: Type.STRING,
        description: "성경 구절의 전체 텍스트."
      },
      summary: {
        type: Type.STRING,
        description: "성경 구절의 의미에 대한 간략한 요약 또는 현대적 적용점."
      }
    },
    required: ["reference", "verse", "summary"]
  }
};