import { shallowMount, Wrapper } from '@vue/test-utils';
import { VTooltip } from 'v-tooltip';

import VariableTag from '@/components/stepforms/widgets/VariableInputs/VariableTag.vue';

describe('Variable Tag', () => {
  let wrapper: Wrapper<VariableTag>;

  beforeEach(() => {
    wrapper = shallowMount(VariableTag, {
      sync: false,
      directives: {
        tooltip: VTooltip,
      },
      propsData: {
        value: '{{ appRequesters.view }}',
        variableDelimiters: { start: '{{', end: '}}' },
        availableVariables: [
          {
            category: 'App variables',
            label: 'view',
            identifier: 'appRequesters.view',
            value: 'Product 123',
          },
          {
            category: 'App variables',
            label: 'date.month',
            identifier: 'appRequesters.date.month',
            value: 'Apr',
          },
        ],
      },
    });
  });

  it('should instantiate', () => {
    expect(wrapper.exists()).toBeTruthy();
  });

  it('should compute the variable identifier', () => {
    expect((wrapper as any).vm.variableIdentifier).toBe('appRequesters.view');
  });

  it('should compute the variable', () => {
    expect((wrapper as any).vm.variable).toStrictEqual({
      category: 'App variables',
      label: 'view',
      identifier: 'appRequesters.view',
      value: 'Product 123',
    });
  });

  it('should compute the variable value', () => {
    expect((wrapper as any).vm.variableValue).toBe('Product 123');
  });

  it('should display a tooltip on hover', () => {
    expect(wrapper.classes()).toContain('has-weaverbird__tooltip');
  });

  it('should display the tag label', () => {
    const name = wrapper.find('.widget-variable__tag-name');
    expect(name.exists()).toBe(true);
    expect(name.text()).toBe('view');
  });

  it('should display the remove button', () => {
    expect(wrapper.find('.widget-variable__tag-close').exists()).toBe(true);
  });

  it('should remove the tag when clicking on the remove button', async () => {
    const removeButton = wrapper.find('.widget-variable__tag-close');
    removeButton.trigger('mousedown');
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted().removed).toBeTruthy();
  });

  describe('if the variable is not listed in available variables', () => {
    beforeEach(() => {
      wrapper.setProps({
        value: '{{ toto }}',
      });
    });
    it('should display the identifier instead of the human-friendly label', () => {
      expect(wrapper.find('.widget-variable__tag-name').text()).toBe('toto');
    });
    it('should display nothing instead of the human-friendly value', () => {
      expect((wrapper as any).vm.variableValue).toBe('');
    });
  });
});
