import { authedRequest } from './api';

/**
 * 프로필 편지 — 질문 풀에서 골라 미리 써두는 자기소개(최대 3통, 400자).
 * 오늘의 문답에 쓴 답변을 그대로 프로필에 올릴 때도 같은 write를 쓴다.
 */

export const LETTER_MAX = 3;
export const LETTER_MAX_LENGTH = 400;

export type LetterQuestion = {
  questionId: number;
  content: string;
};

export type ProfileLetter = {
  questionId: number;
  question: string;
  content: string;
};

/** 고를 수 있는 질문 풀 (GET /profile-letters/questions). */
export async function getLetterQuestions(): Promise<LetterQuestion[]> {
  const res = await authedRequest<{ questions: LetterQuestion[] }>('GET', '/profile-letters/questions');
  return res.questions;
}

/** 내가 써둔 편지 목록 (GET /profile-letters). */
export async function getMyLetters(): Promise<ProfileLetter[]> {
  const res = await authedRequest<{ letters: ProfileLetter[] }>('GET', '/profile-letters');
  return res.letters;
}

/** 쓰기/고치기 겸용 (PUT /profile-letters/{questionId}). 갱신된 목록을 반환. */
export async function writeLetter(questionId: number, content: string): Promise<ProfileLetter[]> {
  const res = await authedRequest<{ letters: ProfileLetter[] }>('PUT', `/profile-letters/${questionId}`, { content });
  return res.letters;
}

/** 삭제 (DELETE /profile-letters/{questionId}). 갱신된 목록을 반환. */
export async function deleteLetter(questionId: number): Promise<ProfileLetter[]> {
  const res = await authedRequest<{ letters: ProfileLetter[] }>('DELETE', `/profile-letters/${questionId}`);
  return res.letters;
}
