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
