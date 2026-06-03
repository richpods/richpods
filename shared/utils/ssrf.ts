import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * ipaddr.js classifies every address into a named range. Only globally routable
 * unicast addresses are safe to fetch from a server; everything else (loopback,
 * private/RFC1918, link-local incl. the cloud metadata endpoint, CGNAT,
 * multicast, reserved, …) is an SSRF risk.
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
 * Resolves the hostname via DNS and returns true only when every resolved
 * address is a public unicast IP. A hostname that resolves to any internal /
 * protected address (DNS rebinding, attacker-controlled records pointing at the
 * metadata endpoint, …) is rejected.
 */
export async function resolvesToPublicIp(hostname: string): Promise<boolean> {
    if (ipaddr.isValid(hostname)) {
        return !isDangerousIpAddress(hostname);
    }

    let records: { address: string }[];
    try {
        records = await lookup(hostname, { all: true });
    } catch {
        return false;
    }

    if (records.length === 0) {
        return false;
    }

    return records.every((record) => !isDangerousIpAddress(record.address));
}

/**
 * Throwing guard for outbound server-side requests. Allows the URL only when it
 * uses http(s) and its host (literal IP or DNS-resolved hostname) points
 * exclusively at public internet addresses. Call this before issuing a request
 * and again for every redirect target.
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

    const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
    if (!(await resolvesToPublicIp(hostname))) {
        throw new Error("Blocked request to a non-public address");
    }
}
