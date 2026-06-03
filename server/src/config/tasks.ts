import { parseBoolEnv } from "../utils/env.js";

export type TaskQueueConfig = {
    queue: string;
    url: string;
};

/**
 * Settings shared by every Cloud Tasks queue the server dispatches to. New async
 * job types reuse these and declare only their own queue + target URL (see
 * `genAiTasksQueue` below).
 *
 * `directInvoke` is a local-development escape hatch: Cloud Tasks has no local
 * emulator, so when set the server POSTs the job straight to the target URL
 * (e.g. the functions-framework dev server) instead of enqueuing a task. Never
 * enable this in production!
 */
export const cloudTasksConfig = {
    project: process.env.GOOGLE_CLOUD_PROJECT || "",
    location: process.env.CLOUD_TASKS_LOCATION || "europe-west3",
    invokerServiceAccount: process.env.CLOUD_TASKS_INVOKER_SA || "",
    directInvoke: parseBoolEnv("CLOUD_TASKS_DIRECT_INVOKE", false),
};

/**
 * Queue for the asynchronous generative-AI jobs (transcript + chapter
 * generation) dispatched to the `generative-ai-tools` Cloud Function.
 */
export const genAiTasksQueue: TaskQueueConfig = {
    queue: process.env.GENAI_TASKS_QUEUE || "",
    url: process.env.GENAI_TASKS_FUNCTION_URL || "",
};
