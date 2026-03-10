import type { Chapter, Enclosure } from "@/graphql/generated.ts";

export type EnclosureProp<E extends Enclosure> = {
    enclosure: E;
};

export type SortedChapter = Chapter & {
    beginSeconds: number;
};
