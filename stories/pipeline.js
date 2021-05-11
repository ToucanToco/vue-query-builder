import { Pipeline, registerModule } from '../dist/storybook/components';

import { storiesOf } from '@storybook/vue';

const stories = storiesOf('Pipeline', module);

import Vue from 'vue';
import Vuex from 'vuex';
Vue.use(Vuex);

stories.add('default', () => ({
  components: {
    Pipeline,
  },
  template: '<div><Pipeline/></div>',
  store: new Vuex.Store(),
  created: function() {
    registerModule(this.$store, {
      currentPipelineName: 'test',
      backendMessages: [{ index: 2, message: 'I am an error', type: 'error' }],
      pipelines: {
        test: [
          { name: 'domain', domain: 'YOLO' },
          { name: 'rename', toRename: [['foo', 'bar']] },
          { name: 'rename', toRename: [['baz', 'spam']] },
          { name: 'rename', toRename: [['tic', 'tac']] },
        ],
      },
    });
  },
}));
