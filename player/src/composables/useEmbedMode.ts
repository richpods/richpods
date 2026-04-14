export function useEmbedMode() {
    if (typeof window === "undefined") {
        return { isEmbedded: false };
    }

    let inIframe = false;
    try {
        inIframe = window.self !== window.top;
    } catch {
        inIframe = true;
    }

    const params = new URLSearchParams(window.location.search);
    const explicit = params.get("embed") === "1";

    return { isEmbedded: inIframe || explicit };
}
