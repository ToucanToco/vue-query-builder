/**
 * exports the list of store getters.
 */
import _ from 'lodash';
import { GetterTree } from 'vuex';

import { isDatasetComplete } from '@/lib/dataset/helpers';

import { activePipeline, currentPipeline, inactivePipeline, VQBState } from './state';

const getters: GetterTree<VQBState, any> = {
  /**
   * the part of the pipeline that is currently selected.
   */
  activePipeline,
  /**
   * the list of current dataset's colum names.
   **/
  columnNames: (state: VQBState) => state.dataset.headers.map(col => col.name),
  /**
   * the list of dataset's column headers.
   */
  columnHeaders: (state: VQBState) => state.dataset.headers,
  /**
   * return a mapping { columnName → columnType }
   */
  columnTypes: (state: VQBState) =>
    _.fromPairs(state.dataset.headers.map(col => [col.name, col.type])),
  /**
   * a direct "usable" index (i.e. convert "-1" to a positive one) of last active step.
   */
  computedActiveStepIndex(state: VQBState) {
    const pipeline = currentPipeline(state);
    if (!pipeline) {
      return;
    }
    return state.selectedStepIndex === -1 ? pipeline.length - 1 : state.selectedStepIndex;
  },
  /**
   * the first step of the pipeline. Since it's handled differently in the UI,
   * it's useful to be able to access it directly.
   */
  domainStep(state: VQBState) {
    const pipeline = currentPipeline(state);
    if (!pipeline) {
      return;
    }
    return pipeline?.[0];
  },
  /**
   * the part of the pipeline that is currently disabled.
   */
  inactivePipeline,
  /**
   * helper that is True if dataset's data is empty.
   */
  isDatasetEmpty: (state: VQBState) => state.dataset.data.length === 0,
  /**
   * helper that is True if dataset is completely loaded in store
   * Basically, if pagesize is less than the totalCount the dataset is not complete.
   */
  isDatasetComplete: (state: VQBState) => isDatasetComplete(state.dataset),
  /**
   * helper that tell us if we are editing a step
   */
  isEditingStep: (state: VQBState) => state.currentStepFormName !== undefined,
  /**
   * helper that is True if pipeline is empty or only contain a domain step.
   */
  isPipelineEmpty(state: VQBState) {
    const pipeline = currentPipeline(state);
    if (!pipeline) {
      return;
    }
    return pipeline.length <= 1;
  },
  /**
   * helper that is True if this step is after the last currently active step.
   */
  isStepDisabled: (state: VQBState) => (index: number) =>
    state.selectedStepIndex >= 0 && index > state.selectedStepIndex,
  /**
   * Return current page number
   */
  pageno: (state: VQBState) =>
    state.dataset.paginationContext ? state.dataset.paginationContext.pageno : 1,
  /**
   * Return current edited pipeline
   */
  pipeline: (state: VQBState) => currentPipeline(state),
  /**
   * Return pipelines save in store
   */
  pipelines: (state: VQBState) => state.pipelines,
  /**
   * Return the array of pipeline names
   */
  pipelinesNames: (state: VQBState) => Object.keys(state.pipelines),
  /**
   * Return true if an error occured in the backend
   */
  thereIsABackendError: (state: VQBState) => state.backendMessages.length > 0,
  /**
   * selected columns in the dataviewer (materialized by a styled focus)
   */
  selectedColumns: (state: VQBState) => state.selectedColumns,
  /**
   * Get the step config of the pipeline based on its index
   */
  stepConfig: (state: VQBState) => (index: number) => {
    const pipeline = currentPipeline(state);
    return pipeline?.[index];
  },
  /**
   * Return the app translator name
   */
  translator: (state: VQBState) => state.translator,
};

export default getters;
