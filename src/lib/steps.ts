/**
 * This module defines the supported unit-of-transformation steps.
 */

type PrimitiveType = number | boolean | string | Date;
type Templatable<T> = T | string;
export type Reference = Pipeline | string;

export type AddTextColumnStep = {
  name: 'text';
  text: string;
  new_column: string;
};

export type AggFunctionStep = {
  /** Name of the output column */
  newcolumn: string;
  /** the aggregation operation (e.g. `sum` or `count`) */
  aggfunction: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last';
  /** the column the aggregation function is working on */
  column: string;
};

export type AggregationStep = {
  name: 'aggregate';
  /** the list columns we want to aggregate on */
  on: string[];
  /** the list of aggregation operations to perform */
  aggregations: AggFunctionStep[];
};

export type AppendStep = {
  name: 'append';
  pipelines: Reference[];
};

export type ArgmaxStep = {
  name: 'argmax';
  column: string; // column in which to search for max value
  groups?: string[]; // if specified, will search for a max in every group
};

export type ArgminStep = {
  name: 'argmin';
  column: string; // column in which to search for max value
  groups?: string[]; // if specified, will search for a max in every group
};

export type ConcatenateStep = {
  name: 'concatenate';
  columns: string[];
  separator: string;
  new_column_name: string;
};

export type ConvertStep = {
  name: 'convert';
  columns: string[];
  data_type: 'boolean' | 'date' | 'float' | 'integer' | 'text';
};

export type CumSumStep = {
  name: 'cumsum';
  valueColumn: string;
  referenceColumn: string;
  groupby?: string[];
  newColumn?: string;
};

export type CustomStep = {
  name: 'custom';
  query: string;
};

export type DateExtractPropertyStep = {
  name: 'dateextract';
  operation:
    | 'year'
    | 'month'
    | 'day'
    | 'hour'
    | 'minutes'
    | 'seconds'
    | 'milliseconds'
    | 'dayOfYear'
    | 'dayOfWeek'
    | 'week';
  column: string;
  new_column_name?: string;
};

export type DeleteStep = {
  name: 'delete';
  columns: string[];
};

export type Statistics = 'count' | 'max' | 'min' | 'average' | 'variance' | 'standard deviation';
export type Quantile = {
  label?: string;
  nth: any;
  order: any;
};
export type StatisticsStep = {
  name: 'statistics';
  column: string;
  groupbyColumns: string[];
  statistics: Statistics[];
  /**
   * array of quantiles
   * Examples:
   * median is 1rst quantile of order 2
   * last decile is 9th quantile of order 10
   */
  quantiles: Quantile[];
};

export type DomainStep = {
  name: 'domain';
  domain: string;
};

export type DuplicateColumnStep = {
  name: 'duplicate';
  column: string;
  new_column_name: string;
};

export type EvolutionStep = {
  name: 'evolution';
  dateCol: string;
  valueCol: string;
  evolutionType: 'vsLastYear' | 'vsLastMonth' | 'vsLastWeek' | 'vsLastDay';
  evolutionFormat: 'abs' | 'pct';
  indexColumns: string[];
  newColumn?: string;
};

export type FillnaStep = {
  name: 'fillna';
  column: string;
  value: PrimitiveType;
};

export type FilterCondition = FilterSimpleCondition | FilterComboAnd | FilterComboOr;

export type FilterComboAnd = {
  and: FilterCondition[];
};

export type FilterComboOr = {
  or: FilterCondition[];
};

export type FilterSimpleCondition =
  | FilterConditionComparison
  | FilterConditionEquality
  | FilterConditionInclusion;

export type FilterConditionComparison = {
  column: string;
  value: number | string;
  operator: 'gt' | 'ge' | 'lt' | 'le';
};

export type FilterConditionEquality = {
  column: string;
  value: any;
  operator: 'eq' | 'ne' | 'isnull' | 'notnull' | 'matches' | 'notmatches';
};

export type FilterConditionInclusion = {
  column: string;
  value: any[];
  operator: 'in' | 'nin';
};

export type FilterStep = {
  name: 'filter';
  condition: FilterCondition;
};

export type FormulaStep = {
  name: 'formula';
  new_column: string;
  formula: string;
};

export type FromDateStep = {
  name: 'fromdate';
  column: string;
  format: string;
};

export type IfThenElseStep = {
  name: 'ifthenelse';
  newColumn: string;
  if: FilterCondition;
  then: string;
  else: string | Omit<IfThenElseStep, 'name' | 'newColumn'>;
};

export type JoinStep = {
  name: 'join';
  right_pipeline: Reference;
  type: 'left' | 'inner' | 'left outer';
  on: string[][];
};

export type PercentageStep = {
  name: 'percentage';
  column: string;
  group?: string[];
  newColumnName?: string;
};

export type PivotStep = {
  name: 'pivot';
  index: string[];
  column_to_pivot: string;
  value_column: string;
  agg_function: 'sum' | 'avg' | 'count' | 'min' | 'max';
};

export type RankStep = {
  name: 'rank';
  valueCol: string;
  order: 'asc' | 'desc';
  method: 'standard' | 'dense';
  groupby?: string[];
  newColumnName?: string;
};

export type RenameStep = {
  name: 'rename';
  oldname: string;
  newname: string;
};

export type ReplaceStep = {
  name: 'replace';
  search_column: string;
  to_replace: any[][];
};

export type RollupStep = {
  name: 'rollup';
  /** the list of hierarchical columns from lowest to highest level */
  hierarchy: string[];
  /** the list of columnns to aggregate, with related aggregation function to use */
  aggregations: AggFunctionStep[];
  /** Groupby columns if rollup has to be performed by groups */
  groupby?: string[];
  /** To give a custom name to the output label column */
  labelCol?: string;
  /** To give a custom name to the output level column */
  levelCol?: string;
  /** To give a custom name to the output parent column */
  parentLabelCol?: string;
};

export type SelectStep = {
  name: 'select';
  columns: string[];
};

export type SortColumnType = {
  column: string;
  order: 'asc' | 'desc';
};

export type SortStep = {
  name: 'sort';
  columns: SortColumnType[];
};

export type SplitStep = {
  name: 'split';
  column: string;
  delimiter: string;
  number_cols_to_keep: number;
};

export type SubstringStep = {
  name: 'substring';
  column: string;
  start_index: number;
  end_index: number;
  newColumnName?: string;
};

export type ToDateStep = {
  name: 'todate';
  column: string;
  format?: string;
};

export type ToLowerStep = {
  name: 'lowercase';
  column: string;
};

export type TopStep = {
  name: 'top';
  groups?: string[];
  rank_on: string;
  sort: 'asc' | 'desc';
  limit: Templatable<number>;
};

export type ToUpperStep = {
  name: 'uppercase';
  column: string;
};

export type UniqueGroupsStep = {
  name: 'uniquegroups';
  on: string[];
};

export type UnpivotStep = {
  name: 'unpivot';
  keep: string[];
  unpivot: string[];
  unpivot_column_name: string;
  value_column_name: string;
  dropna: boolean;
};

export type WaterfallStep = {
  name: 'waterfall';
  valueColumn: string;
  milestonesColumn: string;
  start: string;
  end: string;
  labelsColumn: string;
  parentsColumn?: string;
  groupby?: string[];
  sortBy: 'label' | 'value';
  order: 'asc' | 'desc';
};

export type PipelineStep =
  | AddTextColumnStep
  | AggregationStep
  | AppendStep
  | ArgmaxStep
  | ArgminStep
  | ConcatenateStep
  | ConvertStep
  | CumSumStep
  | CustomStep
  | DateExtractPropertyStep
  | DeleteStep
  | DuplicateColumnStep
  | DomainStep
  | EvolutionStep
  | FillnaStep
  | FilterStep
  | FormulaStep
  | FromDateStep
  | IfThenElseStep
  | JoinStep
  | PercentageStep
  | PivotStep
  | RankStep
  | RenameStep
  | ReplaceStep
  | RollupStep
  | SelectStep
  | SplitStep
  | SortStep
  | StatisticsStep
  | SubstringStep
  | ToDateStep
  | ToLowerStep
  | TopStep
  | ToUpperStep
  | UniqueGroupsStep
  | UnpivotStep
  | WaterfallStep;

export type PipelineStepName = PipelineStep['name'];
export type Pipeline = PipelineStep[];

/**
 * Type guard for `FilterComboAnd` type
 * @param cond the condition to test
 */
export function isFilterComboAnd(cond: FilterCondition): cond is FilterComboAnd {
  if ((cond as FilterComboAnd).and) {
    return true;
  }
  return false;
}

/**
 * Type guard for `FilterComboOr` type
 * @param cond the condition to test
 */
export function isFilterComboOr(cond: FilterCondition): cond is FilterComboOr {
  if ((cond as FilterComboOr).or) {
    return true;
  }
  return false;
}
