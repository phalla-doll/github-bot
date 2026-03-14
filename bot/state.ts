export type IssueStep =
    | "repo_selected"
    | "title_received"
    | "description_received";

export interface DraftIssue {
    repo: string;
    step: IssueStep;
    title?: string;
    body?: string;
}

export const issueDrafts = new Map<number, DraftIssue>();
export const connectAwaitingToken = new Set<number>();

export function setDraft(telegramId: number, draft: DraftIssue): void {
    issueDrafts.set(telegramId, draft);
}

export function getDraft(telegramId: number): DraftIssue | undefined {
    return issueDrafts.get(telegramId);
}

export function clearDraft(telegramId: number): void {
    issueDrafts.delete(telegramId);
}
