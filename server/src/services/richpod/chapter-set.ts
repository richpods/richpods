import { isPrivilegedRole } from "@richpods/shared/utils/roles";
import {
    EnclosureType,
    RichPodState,
    type Chapter,
    type PodcastOrigin,
    type RichPodDocument,
    type UserRoleValue,
} from "../../types/firestore.js";
import { MAX_CHAPTERS_PER_RICHPOD, TOO_MANY_CHAPTERS_MESSAGE } from "../../validation/schemas.js";

export function assertChapterCountWithinLimit(count: number): void {
    if (count > MAX_CHAPTERS_PER_RICHPOD) {
        throw new Error(TOO_MANY_CHAPTERS_MESSAGE);
    }
}

type ChapterSetTarget = Pick<RichPodDocument, "state"> & {
    origin: Pick<PodcastOrigin, "verified">;
};

export function assertChapterSetAllowed(
    richPod: ChapterSetTarget,
    chapters: ReadonlyArray<Pick<Chapter, "enclosureType">>,
    userRole?: UserRoleValue | null,
): void {
    if (richPod.state === RichPodState.PUBLISHED && chapters.length === 0) {
        throw new Error("Cannot remove all chapters from a published RichPod");
    }

    const requiresVerification =
        !isPrivilegedRole(userRole) &&
        chapters.some(
            (ch) =>
                ch.enclosureType === EnclosureType.SLIDESHOW ||
                ch.enclosureType === EnclosureType.POLL,
        );
    if (requiresVerification && !richPod.origin.verified) {
        throw new Error("Slideshow and Poll chapters require podcast verification");
    }
}

export type ChapterSetPersistence<TInput, TResult> = {
    upload: (input: TInput) => Promise<Chapter>;
    commit: (chapters: Chapter[], markCommitAttempted: () => void) => Promise<TResult>;
    remove: (gcsName: string) => Promise<void>;
};

async function removeUploaded(
    chapters: readonly Chapter[],
    remove: (gcsName: string) => Promise<void>,
): Promise<void> {
    await Promise.allSettled(chapters.map(async (chapter) => remove(chapter.gcsName)));
}

/**
 * Uploads run before the commit, so a failed save must not leave the new
 * objects behind. Firestore only sends the commit after the transaction
 * callback has returned, which is when `markCommitAttempted` fires. Without
 * that signal no version can refer to the objects and they are removed,
 * whatever the error was. After it, a failure is ambiguous (the commit may
 * have been persisted), so the objects are kept.
 */
export async function uploadAndCommitChapters<TInput, TResult>(
    inputs: readonly TInput[],
    { upload, commit, remove }: ChapterSetPersistence<TInput, TResult>,
): Promise<TResult> {
    const uploaded: Chapter[] = [];
    try {
        for (const input of inputs) {
            uploaded.push(await upload(input));
        }
    } catch (error) {
        await removeUploaded(uploaded, remove);
        throw error;
    }

    let commitAttempted = false;
    try {
        return await commit(uploaded, () => {
            commitAttempted = true;
        });
    } catch (error) {
        if (!commitAttempted) {
            await removeUploaded(uploaded, remove);
        }
        throw error;
    }
}
