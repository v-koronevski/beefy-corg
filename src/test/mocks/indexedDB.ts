// Моки для IndexedDB в тестах

export function setupIndexedDBMocks() {
  const stores: Record<string, Map<string, any>> = {
    plans: new Map(),
    workouts: new Map(),
    schedule: new Map(),
    settings: new Map(),
    scheduledWorkouts: new Map(),
  };

  // Мок для IDBKeyRange
  class MockIDBKeyRange {
    static only(value: any) {
      return { only: value, lower: value, upper: value, lowerOpen: false, upperOpen: false };
    }
    static lowerBound(value: any, open?: boolean) {
      return { lower: value, lowerOpen: open || false };
    }
    static upperBound(value: any, open?: boolean) {
      return { upper: value, upperOpen: open || false };
    }
    static bound(lower: any, upper: any, lowerOpen?: boolean, upperOpen?: boolean) {
      return { lower, upper, lowerOpen: lowerOpen || false, upperOpen: upperOpen || false };
    }
  }

  class MockIDBRequest {
    result: any = null;
    error: Error | null = null;
    onsuccess: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    readyState: 'pending' | 'done' = 'pending';

    constructor(public operation: string, public storeName: string, public key?: string, public value?: any) {
      // Используем Promise.resolve().then() для правильной работы с async/await
      Promise.resolve().then(() => {
        try {
          const store = stores[storeName];
          if (!store) {
            this.error = new Error(`Store ${storeName} not found`);
            this.readyState = 'done';
            if (this.onerror) this.onerror({ target: this });
            return;
          }

          switch (operation) {
            case 'get':
              this.result = store.get(key!) || undefined;
              break;
            case 'getAll':
              this.result = Array.from(store.values());
              break;
            case 'put':
              const actualKey = key || value?.id || value?.day || value?.key;
              if (actualKey) {
                store.set(actualKey, value);
                this.result = actualKey;
              }
              break;
            case 'delete':
              store.delete(key!);
              break;
            case 'clear':
              store.clear();
              break;
          }

          this.readyState = 'done';
          if (this.onsuccess) {
            this.onsuccess({ target: this });
          }
        } catch (error) {
          this.error = error as Error;
          this.readyState = 'done';
          if (this.onerror) this.onerror({ target: this });
        }
      });
    }
  }

  class MockIDBTransaction {
    oncomplete: (() => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    error: Error | null = null;
    private pendingRequests: Set<any> = new Set();

    constructor(public storeNames: string[], public mode: 'readonly' | 'readwrite') {}

    objectStore(name: string) {
      const self = this;
      return {
        get: (key: string) => {
          const req = new MockIDBRequest('get', name, key);
          self.pendingRequests.add(req);
          const originalOnsuccess = req.onsuccess;
          req.onsuccess = (event: any) => {
            if (originalOnsuccess) originalOnsuccess(event);
            self.pendingRequests.delete(req);
            self.checkComplete();
          };
          req.onerror = (event: any) => {
            self.pendingRequests.delete(req);
            self.checkComplete();
          };
          return req;
        },
        getAll: () => {
          const req = new MockIDBRequest('getAll', name);
          self.pendingRequests.add(req);
          const originalOnsuccess = req.onsuccess;
          req.onsuccess = (event: any) => {
            if (originalOnsuccess) originalOnsuccess(event);
            self.pendingRequests.delete(req);
            self.checkComplete();
          };
          req.onerror = (event: any) => {
            self.pendingRequests.delete(req);
            self.checkComplete();
          };
          return req;
        },
        put: (value: any, key?: string) => {
          const req = new MockIDBRequest('put', name, key, value);
          self.pendingRequests.add(req);
          const originalOnsuccess = req.onsuccess;
          req.onsuccess = (event: any) => {
            if (originalOnsuccess) originalOnsuccess(event);
            self.pendingRequests.delete(req);
            self.checkComplete();
          };
          req.onerror = (event: any) => {
            self.pendingRequests.delete(req);
            self.checkComplete();
          };
          return req;
        },
        delete: (key: string) => {
          const req = new MockIDBRequest('delete', name, key);
          self.pendingRequests.add(req);
          const originalOnsuccess = req.onsuccess;
          req.onsuccess = (event: any) => {
            if (originalOnsuccess) originalOnsuccess(event);
            self.pendingRequests.delete(req);
            self.checkComplete();
          };
          req.onerror = (event: any) => {
            self.pendingRequests.delete(req);
            self.checkComplete();
          };
          return req;
        },
        clear: () => {
          const req = new MockIDBRequest('clear', name);
          self.pendingRequests.add(req);
          const originalOnsuccess = req.onsuccess;
          req.onsuccess = (event: any) => {
            if (originalOnsuccess) originalOnsuccess(event);
            self.pendingRequests.delete(req);
            self.checkComplete();
          };
          req.onerror = (event: any) => {
            self.pendingRequests.delete(req);
            self.checkComplete();
          };
          return req;
        },
        index: (indexName: string) => {
          const transactionSelf = self;
          return {
            openCursor: (range?: any) => {
              const store = stores[name];
              let cursorIndex = 0;
              const filteredResults: Array<{ value: any; key: string }> = [];
              
              // Фильтруем результаты по range
              store.forEach((value, key) => {
                if (range && range.only !== undefined) {
                  if (value[indexName] === range.only) {
                    filteredResults.push({ value, key });
                  }
                } else if (range && range.lower !== undefined && range.upper !== undefined) {
                  const val = value[indexName];
                  if (val >= range.lower && val <= range.upper) {
                    filteredResults.push({ value, key });
                  }
                } else {
                  filteredResults.push({ value, key });
                }
              });
              
              const cursor = {
                result: null as any,
                onsuccess: null as ((event: any) => void) | null,
                onerror: null as ((event: any) => void) | null,
                continue: function() {
                  if (cursorIndex < filteredResults.length) {
                    const item = filteredResults[cursorIndex];
                    cursor.result = {
                      value: item.value,
                      key: item.key,
                      delete: function() {
                        store.delete(item.key);
                      },
                      continue: cursor.continue,
                    };
                    cursorIndex++;
                    Promise.resolve().then(() => {
                      if (cursor.onsuccess) {
                        cursor.onsuccess({ target: cursor });
                      }
                    });
                  } else {
                    cursor.result = null;
                    transactionSelf.pendingRequests.delete(cursor);
                    transactionSelf.checkComplete();
                    Promise.resolve().then(() => {
                      if (cursor.onsuccess) {
                        cursor.onsuccess({ target: cursor });
                      }
                    });
                  }
                },
              };
              
              transactionSelf.pendingRequests.add(cursor);
              
              Promise.resolve().then(() => {
                cursor.continue();
              });
              
              return cursor;
            },
          };
        },
      };
    }

    checkComplete(): void {
      if (this.pendingRequests.size === 0 && this.oncomplete) {
        Promise.resolve().then(() => {
          if (this.oncomplete) {
            this.oncomplete();
          }
        });
      }
    }
  }

  class MockIDBDatabase {
    objectStoreNames = {
      contains: (name: string) => Object.keys(stores).includes(name),
    };

    transaction(storeNames: string[], mode: 'readonly' | 'readwrite' = 'readonly') {
      return new MockIDBTransaction(storeNames, mode);
    }
  }

  const mockIndexedDB = {
    open: (_name: string, _version?: number) => {
      const request = {
        result: null as MockIDBDatabase | null,
        error: null,
        onsuccess: null as ((event: any) => void) | null,
        onerror: null as ((event: any) => void) | null,
        onupgradeneeded: null as ((event: any) => void) | null,
      };

      request.result = new MockIDBDatabase();

      Promise.resolve().then(() => {
        if (request.onupgradeneeded) {
          request.onupgradeneeded({ target: request });
        }
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      });

      return request;
    },
  };

  // Устанавливаем моки в глобальный объект
  const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                    (typeof window !== 'undefined' ? window : {});
  (globalObj as any).indexedDB = mockIndexedDB;
  (globalObj as any).IDBKeyRange = MockIDBKeyRange;

  return {
    stores,
    clearAll: () => {
      Object.values(stores).forEach(store => store.clear());
    },
  };
}
