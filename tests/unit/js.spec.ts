import { Pipeline } from '@/lib/steps';
import { getTranslator } from '@/lib/translators';
import { DataDomains, DataTable, execute, JavaScriptTranslator } from '@/lib/translators/js';

describe('Pipeline to js function translator', () => {
  const jsTranslator = getTranslator('js') as JavaScriptTranslator;
  const SAMPLE_DATA: DataDomains = {
    domainA: [
      { label: 'A', value: 1 },
      { label: 'B', value: 2 },
    ],
    domainB: [
      { label: 'alpha', value: 0.1 },
      { label: 'beta', value: 0.2 },
    ],
  };

  function expectResultFromPipeline(
    pipeline: Pipeline,
    data: DataDomains,
    expectedResult: DataTable,
  ) {
    expect(execute(data, jsTranslator.translate(pipeline))).toEqual(expectedResult);
  }

  it('should handle domain steps', () => {
    expectResultFromPipeline([{ name: 'domain', domain: 'domainA' }], SAMPLE_DATA, [
      { label: 'A', value: 1 },
      { label: 'B', value: 2 },
    ]);
    expectResultFromPipeline([{ name: 'domain', domain: 'domainB' }], SAMPLE_DATA, [
      { label: 'alpha', value: 0.1 },
      { label: 'beta', value: 0.2 },
    ]);
  });

  describe('filter step', () => {
    const SAMPLE_DATA = [
      { label: 'A', value: 1 },
      { label: 'B', value: 2 },
      { label: 'alpha', value: 0.1 },
      { label: 'beta', value: 0.2 },
    ];

    const DATA_WITH_NULL_LABELS = [
      {
        label: 'A',
      },
      {
        label: 'B',
      },
      {
        label: null,
      },
      {
        label: undefined,
      },
      {
        value: 2,
      },
    ];

    it('should handle simple equality condition', () => {
      const filterALabel = jsTranslator.filter({
        name: 'filter',
        condition: {
          column: 'label',
          value: 'A',
          operator: 'eq',
        },
      });
      expect(filterALabel(SAMPLE_DATA, {})).toEqual([{ label: 'A', value: 1 }]);
    });

    it('should handle and conditions with matches and gt', () => {
      const filterValuesGreaterThan1AndLabelsWithOnlyOneLetter = jsTranslator.filter({
        name: 'filter',
        condition: {
          and: [
            {
              column: 'label',
              value: '^[A-Za-z]$',
              operator: 'matches',
            },
            {
              column: 'value',
              value: 1,
              operator: 'gt',
            },
          ],
        },
      });
      expect(filterValuesGreaterThan1AndLabelsWithOnlyOneLetter(SAMPLE_DATA, {})).toEqual([
        { label: 'B', value: 2 },
      ]);
    });

    it('should handle or conditions with notmatches and le', () => {
      const filterLabelsWithMoreThanOneLetterOrValuesLessThan1 = jsTranslator.filter({
        name: 'filter',
        condition: {
          or: [
            {
              column: 'label',
              value: '^[A-Za-z]$',
              operator: 'notmatches',
            },
            {
              column: 'value',
              value: 1,
              operator: 'le',
            },
          ],
        },
      });
      expect(filterLabelsWithMoreThanOneLetterOrValuesLessThan1(SAMPLE_DATA, {})).toEqual([
        { label: 'A', value: 1 },
        { label: 'alpha', value: 0.1 },
        { label: 'beta', value: 0.2 },
      ]);
    });

    it('should handle notnull conditions', () => {
      const filterNotNull = jsTranslator.filter({
        name: 'filter',
        condition: {
          column: 'label',
          operator: 'notnull',
          value: null,
        },
      });
      expect(filterNotNull(DATA_WITH_NULL_LABELS, {})).toEqual([
        {
          label: 'A',
        },
        {
          label: 'B',
        },
      ]);
    });

    it('should handle null conditions', () => {
      const filterNull = jsTranslator.filter({
        name: 'filter',
        condition: {
          column: 'label',
          operator: 'isnull',
          value: null,
        },
      });
      expect(filterNull(DATA_WITH_NULL_LABELS, {})).toEqual([
        {
          label: null,
        },
        {
          label: undefined,
        },
        {
          value: 2,
        },
      ]);
    });

    it('should handle ne conditions', () => {
      const filterNotEqual = jsTranslator.filter({
        name: 'filter',
        condition: {
          column: 'label',
          operator: 'ne',
          value: 'A',
        },
      });
      expect(filterNotEqual(SAMPLE_DATA, {})).toEqual([
        { label: 'B', value: 2 },
        { label: 'alpha', value: 0.1 },
        { label: 'beta', value: 0.2 },
      ]);
    });

    it('should handle or conditions with lt and ge', () => {
      const filterLowerThan1OrGreatherThan1 = jsTranslator.filter({
        name: 'filter',
        condition: {
          or: [
            { column: 'value', operator: 'lt', value: 0.2 },
            {
              column: 'value',
              operator: 'ge',
              value: 2,
            },
          ],
        },
      });
      expect(filterLowerThan1OrGreatherThan1(SAMPLE_DATA, {})).toEqual([
        { label: 'B', value: 2 },
        { label: 'alpha', value: 0.1 },
      ]);
    });

    it('should handle in conditions', () => {
      const filterIn = jsTranslator.filter({
        name: 'filter',
        condition: {
          column: 'label',
          operator: 'in',
          value: ['A', 'alpha'],
        },
      });
      expect(filterIn(SAMPLE_DATA, {})).toEqual([
        { label: 'A', value: 1 },
        { label: 'alpha', value: 0.1 },
      ]);
    });

    it('should handle nin conditions', () => {
      const filterNotIn = jsTranslator.filter({
        name: 'filter',
        condition: {
          column: 'label',
          operator: 'nin',
          value: ['A', 'alpha'],
        },
      });
      expect(filterNotIn(SAMPLE_DATA, {})).toEqual([
        { label: 'B', value: 2 },
        { label: 'beta', value: 0.2 },
      ]);
    });

    it('should throw if the operator is not valid', () => {
      const invalidFilter = jsTranslator.filter({
        name: 'filter',
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        condition: {
          column: 'label',
          operator: 'what',
        },
      });
      expect(() => invalidFilter(SAMPLE_DATA, {})).toThrow();
    });
  });

  describe('text step', () => {
    it('should add a column with text to each row', () => {
      const addTextColumn = jsTranslator.text({
        name: 'text',
        text: 'some text',
        new_column: 'text_new_column',
      });
      expect(addTextColumn(SAMPLE_DATA.domainA, {})).toEqual([
        { label: 'A', value: 1, text_new_column: 'some text' },
        { label: 'B', value: 2, text_new_column: 'some text' },
      ]);
    });
  });

  describe('custom step', () => {
    it('should apply the custom function to data', () => {
      const addPlipPloupAndDoubleValue = jsTranslator.custom({
        name: 'custom',
        query: `function transformData(data) {
          return data.map(d => ({
            ...d,
            value: d.value * 2,
            plip: "ploup"
          }));
        }`,
      });
      expect(addPlipPloupAndDoubleValue(SAMPLE_DATA.domainA, {})).toEqual([
        { label: 'A', value: 2, plip: 'ploup' },
        { label: 'B', value: 4, plip: 'ploup' },
      ]);
    });
  });
});
