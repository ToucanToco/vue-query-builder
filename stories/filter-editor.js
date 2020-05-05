import {ConditionsEditor, FilterEditor} from '../dist/storybook/components';
import {storiesOf} from '@storybook/vue';

import Vuex from 'vuex';

const stories = storiesOf('FilterEditor', module);

stories.add('FilterEditor', () => ({
  template: `
    <div style="margin: 30px; overflow: auto">
      <FilterEditor :filter-tree="filterTree" @filterTreeUpdated="updateFilterTree">
      <pre style="margin-top: 30px;">{{ filterTreeStringify }}</pre>
    </div>
  `,

  store: new Vuex.Store(),

  components: {
    FilterEditor
  },

  data() {
    return {
      filterTree: {
        'and': [
          {
            column: 'my_col',
            operator: 'eq',
            value: 'my_value',
          },
          {
            column: 'my_col',
            operator: 'eq',
            value: 'my_value',
          },
          {
            'or':
              [
                {
                  column: 'my_sub_col',
                  operator: 'eq',
                  value: 'my_value',
                },
                {
                  column: 'my_sub_col',
                  operator: 'eq',
                  value: 'my_value',
                },
              ],
          },
        ],
      },
    };
  },

  computed: {
    filterTreeStringify() {
      return JSON.stringify(this.filterTree, null, 2);
    }
  },

  methods: {
    updateFilterTree(newFilterTree) {
      this.filterTree = newFilterTree;
    },
  },
}));


stories.add('with some variables available', () => ({
  template: `
    <div>
      <FilterEditor
        :filter-tree="filterTree"
        @filterTreeUpdated="updateFilterTree"
        :available-variables="availableVariables"
      />
      <pre style="margin-top: 30px;">{{ filterTreeStringify }}</pre>
    </div>
  `,

  store: new Vuex.Store(),

  components: {
    FilterEditor
  },

  data() {
    return {
      availableVariables: [
        {category: 'Values', label: 'The best number', identifier: 'bestNumber', value: 42},
        {category: 'Values', label: 'King in the North', identifier: 'kingInTheNorth', value: 'JSnow'},
        {category: 'Lists', label: 'Some array', identifier: 'someArray', value: ['plop', 'plip']},
        {category: 'Lists', label: 'Poke-deck', identifier: 'pokedeck', value: ['pikachu', 'carapuce', 'evoli']},
      ],
      filterTree: {
        column: 'my_col',
        operator: 'in',
        value: '{{ someArray }}',
      },
    };
  },

  computed: {
    filterTreeStringify() {
      return JSON.stringify(this.filterTree, null, 2);
    }
  },

  methods: {
    updateFilterTree(newFilterTree) {
      this.filterTree = newFilterTree;
    },
  },
}));


stories.add('Condition editor (empty slot)', () => ({
  template: `
    <div style="margin: 30px; overflow: auto">
      <ConditionsEditor :conditions-tree="conditionsTree"
                        @conditionsTreeUpdated="updateConditionsTree"></ConditionsEditor>
      <pre style="margin-top: 30px;">{{ conditionsStringify }}</pre>
    </div>
  `,

  components: {
    ConditionsEditor
  },

  data() {
    return {
      conditionsTree: {
        operator: 'and',
        conditions: [
          'you',
          'me',
        ],
        groups: [
          {
            operator: 'or',
            conditions: [
              'to be',
              'not to be',
            ],
          },
        ],
      },
    };
  },

  computed: {
    conditionsStringify() {
      return JSON.stringify(this.conditionsTree, null, 2);
    }
  },

  methods: {
    updateConditionsTree(newConditionsTree) {
      this.conditionsTree = newConditionsTree;
    },
  },
}));

