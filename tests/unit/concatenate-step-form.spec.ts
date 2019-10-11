import { mount, shallowMount, createLocalVue } from '@vue/test-utils';
import ConcatenateStepForm from '@/components/stepforms/ConcatenateStepForm.vue';
import Vuex, { Store } from 'vuex';
import { setupMockStore } from './utils';
import { Pipeline } from '@/lib/steps';

const localVue = createLocalVue();
localVue.use(Vuex);

interface ValidationError {
  dataPath: string;
  keyword: string;
}

describe('Concatenate Step Form', () => {
  let emptyStore: Store<any>;
  beforeEach(() => {
    emptyStore = setupMockStore({});
  });

  it('should instantiate', () => {
    const wrapper = shallowMount(ConcatenateStepForm, { store: emptyStore, localVue });
    expect(wrapper.exists()).toBeTruthy();
    expect(wrapper.vm.$data.stepname).toEqual('concatenate');
  });

  describe('ListWidget', () => {
    it('should have exactly on ListWidget component', () => {
      const wrapper = shallowMount(ConcatenateStepForm, { store: emptyStore, localVue });
      const widgetWrappers = wrapper.findAll('listwidget-stub');
      expect(widgetWrappers.length).toEqual(1);
    });

    it('should pass down the "toConcatenate" prop to the ListWidget value prop', async () => {
      const wrapper = shallowMount(ConcatenateStepForm, { store: emptyStore, localVue });
      wrapper.setData({
        editedStep: {
          name: 'concatenate',
          columns: ['foo', 'bar'],
          separator: '-',
          new_column_name: 'new',
        },
      });
      await localVue.nextTick();
      expect(wrapper.find('listwidget-stub').props().value).toEqual(['foo', 'bar']);
    });
  });

  it('should report errors when submitted data is not valid', () => {
    const store = setupMockStore({
      dataset: {
        headers: [{ name: 'foo', type: 'string' }],
        data: [[null]],
      },
    });
    const wrapper = mount(ConcatenateStepForm, {
      store,
      localVue,
    });
    wrapper.find('.widget-form-action__button--validate').trigger('click');
    const errors = wrapper.vm.$data.errors.map((err: ValidationError) => ({
      keyword: err.keyword,
      dataPath: err.dataPath,
    }));
    expect(errors).toEqual([
      { dataPath: '.columns[0]', keyword: 'minLength' },
      { dataPath: '.new_column_name', keyword: 'minLength' },
    ]);
  });

  it('should validate and emit "formSaved" when submitting a valid condition', () => {
    const store = setupMockStore({
      dataset: {
        headers: [{ name: 'foo', type: 'string' }, { name: 'bar', type: 'string' }],
        data: [[null], [null]],
      },
    });
    const wrapper = mount(ConcatenateStepForm, {
      store,
      localVue,
      sync: false,
      propsData: {
        initialStepValue: {
          name: 'concatenate',
          columns: ['foo', 'bar'],
          separator: '-',
          new_column_name: 'new',
        },
      },
    });
    wrapper.find('.widget-form-action__button--validate').trigger('click');
    expect(wrapper.vm.$data.errors).toBeNull();
    expect(wrapper.emitted()).toEqual({
      formSaved: [
        [
          {
            name: 'concatenate',
            columns: ['foo', 'bar'],
            separator: '-',
            new_column_name: 'new',
          },
        ],
      ],
    });
  });

  it('should emit "cancel" event when edition is cancelled', () => {
    const wrapper = mount(ConcatenateStepForm, { store: emptyStore, localVue });
    wrapper.find('.widget-form-action__button--cancel').trigger('click');
    expect(wrapper.emitted()).toEqual({
      cancel: [[]],
    });
  });

  it('should reset selectedStepIndex correctly on cancel depending on isStepCreation', () => {
    const pipeline: Pipeline = [
      { name: 'domain', domain: 'foo' },
      { name: 'rename', oldname: 'foo', newname: 'bar' },
      { name: 'rename', oldname: 'baz', newname: 'spam' },
      { name: 'rename', oldname: 'tic', newname: 'tac' },
    ];
    const store: Store<any> = setupMockStore({
      pipeline,
      selectedStepIndex: 2,
    });
    const wrapper = mount(ConcatenateStepForm, { store, localVue });
    wrapper.setProps({ isStepCreation: true });
    wrapper.find('.widget-form-action__button--cancel').trigger('click');
    expect(store.state.vqb.selectedStepIndex).toEqual(2);
    wrapper.setProps({ isStepCreation: false });
    wrapper.find('.widget-form-action__button--cancel').trigger('click');
    expect(store.state.vqb.selectedStepIndex).toEqual(3);
  });
});
