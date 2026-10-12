import { randomUUID } from 'node:crypto';
import type { CenterId } from '@shortlab/shared';

export type Approval = { id: string; center: CenterId; task: string; minutes: number; status: 'pending'|'approved'|'changed'; createdAt: number; payload: string };
export class Workflow {
  readonly approvals: Approval[] = [];
  readonly events: Array<{ at: string; center: CenterId; message: string }> = [];
  activeConcepts = 0;
  publishedCount = 3;
  stableRetention = false;
  publicConsent = new Set<string>();
  createApproval(center: CenterId, task: string, minutes: number, payload: string): Approval {
    if (minutes > 5) throw new Error('Akkoord duurt langer dan 5 minuten; splits de taak op.');
    const item = { id: randomUUID(), center, task, minutes, status: 'pending' as const, createdAt: Date.now(), payload };
    this.approvals.push(item); this.log(center, `Akkoord gevraagd: ${task}`); return item;
  }
  startCenter(center: CenterId, approvedInput: boolean): void {
    if (!approvedInput && !['brainstorm'].includes(center)) throw new Error('Dit centrum heeft eerst goedgekeurde of geleverde input nodig.');
    if (center === 'brainstorm' && this.activeConcepts >= 1) throw new Error('Er mag maar één concept tegelijk actief zijn.');
    if (center === 'brainstorm') this.activeConcepts++;
    if (center === 'expansion' && (this.publishedCount < 10 || !this.stableRetention)) throw new Error('Uitbreidingsdok blijft gesloten tot 10 publicaties met stabiele retentie.');
    this.log(center, 'Centrum gestart.');
  }
  resolveApproval(id: string, decision: 'approve'|'change', change?: string): Approval {
    const item = this.approvals.find(x => x.id === id && x.status === 'pending');
    if (!item) throw new Error('Akkoordkaart niet gevonden.');
    if (Date.now() - item.createdAt > 5 * 60_000) throw new Error('Dit akkoord is verlopen en wordt opgesplitst.');
    if (decision === 'change' && (!change?.trim() || change.length > 200)) throw new Error('Geef één concrete aanpassing van maximaal 200 tekens.');
    item.status = decision === 'approve' ? 'approved' : 'changed';
    this.log(item.center, decision === 'approve' ? 'Akkoord vastgelegd; workflow gaat door.' : `Aanpassing vastgelegd: ${change}`);
    return item;
  }
  publish(platform: string, mode: 'mock'|'private'|'public', consent = false): void {
    if (mode === 'public' && !consent && !this.publicConsent.has(platform)) throw new Error('Publiek publiceren vereist expliciet akkoord voor dit platform.');
    if (mode === 'public' && consent) this.publicConsent.add(platform);
    this.log('publishing', `Publicatie ${platform}: ${mode}.`);
  }
  report(center: CenterId, done: string, output: string, needed: string): string { return [done, output, needed].slice(0,3).join(' '); }
  private log(center: CenterId, message: string): void { this.events.push({ at: new Date().toISOString(), center, message }); }
}
