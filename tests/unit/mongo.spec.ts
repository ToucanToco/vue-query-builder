import { PipelineStep } from '@/lib/steps';
import { getTranslator } from '@/lib/translators';

describe('Mongo translator support tests', () => {
  const mongo36translator = getTranslator('mongo36');

  it('should support any kind of operation', () => {
    expect(mongo36translator.unsupportedSteps).toEqual([]);
  });
});

describe('Pipeline to mongo translator', () => {
  const mongo36translator = getTranslator('mongo36');

  it('can generate domain steps', () => {
    const pipeline: Array<PipelineStep> = [{ name: 'domain', domain: 'test_cube' }];
    const querySteps = mongo36translator.translate(pipeline);
    expect(querySteps).toEqual([{ $match: { domain: 'test_cube' } }]);
  });

  it('can generate select steps', () => {
    const pipeline: Array<PipelineStep> = [
      { name: 'domain', domain: 'test_cube' },
      { name: 'select', columns: ['Manager', 'Region'] },
    ];
    const querySteps = mongo36translator.translate(pipeline);
    expect(querySteps).toEqual([
      { $match: { domain: 'test_cube' } },
      {
        $project: {
          Manager: 1,
          Region: 1,
        },
      },
    ]);
  });

  it('can generate delete steps', () => {
    const pipeline: Array<PipelineStep> = [
      { name: 'domain', domain: 'test_cube' },
      { name: 'delete', columns: ['Manager', 'Region'] },
    ];
    const querySteps = mongo36translator.translate(pipeline);
    expect(querySteps).toEqual([
      { $match: { domain: 'test_cube' } },
      {
        $project: {
          Manager: 0,
          Region: 0,
        },
      },
    ]);
  });

  it('can generate rename steps', () => {
    const pipeline: Array<PipelineStep> = [
      { name: 'domain', domain: 'test_cube' },
      { name: 'rename', oldname: 'Region', newname: 'zone' },
    ];
    const querySteps = mongo36translator.translate(pipeline);
    expect(querySteps).toEqual([
      { $match: { domain: 'test_cube' } },
      {
        $addFields: {
          zone: '$Region',
        },
      },
      {
        $project: {
          Region: 0,
        },
      },
    ]);
  });

  it('can generate filter steps', () => {
    const pipeline: Array<PipelineStep> = [
      { name: 'domain', domain: 'test_cube' },
      { name: 'filter', column: 'Manager', value: 'Pierre' },
      { name: 'filter', column: 'Region', value: 'Europe', operator: 'eq' },
    ];
    const querySteps = mongo36translator.translate(pipeline);
    expect(querySteps).toEqual([
      { $match: { domain: 'test_cube', Manager: 'Pierre', Region: 'Europe' } },
    ]);
  });

  it('can translate aggregation steps', () => {
    const pipeline: Array<PipelineStep> = [
      { name: 'domain', domain: 'test_cube' },
      {
        name: 'aggregate',
        on: ['col_agg1', 'col_agg2'],
        aggregations: [
          {
            name: 'sum',
            aggfunction: 'sum',
            column: 'col1',
          },
          {
            name: 'average',
            aggfunction: 'avg',
            column: 'col2',
          },
          {
            name: 'minimum',
            aggfunction: 'min',
            column: 'col1',
          },
          {
            name: 'maximum',
            aggfunction: 'max',
            column: 'col3',
          },
          {
            name: 'number_rows',
            aggfunction: 'count',
            column: 'col3',
          },
        ],
      },
    ];
    const querySteps = mongo36translator.translate(pipeline);
    expect(querySteps).toEqual([
      { $match: { domain: 'test_cube' } },
      {
        $group: {
          _id: { col_agg1: '$col_agg1', col_agg2: '$col_agg2' },
          sum: { $sum: '$col1' },
          average: { $avg: '$col2' },
          minimum: { $min: '$col1' },
          maximum: { $max: '$col3' },
          number_rows: { $sum: 1 },
        },
      },
      {
        $project: {
          col_agg1: '$_id.col_agg1',
          col_agg2: '$_id.col_agg2',
          sum: 1,
          average: 1,
          minimum: 1,
          maximum: 1,
          number_rows: 1,
        },
      },
    ]);
  });

  it('can simplify complex queries', () => {
    const pipeline: Array<PipelineStep> = [
      { name: 'domain', domain: 'test_cube' },
      { name: 'filter', column: 'Manager', value: 'Pierre' },
      { name: 'delete', columns: ['Manager'] },
      { name: 'select', columns: ['Region'] },
      { name: 'rename', oldname: 'Region', newname: 'zone' },
      { name: 'newcolumn', column: 'id', query: { $concat: ['$country', ' - ', '$Region'] } },
      {
        name: 'custom',
        query: { $group: { _id: '$country', population: { $sum: '$population' } } },
      },
    ];
    const querySteps = mongo36translator.translate(pipeline);
    expect(querySteps).toEqual([
      { $match: { domain: 'test_cube', Manager: 'Pierre' } },
      {
        $project: {
          Manager: 0,
          Region: 1,
        },
      },
      {
        $addFields: {
          zone: '$Region',
        },
      },
      {
        $project: {
          Region: 0,
        },
      },
      {
        $addFields: {
          id: { $concat: ['$country', ' - ', '$Region'] },
        },
      },
      {
        $group: { _id: '$country', population: { $sum: '$population' } },
      },
    ]);
  });

  it('can generate a basic replace step', () => {
    const pipeline: Array<PipelineStep> = [
      {
        name: 'replace',
        search_column: 'column_1',
        oldvalue: 'foo',
        newvalue: 'bar',
      },
    ];
    const querySteps = mongo36translator.translate(pipeline);
    expect(querySteps).toEqual([
      {
        $addFields: {
          column_1: {
            $cond: [
              {
                $eq: ['$column_1', 'foo'],
              },
              'bar',
              '$column_1',
            ],
          },
        },
      },
    ]);
  });

  it('can generate a basic replace step in a new column', () => {
    const pipeline: Array<PipelineStep> = [
      {
        name: 'replace',
        search_column: 'column_1',
        new_column: 'column_2',
        oldvalue: 'foo',
        newvalue: 'bar',
      },
    ];
    const querySteps = mongo36translator.translate(pipeline);
    expect(querySteps).toEqual([
      {
        $addFields: {
          column_2: {
            $cond: [
              {
                $eq: ['$column_1', 'foo'],
              },
              'bar',
              '$column_1',
            ],
          },
        },
      },
    ]);
  });
});
