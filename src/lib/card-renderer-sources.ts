import { isRemoteUrl } from "@/lib/deck-utils";
import type { ImageSource } from "@/lib/card-renderer-primitives";

export function resolveImageSource(
    reference: string | undefined,
    artworkFiles: Map<string, File>,
): ImageSource | undefined {
    if (!reference) {
        return undefined;
    }

    if (isRemoteUrl(reference)) {
        return reference;
    }

    return artworkFiles.get(reference);
}
