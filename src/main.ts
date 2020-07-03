// export lib entrypoints
export { getTranslator } from './lib/translators';
export { mongoResultsToDataset, inferTypeFromDataset } from './lib/dataset/mongo';
export { setCodeEditor } from './components/code-editor';

// export store entrypoints
export { servicePluginFactory } from '@/store/backend-plugin';
export { dereferencePipelines } from '@/store/state';
export {
  setupStore,
  registerModule,
  unregisterModule,
  VQBModule,
  VQBnamespace,
  VQB_MODULE_NAME,
} from '@/store';

// export Vue components
import DataViewer from '@/components/DataViewer.vue';
import FilterEditor from '@/components/FilterEditor.vue';
import PipelineSelector from '@/components/PipelineSelector.vue';
import QueryBuilder from '@/components/QueryBuilder.vue';
import Vqb from '@/components/Vqb.vue';

export {
  // All-in-one component
  Vqb,
  // Main sub-components
  DataViewer,
  QueryBuilder,
  PipelineSelector,
  // Utility components
  FilterEditor,
};
