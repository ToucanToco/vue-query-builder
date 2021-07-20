<template>
  <div class="action-toolbar-search">
    <button
      type="button"
      :class="{
        'action-toolbar-search__btn': true,
        'action-toolbar-search__btn--active': isActive,
      }"
    >
      <i class="action-toolbar-search__btn-icon fa fa-search" aria-hidden="true" />
      <popover :visible="isActive" :align="'left'" bottom @closed="$emit('closed')">
        <div class="action-menu__body action-toolbar-search__popover">
          <multiselect
            ref="searchComponent"
            :options="actionOptions"
            label="label"
            track-by="label"
            :placeholder="'Search'"
            :reset-after="true"
            group-label="type"
            group-values="actions"
            :group-select="false"
            :maxHeight="300"
            open-direction="bottom"
            @select="actionClicked"
          />
        </div>
      </popover>
    </button>
  </div>
</template>
<script lang="ts">
import Multiselect from 'vue-multiselect';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';

import { PipelineStepName } from '@/lib/steps';

import { VQBModule } from '../store';
import { SEARCH_ACTION } from './constants';
import Popover from './Popover.vue';

@Component({
  name: 'action-toolbar-search',
  components: {
    Popover,
    Multiselect,
  },
})
export default class SearchActions extends Vue {
  @VQBModule.Getter translator!: string;
  @VQBModule.Getter unsupportedSteps!: PipelineStepName[];

  @Prop({
    type: Boolean,
    default: () => false,
  })
  isActive!: boolean;

  @Watch('isActive')
  async onIsActiveChanged() {
    if (this.isActive) {
      await this.$nextTick();
      this.focusSearchBar();
    }
  }

  get actionOptions() {
    return SEARCH_ACTION.map(e => ({
      ...e,
      actions: e.actions.filter(a => !this.unsupportedSteps.includes(a.name)),
    }));
  }

  mounted() {
    if (this.isActive) {
      this.focusSearchBar();
    }
  }

  focusSearchBar() {
    this.$refs.searchComponent?.$el.focus();
  }

  actionClicked(actionName: { name: PipelineStepName }) {
    this.$emit('actionClicked', actionName.name);
    this.$emit('closed');
  }
}
</script>
<style lang="scss">
@import '../styles/_variables';

.action-toolbar-search__btn {
  background: #fafafa;
  border-radius: 5px;
  border: 1px solid #fafafa;
  color: #878787;
  padding: 10px 0;
  text-align: center;
  width: 48px;
  height: 100%;
  transition: all ease-in-out 100ms;
  cursor: pointer;
  &:focus {
    outline: none;
  }
  &:hover {
    background: #f4f7fa;
    color: $active-color;
  }
}

.action-toolbar-search__btn-icon {
  font-size: 18px;
}

.action-toolbar-search__btn--active {
  background: $active-color;
  color: #fff;
  &:hover {
    background: $active-color;
    color: #fff;
  }
}

.action-toolbar-search__popover {
  $multiselect__search_input-height: 43px;
  $multiselect__dropdown_max-height: 300px;

  padding: 10px 10px;
  min-width: 400px;
  min-height: $multiselect__search_input-height + $multiselect__dropdown_max-height;
}

/* Vue multiselect style overwrite */

.action-toolbar-search__popover .multiselect {
  box-sizing: border-box;
  border: 0;
  color: #999999;
  margin: 0;
}
.action-toolbar-search__popover .multiselect__tags {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 5px;
  box-shadow: none;
  padding-left: 35px;
  padding-right: 20px;
  min-height: 43px;
  &:before {
    font-family: 'Font Awesome 5 Pro', 'Font Awesome 5 Free', sans-serif;
    content: '\f002';
    -webkit-font-smoothing: antialiased;
    display: block;
    font-style: normal;
    font-variant: normal;
    text-rendering: auto;
    font-weight: 900;
    line-height: 1;
    font-size: 16px;
    color: #999999;
    position: absolute;
    left: 10px;
    top: 13px;
    width: 16px;
    height: 16px;
  }
}
.action-toolbar-search__popover .multiselect--active .multiselect__content-wrapper {
  max-height: 280px !important;
}
.action-toolbar-search__popover .multiselect--active .multiselect__tags {
  box-shadow: none;
  border-color: #2665a3;
}
.action-toolbar-search__popover .multiselect__placeholder {
  padding: 0;
}
.action-toolbar-search__popover .multiselect__select {
  display: none;
}
.action-toolbar-search__popover .multiselect__input {
  font-size: 12px;
  line-height: 25px;
  padding: 0px;
  position: absolute;
}

.action-toolbar-search__popover .multiselect__option {
  color: $base-color;
  font-size: 12px;
  padding: 10px 10px 10px 15px;
  box-shadow: none;
  min-height: 0;
  &:focus {
    outline: none;
  }
}
.action-toolbar-search__popover .multiselect__option--group {
  background: none !important;
  color: $base-color !important;
  border-top: 1px solid #e0e0e0;
  font-weight: bold;
  box-shadow: none;
  min-height: 30px;
  padding-bottom: 0;
  padding-left: 12px;
  text-transform: capitalize;
}
.action-toolbar-search__popover .multiselect__element:first-child .multiselect__option--group {
  border: 0;
}
</style>
