import _ from 'lodash';
import { PipelineInterpolator, ScopeContext } from '@/lib/templating';
import { Pipeline } from '@/lib/steps';

function interpolate(value: string, context: ScopeContext) {
  const compiled = _.template(value);
  return compiled(context);
}

describe('Pipeline interpolator', () => {
  const defaultContext: ScopeContext = {
    foo: 'bar',
    egg: 'spam',
    age: 42,
  };

  function translate(pipeline: Pipeline, context = defaultContext) {
    const pipelineInterpolator = new PipelineInterpolator(interpolate, context);
    return pipelineInterpolator.interpolate(pipeline);
  }

  it('should leave aggregation steps untouched', () => {
    const pipeline: Pipeline = [
      {
        name: 'aggregate',
        on: ['column1', 'column2'],
        aggregations: [
          {
            aggfunction: 'avg',
            column: '<%= foo %>',
            newcolumn: '<%= egg %>',
          },
        ],
      },
    ];
    expect(translate(pipeline)).toEqual(pipeline);
  });

  it('should leave argmax steps untouched', () => {
    const pipeline: Pipeline = [
      {
        name: 'argmax',
        column: '<%= foo %>',
        groups: ['<%= egg %>', 'column3'],
      },
    ];
    expect(translate(pipeline)).toEqual(pipeline);
  });

  it('should leave argmin steps untouched', () => {
    const pipeline: Pipeline = [
      {
        name: 'argmin',
        column: '<%= foo %>',
        groups: ['<%= egg %>', 'column3'],
      },
    ];
    expect(translate(pipeline)).toEqual(pipeline);
  });

  it('should leave custom steps untouched', () => {
    const pipeline: Pipeline = [
      {
        name: 'custom',
        query: {},
      },
    ];
    expect(translate(pipeline)).toEqual(pipeline);
  });

  it('should leave domain steps untouched', () => {
    const pipeline: Pipeline = [
      {
        name: 'domain',
        domain: '<%= foo %>',
      },
    ];
    expect(translate(pipeline)).toEqual(pipeline);
  });

  it('should leave duplicate steps untouched', () => {
    const pipeline: Pipeline = [
      {
        name: 'duplicate',
        column: '<%= foo %>',
        new_column_name: '<%= bar %>',
      },
    ];
    expect(translate(pipeline)).toEqual(pipeline);
  });

  it('should leave delete steps untouched', () => {
    const pipeline: Pipeline = [
      {
        name: 'delete',
        columns: ['<%= foo %>'],
      },
    ];
    expect(translate(pipeline)).toEqual(pipeline);
  });

  it('should interpolate fillna steps if required', () => {
    const pipeline: Pipeline = [
      {
        name: 'fillna',
        column: '<%= foo %>',
        value: '<%= age %>',
      },
    ];
    expect(translate(pipeline)).toEqual([
      {
        name: 'fillna',
        column: '<%= foo %>',
        value: '42',
      },
    ]);
  });

  it('should leave fillna steps if no variable is found', () => {
    const pipeline: Pipeline = [
      {
        name: 'fillna',
        column: '<%= foo %>',
        value: 'hola',
      },
    ];
    expect(translate(pipeline)).toEqual([
      {
        name: 'fillna',
        column: '<%= foo %>',
        value: 'hola',
      },
    ]);
  });

  it('interpolates simple filter steps / operator "eq"', () => {
    const step: Pipeline = [
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: '<%= age %>',
          operator: 'eq',
        },
      },
    ];
    expect(translate(step)).toEqual([
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: '42',
          operator: 'eq',
        },
      },
    ]);
  });

  it('interpolates simple filter steps / operator "ne"', () => {
    const step: Pipeline = [
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: '<%= age %>',
          operator: 'ne',
        },
      },
    ];
    expect(translate(step)).toEqual([
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: '42',
          operator: 'ne',
        },
      },
    ]);
  });

  it('interpolates simple filter steps / operator "lt"', () => {
    const step: Pipeline = [
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: '<%= age %>',
          operator: 'lt',
        },
      },
    ];
    expect(translate(step)).toEqual([
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: '42',
          operator: 'lt',
        },
      },
    ]);
  });

  it('interpolates simple filter steps / operator "le"', () => {
    const step: Pipeline = [
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: '<%= age %>',
          operator: 'le',
        },
      },
    ];
    expect(translate(step)).toEqual([
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: '42',
          operator: 'le',
        },
      },
    ]);
  });

  it('interpolates simple filter steps / operator "gt"', () => {
    const step: Pipeline = [
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: '<%= age %>',
          operator: 'gt',
        },
      },
    ];
    expect(translate(step)).toEqual([
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: '42',
          operator: 'gt',
        },
      },
    ]);
  });

  it('interpolates simple filter steps / operator "ge"', () => {
    const step: Pipeline = [
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: '<%= age %>',
          operator: 'ge',
        },
      },
    ];
    expect(translate(step)).toEqual([
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: '42',
          operator: 'ge',
        },
      },
    ]);
  });

  it('interpolates simple filter steps / operator "in"', () => {
    const step: Pipeline = [
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: [11, '<%= age %>', '<%= egg %>', 'hola'],
          operator: 'in',
        },
      },
    ];
    expect(translate(step)).toEqual([
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: [11, '42', 'spam', 'hola'],
          operator: 'in',
        },
      },
    ]);
  });

  it('interpolates simple filter steps / operator "nin"', () => {
    const step: Pipeline = [
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: [11, '<%= age %>', '<%= egg %>', 'hola'],
          operator: 'nin',
        },
      },
    ];
    expect(translate(step)).toEqual([
      {
        name: 'filter',
        condition: {
          column: '<%= foo %>',
          value: [11, '42', 'spam', 'hola'],
          operator: 'nin',
        },
      },
    ]);
  });

  it('interpolates "and" filter steps', () => {
    const step: Pipeline = [
      {
        name: 'filter',
        condition: {
          and: [
            {
              column: '<%= foo %>',
              value: [11, '<%= age %>', '<%= egg %>', 'hola'],
              operator: 'nin',
            },
            {
              column: '<%= foo %>',
              value: 12,
              operator: 'eq',
            },
            {
              column: '<%= foo %>',
              value: '<%= egg %>',
              operator: 'ne',
            },
          ],
        },
      },
    ];
    expect(translate(step)).toEqual([
      {
        name: 'filter',
        condition: {
          and: [
            {
              column: '<%= foo %>',
              value: [11, '42', 'spam', 'hola'],
              operator: 'nin',
            },
            {
              column: '<%= foo %>',
              value: 12,
              operator: 'eq',
            },
            {
              column: '<%= foo %>',
              value: 'spam',
              operator: 'ne',
            },
          ],
        },
      },
    ]);
  });

  it('interpolates "or" filter steps', () => {
    const step: Pipeline = [
      {
        name: 'filter',
        condition: {
          or: [
            {
              column: '<%= foo %>',
              value: [11, '<%= age %>', '<%= egg %>', 'hola'],
              operator: 'nin',
            },
            {
              column: '<%= foo %>',
              value: 12,
              operator: 'eq',
            },
            {
              column: '<%= foo %>',
              value: '<%= egg %>',
              operator: 'ne',
            },
          ],
        },
      },
    ];
    expect(translate(step)).toEqual([
      {
        name: 'filter',
        condition: {
          or: [
            {
              column: '<%= foo %>',
              value: [11, '42', 'spam', 'hola'],
              operator: 'nin',
            },
            {
              column: '<%= foo %>',
              value: 12,
              operator: 'eq',
            },
            {
              column: '<%= foo %>',
              value: 'spam',
              operator: 'ne',
            },
          ],
        },
      },
    ]);
  });

  it('interpolates formula steps', () => {
    const pipeline: Pipeline = [
      {
        name: 'formula',
        new_column: 'column3',
        formula: 'column1 + <%= age %>',
      },
    ];
    expect(translate(pipeline)).toEqual([
      {
        name: 'formula',
        new_column: 'column3',
        formula: 'column1 + 42',
      },
    ]);
  });

  it('leaves formula steps untouched if no variable is found', () => {
    const pipeline: Pipeline = [
      {
        name: 'formula',
        new_column: 'column3',
        formula: 'column1 + column2',
      },
    ];
    expect(translate(pipeline)).toEqual([
      {
        name: 'formula',
        new_column: 'column3',
        formula: 'column1 + column2',
      },
    ]);
  });

  it('should leave percentage steps untouched', () => {
    const pipeline: Pipeline = [
      {
        name: 'percentage',
        column: '<%= foo %>',
      },
    ];
    expect(translate(pipeline)).toEqual(pipeline);
  });

  it('should leave pivot steps untouched', () => {
    const pipeline: Pipeline = [
      {
        name: 'pivot',
        index: ['column1', 'column2'],
        column_to_pivot: '<%= foo %>',
        value_column: '<%= age %>',
        agg_function: 'sum',
      },
    ];
    expect(translate(pipeline)).toEqual(pipeline);
  });

  it('should leave rename steps untouched', () => {
    const pipeline: Pipeline = [
      {
        name: 'rename',
        oldname: '<%= age %>',
        newname: '<%= foo %>',
      },
    ];
    expect(translate(pipeline)).toEqual(pipeline);
  });

  it('should leave select steps untouched', () => {
    const pipeline: Pipeline = [
      {
        name: 'select',
        columns: ['<%= age %>', 'column2'],
      },
    ];
    expect(translate(pipeline)).toEqual(pipeline);
  });

  it('should leave sort steps untouched', () => {
    const pipeline: Pipeline = [
      {
        name: 'sort',
        columns: [{ column: '<%= age %>', order: 'asc' }, { column: 'column2', order: 'desc' }],
      },
    ];
    expect(translate(pipeline)).toEqual(pipeline);
  });

  it('should leave top steps untouched if no variable is found', () => {
    const pipeline: Pipeline = [
      {
        name: 'top',
        rank_on: '<%= foo %>',
        sort: 'asc',
        limit: 42,
      },
    ];
    expect(translate(pipeline)).toEqual(pipeline);
  });

  it('should interpolate top steps', () => {
    const pipeline: Pipeline = [
      {
        name: 'top',
        rank_on: '<%= foo %>',
        sort: 'asc',
        limit: '<%= age %>',
      },
    ];
    expect(translate(pipeline)).toEqual([
      {
        name: 'top',
        rank_on: '<%= foo %>',
        sort: 'asc',
        limit: 42,
      },
    ]);
  });

  it('should leave unpivot steps untouched', () => {
    const pipeline: Pipeline = [
      {
        name: 'unpivot',
        keep: ['<%= foo %>', 'column2'],
        unpivot: ['<%= egg %>', 'column4'],
        unpivot_column_name: 'column5',
        value_column_name: 'column6',
        dropna: true,
      },
    ];
    expect(translate(pipeline)).toEqual(pipeline);
  });
});
