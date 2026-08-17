import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
export const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
export const hasVisionKey = !!process.env.GOOGLE_CLOUD_VISION_API_KEY;

let _anthropic: Anthropic | null = null;
export function getAnthropicClient() {
  if (!hasAnthropicKey) return null;
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

let _openai: OpenAI | null = null;
export function getOpenAIClient() {
  if (!hasOpenAIKey) return null;
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}
