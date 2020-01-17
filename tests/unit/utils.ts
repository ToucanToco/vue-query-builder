import Vuex, { Store } from 'vuex';

import { registerModule } from '@/store';
import { VQBState } from '@/store/state';

export type RootState = {
  vqb: VQBState;
};

export interface ValidationError {
  dataPath: string;
  keyword: string;
  message?: string;
}

export function setupMockStore(initialState: object = {}, plugins: any[] = []) {
  const store: Store<RootState> = new Vuex.Store({ plugins });
  registerModule(store, initialState);

  return store;
}
