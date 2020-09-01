/**
 * The JavaScript translator turns pipelines steps into functions.
 *
 * With it, pipelines can be executed right in the browser, without any
 * database engine. This is very useful for testing, getting an idea of how
 * transformations works and provide a specification for transformations steps.
 * For web apps, it can also enable offline data processing.
 *
 * Input data must be of the form:
 * ```
 * {
 *   "domainA": [{
 *     "column1": 123,
 *     "column2": 456,
 *     ...
 *   }, ...],
 *  "domainB": [...],
 *  ...
 *  }
 *  ```
 */
import * as S from '@/lib/steps';
import { BaseTranslator } from '@/lib/translators/base';

type ColumnName = string | number;
type DataRow = Record<ColumnName, any>;
export type DataTable = DataRow[];
export type DataDomains = Record<string, DataTable>;

/**
 * Each step will be translated into a function that outputs a data table. We call these StepFunctions.
 *
 * Some step functions needs the entire library of data domains as argument (domain and combination steps),
 * but most only needs the current data table. They all have the same signature so they can be called easily in a loop.
 */
type JsStepFunction = (data: Readonly<DataTable>, domains: Readonly<DataDomains>) => DataTable;

export class JavaScriptTranslator extends BaseTranslator {
  static label = 'JavaScript';

  constructor() {
    super();
  }

  translate(pipeline: S.Pipeline): JsStepFunction[] {
    return super.translate(pipeline) as JsStepFunction[];
  }

  // transform a "domain" step into corresponding function
  domain(domainStep: Readonly<S.DomainStep>): JsStepFunction {
    return function(_data: Readonly<DataTable>, dataDomains: Readonly<DataDomains>) {
      return dataDomains[domainStep.domain];
    };
  }

  // transform a "filter" step into corresponding function
  filter(filterStep: Readonly<S.FilterStep>): JsStepFunction {
    type FilteringFunction = (dataRow: DataRow) => boolean;

    function filteringFunctionForSimpleCondition(
      condition: S.FilterSimpleCondition,
    ): FilteringFunction {
      switch (condition.operator) {
        case 'eq':
          return d => d[condition.column] == condition.value;
        case 'ne':
          return d => d[condition.column] != condition.value;
        case 'lt':
          return d => d[condition.column] < condition.value;
        case 'le':
          return d => d[condition.column] <= condition.value;
        case 'gt':
          return d => d[condition.column] > condition.value;
        case 'ge':
          return d => d[condition.column] >= condition.value;
        case 'in':
          return d => condition.value.includes(d[condition.column]);
        case 'nin':
          return d => !condition.value.includes(d[condition.column]);
        case 'isnull':
          return d => d[condition.column] == null;
        case 'notnull':
          return d => d[condition.column] != null;
        case 'matches':
          // eslint-disable-next-line no-case-declarations
          const regexToMatch = new RegExp(condition.value);
          return d => regexToMatch.test(d[condition.column]);
        case 'notmatches':
          // eslint-disable-next-line no-case-declarations
          const regexToNotMatch = new RegExp(condition.value);
          return d => !regexToNotMatch.test(d[condition.column]);
        default:
          throw new Error(`Invalid condition operator in ${JSON.stringify(condition, null, 2)}`);
      }
    }

    function filteringFunctionForCondition(condition: S.FilterCondition): FilteringFunction {
      if (S.isFilterComboAnd(condition)) {
        const filteringFunctions = condition.and.map(filteringFunctionForCondition);
        return d => filteringFunctions.every(f => f(d));
      } else if (S.isFilterComboOr(condition)) {
        const filteringFunctions = condition.or.map(filteringFunctionForCondition);
        return d => filteringFunctions.some(f => f(d));
      } else {
        return filteringFunctionForSimpleCondition(condition);
      }
    }

    return function(data: Readonly<DataTable>, _dataDomains: Readonly<DataDomains>) {
      return data.filter(filteringFunctionForCondition(filterStep.condition));
    };
  }

  // transform a "text" step into corresponding function
  text(step: Readonly<S.AddTextColumnStep>): JsStepFunction {
    function addTextColumnToRow(row: Readonly<DataRow>) {
      return {
        ...row,
        [step.new_column]: step.text,
      };
    }

    return function(data: Readonly<DataTable>, _dataDomains: Readonly<DataDomains>) {
      return data.map(addTextColumnToRow);
    };
  }

  /**
   * Transform a "custom" step into corresponding function
   *
   * The "query" parameter of the custom step should be a javascript function, of which the first parameter will be
   * the data table, and the second an object of all available domains.
   */
  custom(step: Readonly<S.CustomStep>) {
    const func = Function('"use strict";return (' + step.query + ')')();
    return function(data: Readonly<DataTable>, dataDomains: Readonly<DataDomains>) {
      return func(data, dataDomains);
    };
  }
}

/**
 * The execute function provides a simple way to execute all the translated JsStepFunctions sequentially, to return the
 * result of the data transformation.
 */
export function execute(
  dataDomains: Readonly<DataDomains>,
  jsStepFunctions: Readonly<JsStepFunction[]>,
): DataTable {
  let result: DataTable = [];
  for (const jsStepFunction of jsStepFunctions) {
    result = jsStepFunction(result, dataDomains);
  }
  return result;
}
