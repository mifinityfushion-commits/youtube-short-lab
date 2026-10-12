import { z } from 'zod';

export const centerIds = ['brainstorm','strategy','script','production','publishing','analytics','growth','expansion'] as const;
export const centerSchema = z.enum(centerIds);
export const approvalSchema = z.object({ approvalId: z.string().min(1), decision: z.enum(['approve','change']), change: z.string().max(200).optional() });
export type CenterId = typeof centerIds[number];
export type ApprovalInput = z.infer<typeof approvalSchema>;

export interface LLMProvider {
  generate(input: { task: string; context?: unknown }): Promise<{ text: string; source: 'mock' | 'provider' }>;
}
export interface VideoProducer { produce(input: { script: string; platforms: Platform[] }): Promise<ProducedVideo[]> }
export interface Publisher { publish(input: { videoId: string; mode: 'mock' | 'private' | 'public'; scheduledAt?: Date }): Promise<{ platformId: string; status: string }> }
export interface AnalyticsSource { fetch(): Promise<Array<{ views: number; retention: number; platform: Platform }>> }
export interface Notifier { notify(message: string): Promise<void> }
export interface Storage { put(key: string, body: Uint8Array, contentType: string): Promise<{ key: string; url: string }> }
export type Platform = 'youtube' | 'tiktok' | 'instagram';
export interface ProducedVideo { platform: Platform; status: 'mock'; title: string; durationSeconds: number; aspectRatio: '9:16' }
