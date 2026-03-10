export type UploadContext = {
    ip: string;
    userId?: string;
    richPodId?: string;
};

export type UploadedFile = {
    buffer: Buffer;
    size: number;
    originalname?: string;
};

export type RateLimitScope = "user" | "global";