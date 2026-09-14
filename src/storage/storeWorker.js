import { createStoreService } from './storeService.js';
import { STORE_MESSAGE, setLocalStorageTransport } from './promptStorage.js';

export function installStorageWorker() {
  const service = createStoreService(chrome.storage.local);
  setLocalStorageTransport((action, data) => service.dispatch(action, data));
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type !== STORE_MESSAGE || sender.id !== chrome.runtime.id) return undefined;
    service.dispatch(message.action, message.data).then(
      result => respond({ ok: true, result }),
      error => respond({ ok: false, error: error.message }),
    );
    return true;
  });
  return service;
}
