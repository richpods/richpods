import { lookup as nodeDnsLookup } from "node:dns";
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata"]);

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"];

function normalizeHostname(hostname: string): string {
    return hostname
        .replace(/^\[|\]$/g, "")
        .trim()
        .replace(/\.$/, "")
        .toLowerCase();
}

function isBlockedHostname(hostname: string): boolean {
    if (BLOCKED_HOSTNAMES.has(hostname)) {
        return true;
    }
    return BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

/**
 * ipaddr.js classifies every address into a named range. Only globally routable
 * unicast addresses are safe to fetch from a server; everything else (loopback,
 * private/RFC1918, link-local incl. the cloud metadata endpoint, CGNAT,
 * benchmarking, multicast, reserved, …) is an SSRF risk. Requires ipaddr.js
 * >= 2.x — 1.x classified the RFC 2544/5180 benchmarking ranges as unicast.
 */
function isPublicUnicast(address: ipaddr.IPv4 | ipaddr.IPv6): boolean {
    if (address.kind() === "ipv6") {
        const v6 = address as ipaddr.IPv6;
        if (v6.isIPv4MappedAddress()) {
            return isPublicUnicast(v6.toIPv4Address());
        }
    }
    return address.range() === "unicast";
}

/**
 * Returns true when the given string is a protected / internal / otherwise
 * dangerous IP literal that must never be the target of a server-side request.
 * Non-IP strings (i.e. hostnames) are reported as dangerous here because they
 * cannot be vouched for without DNS resolution — use {@link resolvesToPublicIp}
 * for those.
 */
export function isDangerousIpAddress(value: string): boolean {
    if (!ipaddr.isValid(value)) {
        return true;
    }
    return !isPublicUnicast(ipaddr.parse(value));
}

/**
 * Resolves the hostname via DNS and returns null when resolution fails or
 * yields no records.
 */
async function lookupAllAddresses(hostname: string): Promise<{ address: string }[] | null> {
    let records: { address: string }[];
    try {
        records = await lookup(hostname, { all: true });
    } catch {
        return null;
    }
    return records.length > 0 ? records : null;
}

/**
 * Resolves the hostname via DNS and returns true only when every resolved
 * address is a public unicast IP. A hostname that resolves to any internal /
 * protected address (DNS rebinding, attacker-controlled records pointing at the
 * metadata endpoint, …) is rejected.
 */
export async function resolvesToPublicIp(hostname: string): Promise<boolean> {
    if (ipaddr.isValid(hostname)) {
        return !isDangerousIpAddress(hostname);
    }

    const records = await lookupAllAddresses(hostname);
    if (!records) {
        return false;
    }
    return records.every((record) => !isDangerousIpAddress(record.address));
}

/**
 * Throwing guard for outbound server-side requests. Allows the URL only when it
 * uses http(s), its hostname is not a known-internal name, and its host
 * (literal IP or DNS-resolved hostname) points exclusively at public internet
 * addresses. Call this before issuing a request and again for every redirect
 * target.
 */
export async function assertSafePublicUrl(rawUrl: string): Promise<void> {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new Error("Invalid URL");
    }

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
        throw new Error(`Blocked URL protocol: ${parsed.protocol}`);
    }

    const hostname = normalizeHostname(parsed.hostname);
    if (!hostname) {
        throw new Error("URL host is required");
    }

    if (isBlockedHostname(hostname)) {
        throw new Error(`Host is not allowed: ${hostname}`);
    }

    if (ipaddr.isValid(hostname)) {
        if (isDangerousIpAddress(hostname)) {
            throw new Error(`IP is not allowed: ${hostname}`);
        }
        return;
    }

    const records = await lookupAllAddresses(hostname);
    if (!records) {
        throw new Error(`Unable to resolve host: ${hostname}`);
    }

    const blockedRecord = records.find((record) => isDangerousIpAddress(record.address));
    if (blockedRecord) {
        throw new Error(`Resolved to disallowed IP: ${blockedRecord.address}`);
    }
}

/**
 * got `beforeRedirect`-compatible hook that re-validates every redirect target,
 * so a public URL cannot bounce the request onto an internal address.
 */
export async function assertSafeRedirectTarget(options: {
    url?: string | { toString(): string };
}): Promise<void> {
    if (!options.url) {
        throw new Error("Redirect target URL is missing");
    }
    await assertSafePublicUrl(options.url.toString());
}

type DnsLookupOptions = {
    family?: number | string;
    hints?: number;
    all?: boolean;
    order?: "ipv4first" | "ipv6first" | "verbatim";
    verbatim?: boolean;
};
type LookupAddressEntry = { address: string; family: number };
type LookupSingleCallback = (
    error: NodeJS.ErrnoException | null,
    address: string,
    family: number,
) => void;
type LookupAllCallback = (
    error: NodeJS.ErrnoException | null,
    addresses: LookupAddressEntry[],
) => void;

function blockedAddressError(hostname: string): NodeJS.ErrnoException {
    const error: NodeJS.ErrnoException = new Error(
        `Blocked request to a non-public address: ${hostname}`,
    );
    error.code = "EBLOCKED";
    error.syscall = "getaddrinfo";
    return error;
}

/**
 * `dns.lookup`-compatible resolver that fails for any hostname resolving to a
 * non-public address. Pass it as the `dnsLookup`/`lookup` option of an HTTP
 * client so the SSRF check happens at connect time, closing the
 * time-of-check/time-of-use window of a separate pre-flight DNS validation
 * (DNS rebinding). IP-literal hosts bypass DNS resolution entirely, so this
 * must always be combined with {@link assertSafePublicUrl} on the initial URL
 * and {@link assertSafeRedirectTarget} on redirects.
 */
export function ssrfSafeDnsLookup(
    hostname: string,
    family: number,
    callback: LookupSingleCallback,
): void;
export function ssrfSafeDnsLookup(hostname: string, callback: LookupSingleCallback): void;
export function ssrfSafeDnsLookup(
    hostname: string,
    options: DnsLookupOptions & { all: true },
    callback: LookupAllCallback,
): void;
export function ssrfSafeDnsLookup(
    hostname: string,
    options: DnsLookupOptions,
    callback: LookupSingleCallback,
): void;
export function ssrfSafeDnsLookup(
    hostname: string,
    familyOrOptionsOrCallback: number | DnsLookupOptions | LookupSingleCallback,
    maybeCallback?: LookupSingleCallback | LookupAllCallback,
): void {
    const options: DnsLookupOptions =
        typeof familyOrOptionsOrCallback === "number"
            ? { family: familyOrOptionsOrCallback }
            : typeof familyOrOptionsOrCallback === "object"
              ? familyOrOptionsOrCallback
              : {};
    const callback =
        typeof familyOrOptionsOrCallback === "function" ? familyOrOptionsOrCallback : maybeCallback;
    if (!callback) {
        throw new Error("ssrfSafeDnsLookup requires a callback");
    }

    const family =
        typeof options.family === "string"
            ? Number.parseInt(options.family, 10) || 0
            : options.family;

    nodeDnsLookup(
        hostname,
        { family, hints: options.hints, all: true },
        (error: NodeJS.ErrnoException | null, addresses: LookupAddressEntry[]) => {
            if (error) {
                (callback as LookupSingleCallback)(error, "", 0);
                return;
            }
            if (
                addresses.length === 0 ||
                addresses.some((entry) => isDangerousIpAddress(entry.address))
            ) {
                (callback as LookupSingleCallback)(blockedAddressError(hostname), "", 0);
                return;
            }
            if (options.all) {
                (callback as LookupAllCallback)(null, addresses);
            } else {
                (callback as LookupSingleCallback)(
                    null,
                    addresses[0].address,
                    addresses[0].family,
                );
            }
        },
    );
}
