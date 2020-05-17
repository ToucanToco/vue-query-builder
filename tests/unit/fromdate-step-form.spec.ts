import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';

import FromDateStepForm from '@/components/stepforms/FromDateStepForm.vue';

import { BasicStepFormTestRunner, setupMockStore } from './utils';

const localVue = createLocalVue();
localVue.use(Vuex);

describe('Convert Date to String Step Form', () => {
  const runner = new BasicStepFormTestRunner(FromDateStepForm, 'fromdate');
  runner.testInstantiate();
  runner.testExpectedComponents({
    'columnpicker-stub': 1,
    'autocompletewidget-stub': 1,
    'inputtextwidget-stub': 0,
  });

  it('should have 1 inputtext when custom format is selected', () => {
    const wrapper = shallowMount(FromDateStepForm, {
      store: setupMockStore({}),
      localVue,
      propsData: {
        initialStepValue: { name: 'fromdate', column: '', format: '' },
      },
    });
    const inputtextwidget = wrapper.findAll('inputtextwidget-stub');
    expect(inputtextwidget.length).toEqual(1);
  });

  it('should update editedStep with the selected column at creation', () => {
    const initialState = {
      dataset: {
        headers: [{ name: 'foo', type: 'string' }],
        data: [[null]],
      },
      selectedColumns: ['foo'],
    };
    const wrapper = runner.shallowMount(initialState);
    expect(wrapper.vm.$data.editedStep.column).toEqual('foo');
  });

  it('should update editedStep.format properly when a new format is selected', () => {
    const wrapper = shallowMount(FromDateStepForm, {
      store: setupMockStore({}),
      localVue,
    });
    wrapper
      .find('autocompletewidget-stub')
      .vm.$emit('input', { format: 'custom', label: '%Y-%m', example: '' });
    expect(wrapper.vm.$data.editedStep.format).toEqual('');
    wrapper
      .find('autocompletewidget-stub')
      .vm.$emit('input', { format: '%Y-%m', label: '%Y-%m', example: '1970-12' });
    expect(wrapper.vm.$data.editedStep.format).toEqual('%Y-%m');
  });

  it('should pass down the right value to autcomplete', () => {
    const wrapper = shallowMount(FromDateStepForm, {
      store: setupMockStore({}),
      localVue,
      propsData: {
        initialStepValue: { name: 'fromdate', column: '', format: '' },
      },
    });
    expect(wrapper.find('.format').vm.$props.value.format).toEqual('custom');
    wrapper.setData({ editedStep: { name: 'todate', column: '', format: '%Y-%m' } });
    expect(wrapper.find('.format').vm.$props.value.format).toEqual('%Y-%m');
  });
});
