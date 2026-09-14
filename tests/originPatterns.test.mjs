import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
const expect = value => ({ toBe: expected => assert.equal(value, expected), toEqual: expected => assert.deepEqual(value, expected), toBeTruthy: () => assert.ok(value) });
import fs from 'node:fs';
const { llm_providers } = JSON.parse(fs.readFileSync(new URL('../src/llm_providers.json', import.meta.url), 'utf8'));

import { expandOriginPatterns, urlMatchesOriginPattern } from '../src/utils/originPatterns.js';

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
