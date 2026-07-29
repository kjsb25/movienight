import {
  fetchPlexCollectionsByLabel,
  deletePlexCollection,
  resolveMoviesSectionId,
} from '../plexClient';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('resolveMoviesSectionId', () => {
  it('returns the key of the first movie-type section', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        MediaContainer: {
          Directory: [
            { key: '2', type: 'show' },
            { key: '1', type: 'movie' },
            { key: '3', type: 'movie' },
          ],
        },
      }),
    );

    const result = await resolveMoviesSectionId('http://plex:32400', 'tok');

    expect(result).toBe('1');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://plex:32400/library/sections');
    expect(init.headers['X-Plex-Token']).toBe('tok');
    expect(init.headers.Accept).toBe('application/json');
  });

  it('returns null when no movie section exists', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        MediaContainer: { Directory: [{ key: '2', type: 'show' }] },
      }),
    );
    expect(await resolveMoviesSectionId('http://plex:32400', 'tok')).toBeNull();
  });

  it('strips trailing slash from base URL', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ MediaContainer: { Directory: [] } }));
    await resolveMoviesSectionId('http://plex:32400/', 'tok');
    expect(mockFetch.mock.calls[0][0]).toBe('http://plex:32400/library/sections');
  });

  it('throws on non-200 response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, false, 401));
    await expect(resolveMoviesSectionId('http://plex:32400', 'tok')).rejects.toThrow(
      /Plex request failed \(401\)/,
    );
  });
});

describe('fetchPlexCollectionsByLabel', () => {
  it('returns only collections carrying the requested label', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '100',
              title: 'MovieNight — Alice & Bob',
              Label: [{ tag: 'MovieNight' }],
            },
            {
              ratingKey: '101',
              title: 'Old Manual Collection',
              Label: [{ tag: 'Favorites' }],
            },
            {
              ratingKey: '102',
              title: 'No Labels At All',
            },
            {
              ratingKey: '103',
              title: 'Orphan',
              Label: [{ tag: 'movienight' }], // case-insensitive
            },
          ],
        },
      }),
    );

    const result = await fetchPlexCollectionsByLabel('http://plex:32400', 'tok', '1', 'MovieNight');

    expect(result).toEqual([
      { ratingKey: '100', title: 'MovieNight — Alice & Bob' },
      { ratingKey: '103', title: 'Orphan' },
    ]);
    expect(mockFetch.mock.calls[0][0]).toContain('/library/sections/1/collections');
  });

  it('returns empty array when no Metadata is present', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ MediaContainer: {} }));
    const result = await fetchPlexCollectionsByLabel('http://plex:32400', 'tok', '1', 'MovieNight');
    expect(result).toEqual([]);
  });
});

describe('deletePlexCollection', () => {
  it('issues DELETE against the ratingKey', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await deletePlexCollection('http://plex:32400', 'tok', '888');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://plex:32400/library/collections/888');
    expect(init.method).toBe('DELETE');
    expect(init.headers['X-Plex-Token']).toBe('tok');
  });

  it('throws when Plex returns a non-2xx status', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, false, 404));
    await expect(deletePlexCollection('http://plex:32400', 'tok', '888')).rejects.toThrow(
      /Plex request failed \(404\)/,
    );
  });
});
