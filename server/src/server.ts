import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import { ruruHTML } from "ruru/server";
import { createHandler } from "graphql-http/lib/use/express";
import fs from "node:fs";
import { buildSchema } from "graphql";
import { JSONResolver, GraphQLGeoJSON } from "graphql-scalars";
import { createResolvers } from "./resolvers.js";
import { createAuthContext } from "./middleware/auth.js";
import { uploadRouter } from "./routes/upload.router.js";
import { hostedRouter } from "./routes/hosted.router.js";
import { ogRouter } from "./routes/og.router.js";
import { parseIntEnv } from "./utils/env.js";

// Validate required environment variables at startup
const requiredEnvVars = [
    "API_BASE_URL",
    "GCS_BUCKET_NAME",
    "GCS_UPLOAD_BUCKET_NAME",
    "GCS_HOSTED_BUCKET_NAME",
    "GOOGLE_CLOUD_PROJECT",
    "POSTMARK_SERVER_TOKEN",
    "POSTMARK_FROM_EMAIL",
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingEnvVars.forEach((envVar) => {
        console.error(`   - ${envVar}`);
    });
    console.error("\nPlease set these environment variables and restart the server.");
    process.exit(1);
}

const schema = buildSchema(fs.readFileSync(new URL("../schema.graphql", import.meta.url), "utf8"));

function readPackageVersion(relativePath: string): string {
    try {
        const pkg = JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
        return pkg.version;
    } catch {
        return "unknown";
    }
}

function readBuildCommitHash(): string {
    try {
        const info = JSON.parse(
            fs.readFileSync(new URL("../build-info.json", import.meta.url), "utf8"),
        );
        return info.commitHash;
    } catch {
        return process.env.COMMIT_HASH ?? "unknown";
    }
}

const instanceInfo = {
    version: readPackageVersion("../../../package.json"),
    serverVersion: readPackageVersion("../../package.json"),
    commitHash: readBuildCommitHash(),
};
const app = express();

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const corsOptions: CorsOptions = {
    origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
    ) => {
        if (!origin) {
            callback(null, true);
            return;
        }

        if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
};

app.use(cors(corsOptions));

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof Error && err.message === "Not allowed by CORS") {
        res.status(403).json({ error: "Origin not allowed" });
        return;
    }
    next(err as Error);
});

// JSON body size limit applies to all routes including /graphql.
// File uploads use Multer with their own per-route limits.
const jsonBodyLimitBytes = parseIntEnv("JSON_BODY_LIMIT_BYTES", 2 * 1024 * 1024, {
    min: 100_000,
});
app.use(express.json({ limit: jsonBodyLimitBytes }));

app.use("/api/v1/upload", uploadRouter);
app.use("/api/v1/hosted", hostedRouter);
app.use("/api/v1/og", ogRouter);

app.all(
    "/graphql",
    async (req, res, next) => {
        const auth = await createAuthContext(req);
        const handler = createHandler({
            schema,
            rootValue: {
                ...createResolvers(req, auth),
                instanceInfo: () => instanceInfo,
                // Add scalar resolvers
                JSON: JSONResolver,
                GeoJSON: GraphQLGeoJSON,
            },
        });
        return handler(req, res, next);
    }
);

if (process.env.NODE_ENV !== "production") {
    app.get("/", (_req, res) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(ruruHTML({ endpoint: "/graphql" }));
    });
}

app.listen(4000, () => {
    console.log("🚀 Running GraphQL at http://localhost:4000/graphql");
});
