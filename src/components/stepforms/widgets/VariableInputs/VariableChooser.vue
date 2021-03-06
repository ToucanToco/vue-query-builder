<template>
  <popover
    class="widget-variable-chooser"
    :visible="isOpened"
    :align="alignLeft"
    bottom
    @closed="close"
  >
    <div class="widget-variable-chooser__options-container">
      <div
        class="widget-variable-chooser__options-section"
        v-for="category in variablesByCategory"
        :key="category.label"
      >
        <div class="widget-variable-chooser__option-section-title" v-if="category.label">
          {{ category.label }}
        </div>
        <div
          class="widget-variable-chooser__option"
          :class="{ 'widget-variable-chooser__option--selected': availableVariable.selected }"
          v-for="availableVariable in category.variables"
          :key="availableVariable.identifier"
          v-tooltip="{
            targetClasses: 'has-weaverbird__tooltip',
            classes: 'weaverbird__tooltip',
            content: makeValueReadable(availableVariable.value),
            placement: 'bottom-center',
          }"
          @click="chooseVariable(availableVariable.identifier)"
        >
          <div class="widget-variable-chooser__option-container">
            <span v-if="isMultiple" class="widget-variable-chooser__option-toggle" />
            <span class="widget-variable-chooser__option-name">{{ availableVariable.label }}</span>
          </div>
          <span class="widget-variable-chooser__option-value">{{
            formatIfDate(availableVariable.value)
          }}</span>
        </div>
      </div>
      <div class="widget-advanced-variable" @click="addAdvancedVariable">
        Advanced variable
      </div>
    </div>
  </popover>
</template>

<script lang="ts">
import VTooltip from 'v-tooltip';
import { Component, Prop, Vue } from 'vue-property-decorator';

import { POPOVER_ALIGN } from '@/components/constants';
import Popover from '@/components/Popover.vue';
import { VariablesBucket, VariablesCategory } from '@/lib/variables';

Vue.use(VTooltip);
/**
 * This component list all the available variables to use as value in VariableInputs
 */
@Component({
  name: 'variable-chooser',
  components: { Popover },
})
export default class VariableChooser extends Vue {
  @Prop({ default: false })
  isMultiple!: boolean;

  @Prop({ default: () => [] })
  selectedVariables!: string[];

  @Prop({ default: () => [] })
  availableVariables!: VariablesBucket;

  @Prop({ default: false })
  isOpened!: boolean;

  alignLeft: string = POPOVER_ALIGN.LEFT;

  /**
   * Group variables by category to easily choose among them
   *
   * https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_groupby
   */
  get variablesByCategory(): VariablesCategory[] {
    return this.availableVariables.reduce((categories: VariablesCategory[], variable) => {
      const varCategoryLabel = variable.category;
      const category = categories.find(c => c.label === varCategoryLabel);
      const variableObj = {
        ...variable,
        selected: this.isVariableSelected(variable.identifier),
      };
      if (category !== undefined) {
        category.variables.push(variableObj);
      } else {
        categories.push({
          label: varCategoryLabel,
          variables: [variableObj],
        });
      }
      return categories;
    }, []);
  }

  formatIfDate(value: any): any {
    if (value instanceof Date) {
      return value.toUTCString();
    }
    return value;
  }

  /**
  Return a readable value to display as tooltip
  **/
  makeValueReadable(value: any): string {
    return JSON.stringify(value);
  }

  /**
  Verify if item is selected (multiple mode)
  **/
  isVariableSelected(variableIdentifier: string): boolean {
    return this.isMultiple && this.selectedVariables.indexOf(variableIdentifier) != -1;
  }

  close() {
    this.$emit('closed');
  }

  /**
   * Emit the choosen variable
   */
  chooseVariable(variableIdentifier: string) {
    this.$emit('input', variableIdentifier);
  }

  addAdvancedVariable() {
    this.$emit('addAdvancedVariable');
  }
}
</script>

<style scoped lang="scss">
@import '../../../../styles/variables';

.widget-variable-chooser__options-container {
  display: flex;
  border-radius: 2px;
  width: 200px;
  max-height: 300px;
  background-color: #fff;
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.25);
  color: $base-color;
  overflow: hidden;
  flex-direction: column;
  overflow-y: auto;
}

.widget-variable-chooser__options-section {
  border-bottom: 1px solid #eeeeee;
  padding-bottom: 10px;
}

.widget-variable-chooser__option-section-title {
  font-style: italic;
  color: #888888;
  font-size: 10px;
  font-weight: 500;
}

.widget-variable-chooser__option-section-title,
.widget-variable-chooser__option {
  padding: 12px;
}

.widget-variable-chooser__option {
  &:hover {
    background-color: rgba(42, 102, 161, 0.05);
    color: #2a66a1;
    .widget-variable-chooser__option-value {
      color: #2a66a1;
    }
    .widget-variable-chooser__option-toggle {
      border-color: #2a66a1;
    }
  }
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.widget-variable-chooser__option-container {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.widget-variable-chooser__option-name {
  font-size: 12px;
  font-weight: 500;
}

.widget-variable-chooser__option-value {
  font-size: 10px;
  font-weight: 500;
  color: #888888;
  flex-shrink: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-left: 1em;
}

.widget-advanced-variable {
  padding: 12px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  background: #f5f5f5;
  color: #888888;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.widget-variable-chooser__option-toggle {
  position: relative;
  background: white;
  width: 12px;
  height: 12px;
  border: 1px solid #d4d4d4;
  border-radius: 1px;
  margin-right: 10px;

  &:active,
  &:focus,
  &:hover {
    border-color: #2a66a1;
  }

  &::before,
  &::after {
    content: '';
    order: -1;
    display: block;
    background: black;
    height: 2px;
    top: 4px;
    position: absolute;
    opacity: 0;
  }

  &::before {
    right: 1px;
    width: 7px;
    transform: rotate(-45deg);
  }

  &::after {
    left: 1px;
    width: 3px;
    transform: rotate(45deg);
  }
}

.widget-variable-chooser__option--selected {
  background: #f5f5f5;
  .widget-variable-chooser__option-toggle {
    background: black;
    border-color: black;
    &::before,
    &::after {
      background: white;
      opacity: 1;
    }
  }
  &:hover {
    .widget-variable-chooser__option-toggle {
      background: #2a66a1;
    }
  }
}
</style>
