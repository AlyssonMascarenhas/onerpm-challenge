import { buildEmbedUrl } from './spotify-embed';

const ID = '7q7QtMiK9jhob0Md7p715D';

describe('buildEmbedUrl', () => {
  it("points at Spotify's embedded player for the track", () => {
    expect(buildEmbedUrl(ID, false)).toBe(`https://open.spotify.com/embed/track/${ID}`);
  });

  it('asks for the dark player when the page is dark', () => {
    expect(buildEmbedUrl(ID, true)).toBe(`https://open.spotify.com/embed/track/${ID}?theme=0`);
  });

  it.each([
    '4lwE7ainG51zmxt1xAC7XQ',
    '0kkVPWVKs4MCMbQOOxM6nh',
    '1EIYjzkRSy5rYQOn2VKfZb',
    'AAAAAAAAAAAAAAAAAAAAAA',
    '0000000000000000000000',
  ])('accepts the Spotify id %s', (id) => {
    expect(buildEmbedUrl(id, false)).not.toBeNull();
  });

  describe('never builds a URL from something that is not a Spotify id', () => {
    it.each([
      ['empty', ''],
      ['too short', '7q7QtMiK9jhob0Md7p715'],
      ['too long', '7q7QtMiK9jhob0Md7p715DD'],
      ['a path traversal', '../../../etc/passwd/xxxxxx'],
      ['a different origin', '//evil.example/embed/track/abc'],
      ['a query string', '7q7QtMiK9jhob0Md7p71?a=b'],
      ['a fragment', '7q7QtMiK9jhob0Md7p71#'],
      ['a script', '"><script>alert(1)</script>'],
      ['a javascript: url', 'javascript:alert(1)//////'],
      ['whitespace inside', '7q7QtMiK9jhob0Md7p 15D'],
      ['a trailing newline', `${ID}\n`],
      ['a hyphen', '7q7QtMiK9jhob0Md7p-15D'],
      ['non-ASCII letters', '7q7QtMiK9jhob0Md7pé15D'],
    ])('%s', (_label, id) => {
      expect(buildEmbedUrl(id, false)).toBeNull();
      expect(buildEmbedUrl(id, true)).toBeNull();
    });
  });
});
