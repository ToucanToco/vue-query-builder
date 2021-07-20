<template>
  <popover :visible="visible" :align="alignLeft" bottom @closed="close">
    <div class="action-menu__body">
      <transition name="slide-left" mode="out-in">
        <div v-if="visiblePanel == 1">
          <div class="action-menu__panel">
            <div
              class="action-menu__option"
              v-if="isStepSupported('rename')"
              @click="openStep('rename')"
            >
              Rename column
            </div>
            <div
              class="action-menu__option"
              v-if="isStepSupported('duplicate')"
              @click="openStep('duplicate')"
            >
              Duplicate column
            </div>
            <div
              class="action-menu__option"
              v-if="isStepSupported('delete')"
              @click="createDeleteColumnStep"
            >
              Delete column
            </div>
            <div
              class="action-menu__option action-menu__option--top-bordered"
              @click="visiblePanel = 2"
            >
              Other operations
            </div>
            <div
              class="action-menu__option--top-bordered"
              v-if="isStepSupported('filter') && isStepSupported('uniquegroups')"
            >
              <ListUniqueValues
                v-if="currentUnique"
                :options="currentUnique.values"
                :filter="condition"
                :loaded="currentUnique.loaded"
                @input="condition = $event"
              />
              <div
                v-if="isApplyFilterVisible"
                class="action-menu__apply-filter"
                @click="createFilterStep"
              >
                Apply Filter
              </div>
            </div>
          </div>
        </div>
      </transition>
      <transition name="slide-right" mode="out-in">
        <div v-if="visiblePanel == 2">
          <div class="action-menu__panel">
            <div class="action-menu__option--back" @click="visiblePanel = 1">
              <i class="fas fa-angle-left" aria-hidden="true" /> BACK
            </div>
            <div
              class="action-menu__option action-menu__option--top-bordered"
              v-if="isStepSupported('filter')"
              @click="openStep('filter')"
            >
              Filter values
            </div>
            <div
              class="action-menu__option"
              v-if="isStepSupported('fillna')"
              @click="openStep('fillna')"
            >
              Fill null values
            </div>
            <div
              class="action-menu__option"
              v-if="isStepSupported('replace')"
              @click="openStep('replace')"
            >
              Replace values
            </div>
            <div
              class="action-menu__option"
              v-if="isStepSupported('sort')"
              @click="openStep('sort')"
            >
              Sort values
            </div>
            <div
              class="action-menu__option"
              v-if="isStepSupported('uniquegroups')"
              @click="createUniqueGroupsStep"
            >
              Get unique values
            </div>
            <div
              class="action-menu__option"
              v-if="isStepSupported('statistics')"
              @click="openStep('statistics')"
            >
              Compute Statistics
            </div>
          </div>
        </div>
      </transition>
    </div>
  </popover>
</template>
<script lang="ts">
import _isEqual from 'lodash/isEqual';
import { Component, Prop, Vue } from 'vue-property-decorator';

import { POPOVER_ALIGN } from '@/components/constants';
import ListUniqueValues from '@/components/ListUniqueValues.vue';
import { DataSetColumn } from '@/lib/dataset';
import { FilterConditionInclusion, Pipeline, PipelineStep, PipelineStepName } from '@/lib/steps';
import { VQBModule } from '@/store';
import { MutationCallbacks } from '@/store/mutations';

import Popover from './Popover.vue';

enum VisiblePanel {
  'MAIN OPERATIONS',
  'OTHER OPERATIONS',
}

@Component({
  name: 'action-menu',
  components: {
    Popover,
    ListUniqueValues,
  },
})
export default class ActionMenu extends Vue {
  @Prop({
    type: String,
    default: () => '',
  })
  columnName!: string;
  visiblePanel: VisiblePanel = 1;

  @Prop({
    type: Boolean,
    default: true,
  })
  visible!: boolean;

  @VQBModule.Getter computedActiveStepIndex!: number;
  @VQBModule.Getter isEditingStep!: boolean;
  @VQBModule.Getter pipeline!: Pipeline;
  @VQBModule.Getter columnHeaders!: Pipeline;
  @VQBModule.Getter unsupportedSteps!: PipelineStepName[];

  get currentUnique() {
    return (this.columnHeaders.find(hdr => hdr.name === this.columnName) as DataSetColumn).uniques;
  }

  get isStepSupported() {
    return (stepName: PipelineStepName): boolean => !this.unsupportedSteps.includes(stepName);
  }

  @VQBModule.Action selectStep!: ({ index }: { index: number }) => void;
  @VQBModule.Mutation setPipeline!: MutationCallbacks['setPipeline'];
  @VQBModule.Mutation closeStepForm!: () => void;

  alignLeft: string = POPOVER_ALIGN.LEFT;

  condition: FilterConditionInclusion = { column: this.columnName, value: [], operator: 'nin' };

  get isApplyFilterVisible() {
    return !_isEqual(this.condition, { column: this.columnName, value: [], operator: 'nin' });
  }

  close() {
    this.visiblePanel = 1;
    this.$emit('closed');
  }

  openStep(stepName: PipelineStepName) {
    this.$emit('actionClicked', stepName);
    this.close();
  }

  createStep(newStepForm: PipelineStep) {
    const newPipeline: Pipeline = [...this.pipeline];
    const index = this.computedActiveStepIndex + 1;
    /**
     * If a step edition form is already open, close it so that the left panel displays
     * the pipeline with the new delete step inserted
     */
    if (this.isEditingStep) {
      this.closeStepForm();
    }
    newPipeline.splice(index, 0, newStepForm);
    this.setPipeline({ pipeline: newPipeline });
    this.selectStep({ index });
    this.close();
  }

  createDeleteColumnStep() {
    this.createStep({ name: 'delete', columns: [this.columnName] });
  }

  createUniqueGroupsStep() {
    this.createStep({ name: 'uniquegroups', on: [this.columnName] });
  }

  createFilterStep() {
    this.createStep({ name: 'filter', condition: this.condition });
  }
}
</script>
<style lang="scss">
@import '../styles/_variables';

.action-menu__body {
  display: flex;
  border-radius: 10px;
  margin-left: -5px;
  margin-right: -5px;
  width: 200px;
  background-color: #fff;
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.25);
  color: $base-color;
}

.action-menu__panel {
  display: flex;
  width: 200px;
  flex-direction: column;
  border-color: $data-viewer-border-color;

  &:not(:last-child) {
    border-bottom-style: solid;
    border-bottom-width: 1px;
  }
}

.action-menu__option {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 13px;
  padding: 10px 12px;
  line-height: 20px;
  justify-content: space-between;
  position: relative;

  &:hover {
    background-color: rgba(0, 0, 0, 0.03);
    color: $active-color;
  }

  &:last-child {
    margin-bottom: 0;
  }
}
.action-menu__option--top-bordered {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.action-menu__option--back {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 13px;
  padding: 10px 12px;
  line-height: 20px;
  position: relative;
  font-weight: 600;

  &:last-child {
    margin-bottom: 0;
  }
}

.fa-angle-left {
  margin-right: 5px;
}

.slide-left-enter,
.slide-right-leave {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-enter,
.slide-left-leave {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.action-menu__apply-filter {
  font-size: 12px;
  text-align: center;
  padding: 12px 0px;
  cursor: pointer;
  text-transform: uppercase;
  color: white;
  background-color: $active-color;
}
</style>
