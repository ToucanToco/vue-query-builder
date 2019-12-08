import { mount, shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';

import SelectColumnStepForm from '@/components/stepforms/SelectColumnStepForm.vue';
import MultiselectWidget from '@/components/stepforms/widgets/Multiselect.vue';
import { Pipeline } from '@/lib/steps';

import { setupMockStore } from './utils';

const localVue = createLocalVue();
localVue.use(Vuex);

interface ValidationError {
  dataPath: string;
  keyword: string;
}

describe('Select Column Step Form', () => {
  let emptyStore: Store<any>;
  beforeEach(() => {
    emptyStore = setupMockStore({});
  });

  it('should instantiate', () => {
    const wrapper = shallowMount(SelectColumnStepForm, { store: emptyStore, localVue });
    expect(wrapper.exists()).toBeTruthy();
    expect(wrapper.vm.$data.stepname).toEqual('select');
  });

  it('should have a widget multiselect', () => {
    const wrapper = shallowMount(SelectColumnStepForm, { store: emptyStore, localVue });

    expect(wrapper.find('multiselectwidget-stub').exists()).toBeTruthy();
  });

  it('should instantiate a multiselect widget with proper options from the store', () => {
    const store = setupMockStore({
      dataset: {
        headers: [{ name: 'columnA' }, { name: 'columnB' }, { name: 'columnC' }],
        data: [],
      },
    });
    const wrapper = shallowMount(SelectColumnStepForm, { store, localVue });
    const widgetAutocomplete = wrapper.find('multiselectwidget-stub');

    expect(widgetAutocomplete.attributes('options')).toEqual('columnA,columnB,columnC');
  });

  it('should report errors when submitted data is not valid', () => {
    const wrapper = mount(SelectColumnStepForm, { store: emptyStore, localVue });
    wrapper.find('.widget-form-action__button--validate').trigger('click');
    const errors = wrapper.vm.$data.errors.map((err: ValidationError) => ({
      keyword: err.keyword,
      dataPath: err.dataPath,
    }));
    expect(errors).toEqual([{ keyword: 'minItems', dataPath: '.columns' }]);
  });

  it('should validate and emit "formSaved" when submitted data is valid', () => {
    const wrapper = mount(SelectColumnStepForm, {
      store: emptyStore,
      localVue,
      propsData: {
        initialStepValue: { name: 'select', columns: ['foo'] },
      },
    });
    wrapper.find('.widget-form-action__button--validate').trigger('click');
    expect(wrapper.vm.$data.errors).toBeNull();
    expect(wrapper.emitted()).toEqual({
      formSaved: [[{ name: 'select', columns: ['foo'] }]],
    });
  });

  it('should emit "cancel" event when edition is canceled', () => {
    const pipeline: Pipeline = [
      { name: 'domain', domain: 'foo' },
      { name: 'rename', oldname: 'foo', newname: 'bar' },
    ];
    const store = setupMockStore({
      pipeline,
      selectedStepIndex: 1,
    });

    const wrapper = mount(SelectColumnStepForm, { store, localVue });
    wrapper.find('.widget-form-action__button--cancel').trigger('click');
    expect(wrapper.emitted()).toEqual({ cancel: [[]] });
    expect(store.state.vqb.selectedStepIndex).toEqual(1);
    expect(store.state.vqb.pipeline).toEqual([
      { name: 'domain', domain: 'foo' },
      { name: 'rename', oldname: 'foo', newname: 'bar' },
    ]);
  });

  it('should update selectedColumn when column is changed', async () => {
    const store = setupMockStore({
      dataset: {
        headers: [{ name: 'columnA' }, { name: 'columnB' }, { name: 'columnC' }],
        data: [],
      },
      selectedColumns: ['columnA'],
    });
    const wrapper = mount(SelectColumnStepForm, {
      propsData: {
        initialValue: {
          columns: ['columnA'],
        },
      },
      store,
      localVue,
    });
    wrapper.setData({ editedStep: { columns: ['columnB'] } });
    await wrapper.find(MultiselectWidget).trigger('input');
    expect(store.state.vqb.selectedColumns).toEqual(['columnB']);
  });

  it('should reset selectedStepIndex correctly on cancel depending on isStepCreation', () => {
    const pipeline: Pipeline = [
      { name: 'domain', domain: 'foo' },
      { name: 'rename', oldname: 'foo', newname: 'bar' },
      { name: 'rename', oldname: 'baz', newname: 'spam' },
      { name: 'rename', oldname: 'tic', newname: 'tac' },
    ];
    const store = setupMockStore({
      pipeline,
      selectedStepIndex: 2,
    });
    const wrapper = mount(SelectColumnStepForm, { store, localVue });
    wrapper.setProps({ isStepCreation: true });
    wrapper.find('.widget-form-action__button--cancel').trigger('click');
    expect(store.state.vqb.selectedStepIndex).toEqual(2);
    wrapper.setProps({ isStepCreation: false });
    wrapper.find('.widget-form-action__button--cancel').trigger('click');
    expect(store.state.vqb.selectedStepIndex).toEqual(3);
  });
});
