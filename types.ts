// src/types.ts

// [수정] @google/genai에서 Type을 import하는 부분을 제거합니다.
// import { Type } from "@google/genai";

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

export const ScriptureSearchSchema = {
  // [수정] Type.ARRAY -> "array"
  type: "array",
  items: {
    // [수정] Type.OBJECT -> "object"
    type: "object",
    properties: {
      reference: {
        // [수정] Type.STRING -> "string"
        type: "string",
        description: "성경 구절의 정확한 출처 (예: '요한복음 3:16')."
      },
      verse: {
        type: "string",
        description: "성경 구절의 전체 텍스트."
      },
      summary: {
        type: "string",
        description: "성경 구절의 의미에 대한 간략한 요약 또는 현대적 적용점."
      }
    },
    required: ["reference", "verse", "summary"]
  }
};