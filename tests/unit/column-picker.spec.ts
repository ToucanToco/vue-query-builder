import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';

import ColumnPicker from '@/components/stepforms/ColumnPicker.vue';
import { VQBnamespace } from '@/store';

import { RootState, setupMockStore } from './utils';

const localVue = createLocalVue();
localVue.use(Vuex);

describe('Column Picker', () => {
  let emptyStore: Store<RootState>;
  beforeEach(() => {
    emptyStore = setupMockStore({});
  });

  it('should instantiate', () => {
    const wrapper = shallowMount(ColumnPicker, { store: emptyStore, localVue });
    expect(wrapper.exists()).toBeTruthy();
  });

  it('should have a widget autocomplete', () => {
    const wrapper = shallowMount(ColumnPicker, { store: emptyStore, localVue });
    expect(wrapper.find('autocompletewidget-stub').exists()).toBeTruthy();
  });

  it('should instantiate an autocomplete widget with proper options from the store', () => {
    const store = setupMockStore({
      dataset: {
        headers: [{ name: 'columnA' }, { name: 'columnB' }, { name: 'columnC' }],
        data: [],
      },
    });
    const wrapper = shallowMount(ColumnPicker, { store, localVue });
    const selectWrapper = wrapper.find('autocompletewidget-stub');
    expect(selectWrapper.attributes('options')).toEqual('columnA,columnB,columnC');
  });

  it('should set column when initial column value is set', () => {
    const store = setupMockStore({
      dataset: {
        headers: [{ name: 'columnA' }, { name: 'columnB' }, { name: 'columnC' }],
        data: [],
      },
    });
    const wrapper = shallowMount(ColumnPicker, {
      store,
      localVue,
      propsData: {
        value: 'columnA',
      },
    });
    expect(wrapper.vm.$data.column).toEqual('columnA');
  });

  it('should update step when selectedColumn is changed by default', async () => {
    const store = setupMockStore({
      dataset: {
        headers: [{ name: 'columnA' }, { name: 'columnB' }, { name: 'columnC' }],
        data: [],
      },
      selectedColumns: ['columnA'],
    });
    const wrapper = shallowMount(ColumnPicker, {
      store,
      localVue,
    });
    expect(wrapper.vm.$data.column).toEqual('columnA');
    store.commit(VQBnamespace('setSelectedColumns'), { column: 'columnB' });
    await localVue.nextTick();
    expect(wrapper.vm.$data.column).toEqual('columnB');
    expect(store.state.vqb.selectedColumns).toEqual(['columnB']);
  });

  it('should not update step when selectedColumn is changed if prop "sync" is false', async () => {
    const store = setupMockStore({
      dataset: {
        headers: [{ name: 'columnA' }, { name: 'columnB' }, { name: 'columnC' }],
        data: [],
      },
      selectedColumns: ['columnA'],
    });
    const wrapper = shallowMount(ColumnPicker, {
      store,
      localVue,
      propsData: {
        syncWithSelectedColumn: false,
      },
    });
    expect(wrapper.vm.$data.column).toEqual('columnA');
    store.commit(VQBnamespace('setSelectedColumns'), { column: 'columnB' });
    await localVue.nextTick();
    expect(wrapper.vm.$data.column).toEqual('columnA');
    expect(store.state.vqb.selectedColumns).toEqual(['columnB']);
  });
});
