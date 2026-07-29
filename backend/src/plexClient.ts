// Minimal Plex Media Server client for the Kometa exporter's reconcile step.
// Docs: https://plexapi.dev/docs/plex/

export interface PlexCollection {
  ratingKey: string;
  title: string;
}

interface PlexMediaContainerResponse<T> {
  MediaContainer: {
    Metadata?: T[];
    Directory?: T[];
    size?: number;
  };
}

interface PlexSectionDirectory {
  key: string;
  type: string;
}

interface PlexCollectionMetadata {
  ratingKey: string;
  title: string;
}

const PLEX_TIMEOUT_MS = 10000;

function joinUrl(base: string, path: string): string {
  const trimmed = base.replace(/\/+$/, '');
  return `${trimmed}${path.startsWith('/') ? path : `/${path}`}`;
}

async function plexRequest<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'X-Plex-Token': token,
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(PLEX_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Plex request failed (${res.status}): ${text || url}`);
  }
  return (await res.json()) as T;
}

/** Look up the first `movie`-type library section and return its key. */
export async function resolveMoviesSectionId(
  plexUrl: string,
  token: string,
): Promise<string | null> {
  const data = await plexRequest<PlexMediaContainerResponse<PlexSectionDirectory>>(
    joinUrl(plexUrl, '/library/sections'),
    token,
  );
  const dirs = data.MediaContainer.Directory || [];
  const movies = dirs.find((d) => d.type === 'movie');
  return movies?.key ?? null;
}

/**
 * Return all collections in the given library section that carry the given label.
 * Fetches all collections and filters client-side — Plex's server-side `label=`
 * param only accepts numeric label IDs, not string tags.
 */
export async function fetchPlexCollectionsByLabel(
  plexUrl: string,
  token: string,
  sectionId: string,
  label: string,
): Promise<PlexCollection[]> {
  const url = joinUrl(
    plexUrl,
    `/library/sections/${encodeURIComponent(sectionId)}/collections?includeMeta=1`,
  );
  const data = await plexRequest<
    PlexMediaContainerResponse<PlexCollectionMetadata & { Label?: { tag: string }[] }>
  >(url, token);
  const metadata = data.MediaContainer.Metadata || [];
  const wanted = label.toLowerCase();
  return metadata
    .filter((c) => (c.Label || []).some((l) => (l.tag || '').toLowerCase() === wanted))
    .map((c) => ({ ratingKey: c.ratingKey, title: c.title }));
}

/** Delete a Plex collection by its ratingKey. */
export async function deletePlexCollection(
  plexUrl: string,
  token: string,
  ratingKey: string,
): Promise<void> {
  await plexRequest(
    joinUrl(plexUrl, `/library/collections/${encodeURIComponent(ratingKey)}`),
    token,
    { method: 'DELETE' },
  );
}
