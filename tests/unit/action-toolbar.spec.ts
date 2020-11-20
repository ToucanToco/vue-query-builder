import { createLocalVue, mount, shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';

import ActionToolbar from '@/components/ActionToolbar.vue';
import ActionToolbarButton from '@/components/ActionToolbarButton.vue';
import { CATEGORY_BUTTONS } from '@/components/constants';

import { setupMockStore } from './utils';

const localVue = createLocalVue();
localVue.use(Vuex);

describe('ActionToolbar', () => {
  it('should instantiate action toolbar buttons with right classes', () => {
    const wrapper = mount(ActionToolbar, {
      propsData: {
        buttons: CATEGORY_BUTTONS,
      },
      localVue,
      store: setupMockStore({}),
    });
    const actionButtons = wrapper.findAll(ActionToolbarButton);
    expect(actionButtons.length).toEqual(8);
    expect(actionButtons.at(0).props().category).toEqual('add');
    expect(actionButtons.at(0).classes()).toContain('action-toolbar__btn');
    expect(actionButtons.at(1).props().category).toEqual('filter');
    expect(actionButtons.at(1).classes()).toContain('action-toolbar__btn');
    expect(actionButtons.at(2).props().category).toEqual('aggregate');
    expect(actionButtons.at(2).classes()).toContain('action-toolbar__btn');
    expect(actionButtons.at(3).props().category).toEqual('compute');
    expect(actionButtons.at(3).classes()).toContain('action-toolbar__btn');
    expect(actionButtons.at(4).props().category).toEqual('text');
    expect(actionButtons.at(4).classes()).toContain('action-toolbar__btn');
    expect(actionButtons.at(5).props().category).toEqual('date');
    expect(actionButtons.at(5).classes()).toContain('action-toolbar__btn');
    expect(actionButtons.at(6).props().category).toEqual('reshape');
    expect(actionButtons.at(6).classes()).toContain('action-toolbar__btn');
    expect(actionButtons.at(7).props().category).toEqual('combine');
    expect(actionButtons.at(7).classes()).toContain('action-toolbar__btn');
  });

  it('should instantiate with its hidden popover', () => {
    const wrapper = shallowMount(ActionToolbar, {
      propsData: {
        buttons: [
          {
            category: 'filter',
            icon: 'filter',
            label: 'Filter',
          },
        ],
      },
      localVue,
      store: setupMockStore(),
    });
    const actionButtons = wrapper.findAll('action-toolbar-button-stub');
    const button = actionButtons.at(0);
    expect(button.props('isActive')).toBeFalsy();
  });

  it('should open a popover on action toolbar click', async () => {
    const wrapper = shallowMount(ActionToolbar, {
      propsData: {
        buttons: [
          {
            category: 'filter',
            icon: 'filter',
            label: 'Filter',
          },
        ],
      },
      localVue,
      store: setupMockStore(),
    });
    const actionButtons = wrapper.findAll('action-toolbar-button-stub');
    const button = actionButtons.at(0);
    expect(button.props('isActive')).toBeFalsy();
    button.trigger('click');
    await localVue.nextTick();
    expect(button.props('isActive')).toBeTruthy();
  });

  it('should close the current popover when an other button is clicked', async () => {
    const wrapper = shallowMount(ActionToolbar, {
      propsData: {
        buttons: [
          {
            category: 'filter',
            icon: 'filter',
            label: 'Filter',
          },
          {
            category: 'compute',
            icon: 'compute',
            label: 'Compute',
          },
        ],
      },
      localVue,
      store: setupMockStore(),
    });
    const actionButtons = wrapper.findAll('action-toolbar-button-stub');
    const button1 = actionButtons.at(0);
    const button2 = actionButtons.at(1);
    button1.trigger('click');
    await localVue.nextTick();
    expect(button1.props('isActive')).toBeTruthy();
    button2.trigger('click');
    await localVue.nextTick();
    expect(button1.props('isActive')).toBeFalsy();
  });

  it('should instantiate the search bar', () => {
    const wrapper = shallowMount(ActionToolbar, {
      propsData: {
        buttons: [
          {
            category: 'filter',
            icon: 'filter',
            label: 'Filter',
          },
        ],
      },
      localVue,
      store: setupMockStore(),
    });
    const searchBar = wrapper.findAll('search-bar-stub');
    expect(searchBar.exists()).toBeTruthy();
  });
});
