import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MunicipalChatbot from '../../src/components/MunicipalChatbot';
import { useMunicipalChat } from '../../src/hooks/useMunicipalChat';
import * as assistant from '../../src/services/municipalAssistant';
import { isMockAllowed, assertProductionOrThrow } from '../../src/lib/mode';
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('curated answers', () => {
  it.each(assistant.assistantTopics)('answers the $id topic without a network request', async topic => {
    const answer = await assistant.answerMunicipalQuestion(topic.phrases[0]);
    expect(answer.text).toBe(topic.text);
    expect(answer.route).toBe(topic.route);
  });
  it('uses phrases over generic words and avoids substring false positives', async () => {
    expect((await assistant.answerMunicipalQuestion('WHERE is the BUSINESS PERMIT application?')).route).toContain('Business');
    expect((await assistant.answerMunicipalQuestion('coffee and fireworks')).route).toBe('/search');
    expect((await assistant.answerMunicipalQuestion('   ??? ')).text).toContain('do not have a prepared answer');
  });
  it('never enables runtime sample records', () => {
    expect(isMockAllowed()).toBe(false);
    expect(() => assertProductionOrThrow('Unavailable', { secret: 'hidden' })).toThrow('Unavailable');
  });
});

it('supports keyboard conversation, close/reopen history, topic navigation and clearing', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><MunicipalChatbot /></MemoryRouter>);
  const trigger = screen.getByRole('button', { name: 'Open Municipal Assistant Chat' });
  await user.click(trigger);
  const field = screen.getByRole('textbox', { name: 'Your question' });
  expect(field).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Send query' })).toBeDisabled();
  await user.type(field, 'business permit{Enter}');
  const log = screen.getByRole('log', { name: 'Conversation' });
  expect(await within(log).findByRole('link', { name: 'Open Business Permit' })).toHaveAttribute('href', '/e-services?type=Business%20Permit');
  expect(log).toHaveAttribute('aria-live', 'polite');
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  expect(screen.getByText('business permit')).toBeVisible();
  await user.click(screen.getByText(/Browse all topics/));
  await user.click(screen.getByRole('button', { name: 'Privacy and personal data' }));
  expect(await screen.findByRole('link', { name: 'Read Privacy Policy' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Clear conversation' }));
  expect(screen.getByRole('log')).toBeEmptyDOMElement();
  expect(screen.getByRole('textbox')).toHaveFocus();
  await user.type(screen.getByRole('textbox'), 'unrecognized question');
  await user.click(screen.getByRole('button', { name: 'Send query' }));
  await user.click(await screen.findByRole('link', { name: 'Search the website' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(trigger);
  await user.click(screen.getByRole('button', { name: 'Close Chat' }));
  await user.click(trigger);
  await user.click(screen.getByRole('button', { name: 'Close Municipal Assistant Chat' }));
});

it('exposes real processing and errors and prevents duplicate sends', async () => {
  let finish!: (value: assistant.AssistantAnswer) => void;
  vi.spyOn(assistant, 'answerMunicipalQuestion').mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { result } = renderHook(useMunicipalChat);
  act(() => { void result.current.send('news'); });
  expect(result.current.loading).toBe(true);
  await act(async () => { expect(await result.current.send('duplicate')).toBe(false); });
  await act(async () => { finish({ text: 'Prepared answer', route: '/news', actionText: 'News' }); });
  expect(result.current.messages).toHaveLength(2);
  vi.mocked(assistant.answerMunicipalQuestion).mockRejectedValueOnce(new Error('failure'));
  await act(async () => { await result.current.send('services'); });
  expect(result.current.error).toContain('could not prepare');
  expect(result.current.loading).toBe(false);
});

it('rejects empty/oversized questions, limits bursts and releases the limit', async () => {
  vi.useFakeTimers();
  const { result } = renderHook(useMunicipalChat);
  await act(async () => { expect(await result.current.send(' ')).toBe(false); expect(await result.current.send('a'.repeat(2001))).toBe(false); });
  expect(result.current.error).toContain('2,000');
  for (let i = 0; i < 10; i++) await act(async () => { await result.current.send('news'); });
  await act(async () => { expect(await result.current.send('news')).toBe(false); });
  expect(result.current.limited).toBe(true);
  await act(async () => { expect(await result.current.send('news')).toBe(false); });
  act(() => { vi.advanceTimersByTime(60001); });
  expect(result.current.limited).toBe(false);
  await act(async () => { await result.current.send('news'); });
  expect(result.current.error).toBe('');
});

it('discards pending answers on reset and unmount', async () => {
  let finish!: (value: assistant.AssistantAnswer) => void;
  vi.spyOn(assistant, 'answerMunicipalQuestion').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { result, unmount } = renderHook(useMunicipalChat);
  act(() => { void result.current.send('news'); });
  act(() => { result.current.reset(); });
  await act(async () => { finish({ text: 'Stale', route: '/news', actionText: 'News' }); });
  expect(result.current.messages).toEqual([]);
  act(() => { void result.current.send('news'); });
  unmount();
  await act(async () => { finish({ text: 'Stale', route: '/news', actionText: 'News' }); });
});

it('shows loading and an error in the UI without losing the question', async () => {
  let reject!: (error: Error) => void;
  vi.spyOn(assistant, 'answerMunicipalQuestion').mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
  render(<MemoryRouter><MunicipalChatbot /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Open Municipal Assistant Chat' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'news' } });
  fireEvent.submit(screen.getByRole('textbox').closest('form')!);
  expect(screen.getByRole('status')).toHaveTextContent('Preparing');
  expect(screen.getByRole('button', { name: 'Send query' })).toBeDisabled();
  await act(async () => { reject(new Error('failure')); });
  expect(screen.getByRole('alert')).toHaveTextContent('could not prepare');
  expect(screen.getByRole('log')).toHaveTextContent('news');
});
