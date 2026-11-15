import {apiFetch} from './service.js';
export function createVideoAsset(file, metadata, mode, aspectRatio) {
  return {
    id: crypto.randomUUID(),
    file,
    mode,
    aspectRatio,
    createdAt: new Date().toISOString(),
    metadata: {
      title: metadata.title.trim().slice(0, 100),
      description: metadata.description.slice(0, 4500),
      hashtags: [...metadata.hashtags]
    },
    outcomes: {}
  };
}
export const publicationTarget = channel => `${channel.id}:${channel.channelId || channel.accountName || channel.handle || ''}`;
export async function publishingRequest(url, options, timeoutMs = 210000) {
  const checkingStatus=options?.method==='GET'&&url.startsWith('/api/publish/status/');
  const operationId=checkingStatus?decodeURIComponent(url.split('/').at(-1)):undefined;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await apiFetch(url, {
      ...options,
      signal: controller.signal
    });
    let data = await response.json().catch(() => null);
    if (!data || typeof data !== 'object' || typeof data.success !== 'boolean') data = {
      success: false,
      error: `The publishing server returned an invalid response (${response.status}). Check your account before retrying.`,
      uncertain: !checkingStatus,
      pending: checkingStatus,
      operationId
    };
    return {
      response,
      data
    };
  } catch (error) {
    return {
      response: {
        ok: false
      },
      data: {
        success: false,
        uncertain: !error.setupRequired&&!checkingStatus,
        pending: checkingStatus&&!error.setupRequired,
        operationId,
        setupRequired: !!error.setupRequired,
        error: error.setupRequired ? error.message : 'The upload could not be confirmed. Check the platform before attempting another upload.'
      }
    };
  } finally {
    clearTimeout(timer);
  }
}
