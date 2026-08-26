const { llm_providers } = require('../src/llm_providers.json');

function expandOriginPatterns(pattern) {
  return String(pattern || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function originPatternToRegex(originPattern) {
  const regexPattern = String(originPattern || '')
    .replace(/\\/g, '\\\\')
    .replace(/[.]/g, '\\.')
    .replace(/[*]/g, '.*');
  return new RegExp(`^${regexPattern}`);
}

function urlMatchesOriginPattern(url, originPattern) {
  if (!url || !originPattern) return false;
  if (originPattern === '<all_urls>') return /^https?:/i.test(String(url));
  try {
    return originPatternToRegex(originPattern).test(String(url));
  } catch {
    return false;
  }
}

function providerMatchesUrl(name, url) {
  const provider = llm_providers.find((item) => item.name === name);
  if (!provider) return false;
  return expandOriginPatterns(provider.pattern).some((pattern) => urlMatchesOriginPattern(url, pattern));
}

describe('provider origin patterns', () => {
  test('Perplexity lists both www and apex hosts', () => {
    const provider = llm_providers.find((item) => item.name === 'Perplexity AI');
    expect(provider).toBeTruthy();
    const origins = expandOriginPatterns(provider.pattern);
    expect(origins).toEqual(['*://www.perplexity.ai/*', '*://perplexity.ai/*']);
  });

  test('ChatGPT includes chatgpt.com and chat.openai.com', () => {
    const provider = llm_providers.find((item) => item.name === 'ChatGPT');
    expect(expandOriginPatterns(provider.pattern)).toEqual([
      '*://chatgpt.com/*',
      '*://chat.openai.com/*',
    ]);
    expect(providerMatchesUrl('ChatGPT', 'https://chatgpt.com/')).toBe(true);
    expect(providerMatchesUrl('ChatGPT', 'https://chatgpt.com/c/abc')).toBe(true);
    expect(providerMatchesUrl('ChatGPT', 'https://chat.openai.com/')).toBe(true);
    expect(providerMatchesUrl('ChatGPT', 'https://platform.openai.com/chat')).toBe(false);
  });

  test('Grok includes grok.com and X grok paths', () => {
    expect(providerMatchesUrl('Grok', 'https://grok.com/')).toBe(true);
    expect(providerMatchesUrl('Grok', 'https://x.com/i/grok')).toBe(true);
    expect(providerMatchesUrl('Grok', 'https://x.com/i/grok/chat')).toBe(true);
    expect(providerMatchesUrl('Grok', 'https://twitter.com/i/grok')).toBe(true);
    expect(providerMatchesUrl('Grok', 'https://x.com/home')).toBe(false);
  });

  test('expandOriginPatterns ignores blanks', () => {
    expect(expandOriginPatterns(' *://a.com/*, ,*://b.com/* ')).toEqual([
      '*://a.com/*',
      '*://b.com/*',
    ]);
  });

  test('urlMatchesOriginPattern treats <all_urls> as http(s) only', () => {
    expect(urlMatchesOriginPattern('https://example.com/', '<all_urls>')).toBe(true);
    expect(urlMatchesOriginPattern('chrome://extensions', '<all_urls>')).toBe(false);
  });
});
