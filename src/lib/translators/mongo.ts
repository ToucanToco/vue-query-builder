/** This module contains mongo specific translation operations */

import _ from 'lodash';
import * as math from 'mathjs';

import { $$ } from '@/lib/helpers';
import { OutputStep, StepMatcher } from '@/lib/matcher';
import * as S from '@/lib/steps';
import { BaseTranslator, ValidationError } from '@/lib/translators/base';
import { MathNode } from '@/typings/mathjs';

type PropMap<T> = { [prop: string]: T };

/**
 * MongoStep interface. For now, it's basically an object with any property.
 */
export interface MongoStep {
  [propName: string]: any;
}

type ComboOperator = 'and' | 'or';

type DateOperationMap = {
  [OP in S.DateExtractPropertyStep['operation']]: string;
};

type FilterComboAndMongo = {
  $and: MongoStep[];
};

const DATE_EXTRACT_MAP: DateOperationMap = {
  year: '$year',
  month: '$month',
  day: '$dayOfMonth',
  hour: '$hour',
  minutes: '$minute',
  seconds: '$second',
  milliseconds: '$millisecond',
  dayOfYear: '$dayOfYear',
  dayOfWeek: '$dayOfWeek',
  week: '$week',
};

/**
 * Transform a list of column names into a mongo map `colname` -> `$colname`
 *
 * This kind of construction is very frequent in mongo steps (e.g. in `$group` or
 * `$project` steps).
 *
 * @param colnames list of column names
 */
function columnMap(colnames: string[]) {
  return _.fromPairs(colnames.map(col => [col, $$(col)]));
}

/**
 * Generate a mongo [user variable](https://docs.mongodb.com/manual/reference/aggregation-variables/#user-variables)
 * valid identifier from a column name.
 *
 * @param colname
 */
function columnToUserVariable(colname: string): string {
  // User variable names can contain the ascii characters [_a-zA-Z0-9] and any non-ascii character.
  const colnameWithoutInvalidChars = colname.replace(/[^_a-zA-Z0-9]/g, '_');

  // User variable names must begin with a lowercase ascii letter [a-z] or a non-ascii character.
  // Starting with the `vqb_` prefix guaranties that.
  return `vqb_${colnameWithoutInvalidChars}`;
}

export function _simplifyAndCondition(filterAndCond: FilterComboAndMongo): MongoStep {
  let simplifiedBlock: MongoStep = {};
  const andList: MongoStep[] = [];
  const counter: PropMap<number> = {};

  for (const cond of filterAndCond.$and) {
    for (const key in cond) {
      counter[key] = Object.prototype.hasOwnProperty.call(counter, key) ? counter[key] + 1 : 1;
    }
  }

  for (const cond of filterAndCond.$and) {
    for (const key in cond) {
      if (counter[key] > 1 && key !== '$or') {
        andList.push({ [key]: cond[key] });
      } else {
        simplifiedBlock = { ...simplifiedBlock, [key]: cond[key] };
      }
    }
  }

  if (andList.length > 0) {
    simplifiedBlock = { ...simplifiedBlock, $and: andList };
  }

  return simplifiedBlock;
}

/**
 * Simplify a list of mongo steps (i.e. merge them whenever possible)
 *
 * - if multiple `$match` steps are chained, merge them,
 * - if multiple `$project` steps are chained, merge them.
 *
 * @param mongoSteps the input pipeline
 *
 * @returns the list of simplified mongo steps
 */
export function _simplifyMongoPipeline(mongoSteps: MongoStep[]): MongoStep[] {
  if (!mongoSteps.length) {
    return [];
  }
  let merge = true;
  const outputSteps: MongoStep[] = [];
  let lastStep: MongoStep = mongoSteps[0];
  outputSteps.push(lastStep);

  for (const step of mongoSteps.slice(1)) {
    const [stepOperator] = Object.keys(step);
    const isMergeable = stepOperator === '$project' || stepOperator === '$match';
    if (isMergeable && lastStep[stepOperator] !== undefined) {
      for (const key in step[stepOperator]) {
        /**
         * In Mongo, exclusions cannot be combined with any inclusion, so if we
         * have an exclusion in a $project step, and that the previous one
         * includes any inclusion, we do not want to merge those steps.
         */
        if (stepOperator === '$project') {
          const included = Boolean(step.$project[key]);
          merge = Object.values(lastStep.$project).every(value => Boolean(value) === included);
        }
        if (Object.prototype.hasOwnProperty.call(lastStep[stepOperator], key)) {
          // We do not want to merge two $project with common keys
          merge = false;
          break;
        }
        if (stepOperator !== '$match') {
          // We do not want to merge two $project or $addFields with a `step`
          // key referencing as value a`lastStep` key
          const valueString: string = JSON.stringify(step[stepOperator][key]);
          for (const lastKey in lastStep[stepOperator]) {
            const regex = new RegExp(`.*['"]\\$${lastKey}(\\..+)?['"].*`);
            if (regex.test(valueString)) {
              merge = false;
              break;
            }
          }
        }
      }
      if (merge) {
        // merge $project steps together
        lastStep[stepOperator] = { ...lastStep[stepOperator], ...step[stepOperator] };
        continue;
      }
    }
    lastStep = step;
    outputSteps.push(lastStep);
    merge = true;
  }
  return outputSteps;
}

function getOperator(op: string) {
  const operators: PropMap<string> = {
    '+': '$add',
    '-': '$subtract',
    '*': '$multiply',
    '/': '$divide',
  };
  if (operators[op] === undefined) {
    throw new Error(`Unsupported operator ${op}`);
  } else {
    return operators[op];
  }
}

/**
  Transform a formula expression into a MathNode
  1. Replace in formula all column name between `[]` by a "pseudo"
  2. Parse the formula into a MathNode
  3. Replace all pseudo into MathNode by there original name
*/
function buildFormulaTree(formula: string): MathNode {
  const ESCAPE_OPEN = '[';
  const ESCAPE_CLOSE = ']';

  // 1. Replace in formula all column name between `[]` by a "pseudo"
  let formulaPseudotised = formula;
  const pseudo: Record<string, string> = {};
  let index = 0;
  const regex = new RegExp(`\\${ESCAPE_OPEN}(.*?)\\${ESCAPE_CLOSE}`, 'g');
  for (const match of formula.match(regex) || []) {
    pseudo[`__vqb_col_${index}__`] = match;
    formulaPseudotised = formulaPseudotised.replace(match, `__vqb_col_${index}__`);
    index++;
  }

  // 2. Parse the formula into a MathNode
  const mathjsTree: MathNode = math.parse(formulaPseudotised);

  // 3. Replace all pseudo into MathNode by there original name
  mathjsTree.traverse(function(node: MathNode): MathNode {
    if (node.type === 'SymbolNode') {
      if (pseudo[node.name]) {
        node.name = pseudo[node.name].replace(ESCAPE_OPEN, '').replace(ESCAPE_CLOSE, '');
      }
    }
    return node;
  });
  return mathjsTree;
}

function buildCondExpression(
  cond: S.FilterSimpleCondition | S.FilterComboAnd | S.FilterComboOr,
): MongoStep {
  const operatorMapping = {
    eq: '$eq',
    ne: '$ne',
    lt: '$lt',
    le: '$lte',
    gt: '$gt',
    ge: '$gte',
    in: '$in',
    nin: '$nin',
    isnull: '$eq',
    notnull: '$ne',
  };
  if (S.isFilterComboAnd(cond)) {
    if (cond.and.length == 1) {
      return buildCondExpression(cond.and[0]);
    } else {
      // if cond.and.length > 1 we need to bind conditions in a $and operator,
      // as we need a unnique document to be used as the first argument of the
      // $cond operator
      return { $and: cond.and.map(buildCondExpression) };
    }
  }
  if (S.isFilterComboOr(cond)) {
    return { $or: cond.or.map(elem => buildCondExpression(elem)) };
  }
  if (cond.operator === 'matches' || cond.operator === 'notmatches') {
    throw new Error(`Unsupported operator ${cond.operator}`);
  }
  return { [operatorMapping[cond.operator]]: [$$(cond.column), cond.value] };
}

function buildMatchTree(
  cond: S.FilterSimpleCondition | S.FilterComboAnd | S.FilterComboOr,
  parentComboOp: ComboOperator = 'and',
): MongoStep {
  const operatorMapping = {
    eq: '$eq',
    ne: '$ne',
    lt: '$lt',
    le: '$lte',
    gt: '$gt',
    ge: '$gte',
    in: '$in',
    nin: '$nin',
    isnull: '$eq',
    notnull: '$ne',
  };
  if (S.isFilterComboAnd(cond) && parentComboOp !== 'or') {
    return _simplifyAndCondition({ $and: cond.and.map(elem => buildMatchTree(elem, 'and')) });
  }
  if (S.isFilterComboAnd(cond)) {
    return { $and: cond.and.map(elem => buildMatchTree(elem, 'and')) };
  }
  if (S.isFilterComboOr(cond)) {
    return { $or: cond.or.map(elem => buildMatchTree(elem, 'or')) };
  }
  if (cond.operator === 'matches') {
    return { [cond.column]: { $regex: cond.value } };
  } else if (cond.operator === 'notmatches') {
    return { [cond.column]: { $not: { $regex: cond.value } } };
  }
  return { [cond.column]: { [operatorMapping[cond.operator]]: cond.value } };
}

/**
 * Translate a mathjs logical tree describing a formula into a Mongo step
 * @param node a mathjs node object (usually received after parsing an string expression)
 * This node is the root node of the logical tree describing the formula
 */
function buildMongoFormulaTree(node: MathNode): MongoStep | string | number {
  switch (node.type) {
    case 'OperatorNode':
      if (node.args.length === 1) {
        const factor = node.op === '+' ? 1 : -1;
        return {
          $multiply: [factor, buildMongoFormulaTree(node.args[0])],
        };
      }
      return {
        [getOperator(node.op)]: node.args.map(e => buildMongoFormulaTree(e)),
      };
    case 'SymbolNode':
      // Re-put the name back
      return $$(node.name);
    case 'ConstantNode':
      return node.value;
    case 'ParenthesisNode':
      return buildMongoFormulaTree(node.content);
  }
}

/** transform an 'aggregate' step into corresponding mongo steps */
function transformAggregate(step: Readonly<S.AggregationStep>): MongoStep[] {
  const idblock: PropMap<string> = columnMap(step.on);
  const group: { [id: string]: {} } = {};
  const project: PropMap<any> = {};

  group._id = idblock;

  for (const aggfStep of step.aggregations) {
    if (aggfStep.aggfunction === 'count') {
      // There is no `$count` operator in Mongo, we have to `$sum` 1s to get
      // an equivalent result
      group[aggfStep.newcolumn] = {
        $sum: 1,
      };
    } else {
      group[aggfStep.newcolumn] = {
        [$$(aggfStep.aggfunction)]: $$(aggfStep.column),
      };
    }
  }

  if (step.keepOriginalGranularity) {
    // we keep track of all columns
    group['_vqbDocsArray'] = { $push: '$$ROOT' };
    return [
      { $group: group },
      { $unwind: '$_vqbDocsArray' },
      { $replaceRoot: { newRoot: { $mergeObjects: ['$_vqbDocsArray', '$$ROOT'] } } },
      { $project: { _vqbDocsArray: 0 } },
    ];
  } else {
    for (const groupKey of Object.keys(group)) {
      if (groupKey === '_id') {
        for (const idkey of Object.keys(group[groupKey])) {
          project[idkey] = `$_id.${idkey}`;
        }
      } else {
        project[groupKey] = 1;
      }
    }
    return [{ $group: group }, { $project: project }];
  }
}

/** transform an 'argmax' or 'argmin' step into corresponding mongo steps */
function transformArgmaxArgmin(step: Readonly<S.ArgmaxStep> | Readonly<S.ArgminStep>): MongoStep[] {
  const groupMongo: MongoStep = {};
  const stepMapping = { argmax: '$max', argmin: '$min' };

  groupMongo.$group = {
    _id: step.groups ? columnMap(step.groups) : null,
    _vqbAppArray: { $push: '$$ROOT' },
    _vqbAppValueToCompare: { [stepMapping[step.name]]: $$(step.column) },
  };

  return [
    groupMongo,
    { $unwind: '$_vqbAppArray' },
    { $replaceRoot: { newRoot: { $mergeObjects: ['$_vqbAppArray', '$$ROOT'] } } },
    { $project: { _vqbAppArray: 0 } },
    {
      /**
       * shortcut operator to avoid to firstly create a boolean column via $project
       * and then filter on 'true' rows via $match.
       * "$$KEEP" (resp. $$PRUNE") keeps (resp. exlcludes) rows matching (resp.
       * not matching) the condition.
       */
      $redact: {
        $cond: [
          {
            $eq: [$$(step.column), '$_vqbAppValueToCompare'],
          },
          '$$KEEP',
          '$$PRUNE',
        ],
      },
    },
    { $project: { _vqbAppValueToCompare: 0 } },
  ];
}

/** transform a 'cumsum' step into corresponding mongo steps */
function transformCumSum(step: Readonly<S.CumSumStep>): MongoStep {
  const groupby = step.groupby ?? [];
  return [
    { $sort: { [step.referenceColumn]: 1 } },
    {
      $group: {
        _id: step.groupby ? columnMap(groupby) : null,
        [step.valueColumn]: { $push: $$(step.valueColumn) },
        _vqbArray: { $push: '$$ROOT' },
      },
    },
    { $unwind: { path: '$_vqbArray', includeArrayIndex: '_VQB_INDEX' } },
    {
      $project: {
        ...Object.fromEntries(groupby.map(col => [col, `$_id.${col}`])),
        [step.newColumn ?? `${step.valueColumn}_CUMSUM`]: {
          $sum: {
            $slice: [$$(step.valueColumn), { $add: ['$_VQB_INDEX', 1] }],
          },
        },
        _vqbArray: 1,
      },
    },
    { $replaceRoot: { newRoot: { $mergeObjects: ['$_vqbArray', '$$ROOT'] } } },
    { $project: { _vqbArray: 0 } },
  ];
}

/** transform a 'concatenate' step into corresponding mongo steps */
function transformConcatenate(step: Readonly<S.ConcatenateStep>): MongoStep {
  const concatArr: string[] = [$$(step.columns[0])];
  for (const colname of step.columns.slice(1)) {
    concatArr.push(step.separator, $$(colname));
  }
  return { $addFields: { [step.new_column_name]: { $concat: concatArr } } };
}

/** transform an 'evolution' step into corresponding mongo steps */
function transformEvolution(step: Readonly<S.EvolutionStep>): MongoStep {
  const newColumn = step.newColumn ?? `${step.valueCol}_EVOL_${step.evolutionFormat.toUpperCase()}`;
  const errorMsg = 'Error: More than one previous date found for the specified index columns';
  const addFieldDatePrev: PropMap<any> = {};
  const addFieldResult: PropMap<any> = {};

  if (step.evolutionFormat === 'abs') {
    addFieldResult[newColumn] = {
      $cond: [
        { $eq: ['$_VQB_VALUE_PREV', 'Error'] },
        errorMsg,
        { $subtract: [$$(step.valueCol), '$_VQB_VALUE_PREV'] },
      ],
    };
  } else {
    addFieldResult[newColumn] = {
      $switch: {
        branches: [
          { case: { $eq: ['$_VQB_VALUE_PREV', 'Error'] }, then: errorMsg },
          { case: { $eq: ['$_VQB_VALUE_PREV', 0] }, then: null },
        ],
        default: {
          $divide: [{ $subtract: [$$(step.valueCol), '$_VQB_VALUE_PREV'] }, '$_VQB_VALUE_PREV'],
        },
      },
    };
  }

  if (step.evolutionType === 'vsLastYear') {
    addFieldDatePrev['_VQB_DATE_PREV'] = {
      $dateFromParts: {
        year: { $subtract: [{ $year: $$(step.dateCol) }, 1] },
        month: { $month: $$(step.dateCol) },
        day: { $dayOfMonth: $$(step.dateCol) },
      },
    };
  } else if (step.evolutionType === 'vsLastMonth') {
    addFieldDatePrev['_VQB_DATE_PREV'] = {
      $dateFromParts: {
        year: {
          $cond: [
            { $eq: [{ $month: $$(step.dateCol) }, 1] },
            { $subtract: [{ $year: $$(step.dateCol) }, 1] },
            { $year: $$(step.dateCol) },
          ],
        },
        month: {
          $cond: [
            { $eq: [{ $month: $$(step.dateCol) }, 1] },
            12,
            { $subtract: [{ $month: $$(step.dateCol) }, 1] },
          ],
        },
        day: { $dayOfMonth: $$(step.dateCol) },
      },
    };
  } else {
    addFieldDatePrev['_VQB_DATE_PREV'] = {
      $subtract: [
        $$(step.dateCol),
        60 * 60 * 24 * 1000 * (step.evolutionType === 'vsLastWeek' ? 7 : 1),
      ],
    };
  }
  return [
    { $addFields: addFieldDatePrev },
    {
      $facet: {
        _VQB_ORIGINALS: [{ $project: { _id: 0 } }],
        _VQB_COPIES_ARRAY: [{ $group: { _id: null, _VQB_ALL_DOCS: { $push: '$$ROOT' } } }],
      },
    },
    { $unwind: '$_VQB_ORIGINALS' },
    {
      $project: {
        _VQB_ORIGINALS: {
          $mergeObjects: ['$_VQB_ORIGINALS', { $arrayElemAt: ['$_VQB_COPIES_ARRAY', 0] }],
        },
      },
    },
    { $replaceRoot: { newRoot: '$_VQB_ORIGINALS' } },
    {
      $addFields: {
        _VQB_ALL_DOCS: {
          $filter: {
            input: '$_VQB_ALL_DOCS',
            as: 'item',
            cond: {
              $and: [
                { $eq: ['$_VQB_DATE_PREV', `$$item.${step.dateCol}`] },
                ...step.indexColumns.map(col => ({ $eq: [$$(col), `$$item.${col}`] })),
              ],
            },
          },
        },
      },
    },
    {
      $addFields: {
        _VQB_VALUE_PREV: {
          $cond: [
            { $gt: [{ $size: `$_VQB_ALL_DOCS.${step.valueCol}` }, 1] },
            'Error',
            { $arrayElemAt: [`$_VQB_ALL_DOCS.${step.valueCol}`, 0] },
          ],
        },
      },
    },
    { $addFields: addFieldResult },
    {
      $project: {
        _VQB_ALL_DOCS: 0,
        _VQB_DATE_PREV: 0,
        _VQB_VALUE_PREV: 0,
      },
    },
  ];
}

/** transform a 'filter' step into corresponding mongo step */
function transformFilterStep(step: Readonly<S.FilterStep>): MongoStep {
  const condition = step.condition;
  return { $match: buildMatchTree(condition) };
}

/** transform a 'fromdate' step into corresponding mongo steps */
function transformFromDate(step: Readonly<S.FromDateStep>): MongoStep {
  const smallMonthReplace = {
    $switch: {
      branches: [
        { case: { $eq: ['$_vqbTempMonth', '01'] }, then: 'Jan' },
        { case: { $eq: ['$_vqbTempMonth', '02'] }, then: 'Feb' },
        { case: { $eq: ['$_vqbTempMonth', '03'] }, then: 'Mar' },
        { case: { $eq: ['$_vqbTempMonth', '04'] }, then: 'Apr' },
        { case: { $eq: ['$_vqbTempMonth', '05'] }, then: 'May' },
        { case: { $eq: ['$_vqbTempMonth', '06'] }, then: 'Jun' },
        { case: { $eq: ['$_vqbTempMonth', '07'] }, then: 'Jul' },
        { case: { $eq: ['$_vqbTempMonth', '08'] }, then: 'Aug' },
        { case: { $eq: ['$_vqbTempMonth', '09'] }, then: 'Sep' },
        { case: { $eq: ['$_vqbTempMonth', '10'] }, then: 'Oct' },
        { case: { $eq: ['$_vqbTempMonth', '11'] }, then: 'Nov' },
        { case: { $eq: ['$_vqbTempMonth', '12'] }, then: 'Dec' },
      ],
    },
  };

  const fullMonthReplace = {
    $switch: {
      branches: [
        { case: { $eq: ['$_vqbTempMonth', '01'] }, then: 'January' },
        { case: { $eq: ['$_vqbTempMonth', '02'] }, then: 'February' },
        { case: { $eq: ['$_vqbTempMonth', '03'] }, then: 'March' },
        { case: { $eq: ['$_vqbTempMonth', '04'] }, then: 'April' },
        { case: { $eq: ['$_vqbTempMonth', '05'] }, then: 'May' },
        { case: { $eq: ['$_vqbTempMonth', '06'] }, then: 'June' },
        { case: { $eq: ['$_vqbTempMonth', '07'] }, then: 'July' },
        { case: { $eq: ['$_vqbTempMonth', '08'] }, then: 'August' },
        { case: { $eq: ['$_vqbTempMonth', '09'] }, then: 'September' },
        { case: { $eq: ['$_vqbTempMonth', '10'] }, then: 'October' },
        { case: { $eq: ['$_vqbTempMonth', '11'] }, then: 'December' },
        { case: { $eq: ['$_vqbTempMonth', '12'] }, then: 'December' },
      ],
    },
  };

  switch (step.format) {
    /**
     * `%d %b %Y`, `%d-%b-%Y`, `%d %B %Y`, `%b %Y` are date format `$dateToString`
     * cannot handle. Therefore we design special query to handle these formats
     */
    case '%d %b %Y':
      return [
        {
          $addFields: {
            [step.column]: {
              $dateToString: { date: $$(step.column), format: '%d-%m-%Y' },
            },
          },
        },
        { $addFields: { _vqbTempArray: { $split: [$$(step.column), '-'] } } },
        {
          $addFields: {
            _vqbTempDay: { $arrayElemAt: ['$_vqbTempArray', 0] },
            _vqbTempMonth: { $arrayElemAt: ['$_vqbTempArray', 1] },
            _vqbTempYear: { $arrayElemAt: ['$_vqbTempArray', 2] },
          },
        },
        {
          $addFields: { _vqbTempMonth: smallMonthReplace },
        },
        {
          $addFields: {
            [step.column]: {
              $concat: ['$_vqbTempDay', ' ', '$_vqbTempMonth', ' ', '$_vqbTempYear'],
            },
          },
        },
        { $project: { _vqbTempArray: 0, _vqbTempDay: 0, _vqbTempMonth: 0, _vqbTempYear: 0 } },
      ];
    case '%d-%b-%Y':
      return [
        {
          $addFields: {
            [step.column]: {
              $dateToString: { date: $$(step.column), format: '%d-%m-%Y' },
            },
          },
        },
        { $addFields: { _vqbTempArray: { $split: [$$(step.column), '-'] } } },
        {
          $addFields: {
            _vqbTempDay: { $arrayElemAt: ['$_vqbTempArray', 0] },
            _vqbTempMonth: { $arrayElemAt: ['$_vqbTempArray', 1] },
            _vqbTempYear: { $arrayElemAt: ['$_vqbTempArray', 2] },
          },
        },
        {
          $addFields: { _vqbTempMonth: smallMonthReplace },
        },
        {
          $addFields: {
            [step.column]: {
              $concat: ['$_vqbTempDay', '-', '$_vqbTempMonth', '-', '$_vqbTempYear'],
            },
          },
        },
        { $project: { _vqbTempArray: 0, _vqbTempDay: 0, _vqbTempMonth: 0, _vqbTempYear: 0 } },
      ];
    case '%d %B %Y':
      return [
        {
          $addFields: {
            [step.column]: {
              $dateToString: { date: $$(step.column), format: '%d-%m-%Y' },
            },
          },
        },
        { $addFields: { _vqbTempArray: { $split: [$$(step.column), '-'] } } },
        {
          $addFields: {
            _vqbTempDay: { $arrayElemAt: ['$_vqbTempArray', 0] },
            _vqbTempMonth: { $arrayElemAt: ['$_vqbTempArray', 1] },
            _vqbTempYear: { $arrayElemAt: ['$_vqbTempArray', 2] },
          },
        },
        {
          $addFields: { _vqbTempMonth: fullMonthReplace },
        },
        {
          $addFields: {
            [step.column]: {
              $concat: ['$_vqbTempDay', ' ', '$_vqbTempMonth', ' ', '$_vqbTempYear'],
            },
          },
        },
        { $project: { _vqbTempArray: 0, _vqbTempDay: 0, _vqbTempMonth: 0, _vqbTempYear: 0 } },
      ];
    case '%b %Y':
      return [
        {
          $addFields: {
            [step.column]: {
              $dateToString: { date: $$(step.column), format: '%m-%Y' },
            },
          },
        },
        { $addFields: { _vqbTempArray: { $split: [$$(step.column), '-'] } } },
        {
          $addFields: {
            _vqbTempMonth: { $arrayElemAt: ['$_vqbTempArray', 0] },
            _vqbTempYear: { $arrayElemAt: ['$_vqbTempArray', 1] },
          },
        },
        {
          $addFields: { _vqbTempMonth: smallMonthReplace },
        },
        {
          $addFields: {
            [step.column]: {
              $concat: ['$_vqbTempMonth', ' ', '$_vqbTempYear'],
            },
          },
        },
        { $project: { _vqbTempArray: 0, _vqbTempMonth: 0, _vqbTempYear: 0 } },
      ];
    case '%b-%Y':
      return [
        {
          $addFields: {
            [step.column]: {
              $dateToString: { date: $$(step.column), format: '%m-%Y' },
            },
          },
        },
        { $addFields: { _vqbTempArray: { $split: [$$(step.column), '-'] } } },
        {
          $addFields: {
            _vqbTempMonth: { $arrayElemAt: ['$_vqbTempArray', 0] },
            _vqbTempYear: { $arrayElemAt: ['$_vqbTempArray', 1] },
          },
        },
        {
          $addFields: { _vqbTempMonth: smallMonthReplace },
        },
        {
          $addFields: {
            [step.column]: {
              $concat: ['$_vqbTempMonth', '-', '$_vqbTempYear'],
            },
          },
        },
        { $project: { _vqbTempArray: 0, _vqbTempMonth: 0, _vqbTempYear: 0 } },
      ];
    case '%B %Y':
      return [
        {
          $addFields: {
            [step.column]: {
              $dateToString: { date: $$(step.column), format: '%m-%Y' },
            },
          },
        },
        { $addFields: { _vqbTempArray: { $split: [$$(step.column), '-'] } } },
        {
          $addFields: {
            _vqbTempMonth: { $arrayElemAt: ['$_vqbTempArray', 0] },
            _vqbTempYear: { $arrayElemAt: ['$_vqbTempArray', 1] },
          },
        },
        {
          $addFields: { _vqbTempMonth: fullMonthReplace },
        },
        {
          $addFields: {
            [step.column]: {
              $concat: ['$_vqbTempMonth', ' ', '$_vqbTempYear'],
            },
          },
        },
        { $project: { _vqbTempArray: 0, _vqbTempMonth: 0, _vqbTempYear: 0 } },
      ];
    default:
      return [
        {
          $addFields: {
            [step.column]: {
              $dateToString: { date: $$(step.column), format: step.format },
            },
          },
        },
      ];
  }
}

/** transform an 'ifthenelse' step into corresponding mongo step */
function transformIfThenElseStep(
  step: Readonly<Omit<S.IfThenElseStep, 'name' | 'newColumn'>>,
): MongoStep {
  const ifExpr: MongoStep = buildCondExpression(step.if);
  const thenExpr = buildMongoFormulaTree(buildFormulaTree(step.then));
  let elseExpr: MongoStep | string | number;
  if (typeof step.else === 'string') {
    elseExpr = buildMongoFormulaTree(buildFormulaTree(step.else));
  } else {
    elseExpr = transformIfThenElseStep(step.else);
  }
  return { $cond: { if: ifExpr, then: thenExpr, else: elseExpr } };
}

/** transform an 'percentage' step into corresponding mongo steps */
function transformPercentage(step: Readonly<S.PercentageStep>): MongoStep[] {
  return [
    {
      $group: {
        _id: step.group ? columnMap(step.group) : null,
        _vqbAppArray: { $push: '$$ROOT' },
        _vqbTotalDenum: { $sum: $$(step.column) },
      },
    },
    { $unwind: '$_vqbAppArray' },
    {
      $project: {
        [step.newColumnName ?? `${step.column}_PCT`]: {
          $cond: [
            { $eq: ['$_vqbTotalDenum', 0] },
            null,
            { $divide: [`$_vqbAppArray.${step.column}`, '$_vqbTotalDenum'] },
          ],
        },
        _vqbAppArray: 1, // we need to keep track of this key for the next operation
      },
    },
    // Line below: Keep all columns that were not used in computation, 'stored' in _vqbAppArray
    { $replaceRoot: { newRoot: { $mergeObjects: ['$_vqbAppArray', '$$ROOT'] } } },
    { $project: { _vqbAppArray: 0 } }, // We do not want to keep that column at the end
  ];
}

/** transform an 'pivot' step into corresponding mongo steps */
function transformPivot(step: Readonly<S.PivotStep>): MongoStep[] {
  const groupCols2: PropMap<string> = {};
  const addFieldsStep: PropMap<string> = {};

  // Prepare groupCols to populate the `_id` field sof Mongo `$group` steps and addFields step
  for (const col of step.index) {
    groupCols2[col] = `$_id.${col}`;
    addFieldsStep[`_vqbAppTmpObj.${col}`] = `$_id.${col}`;
  }

  return [
    /**
     * First we perform the aggregation with the _id including the column to pivot
     */
    {
      $group: {
        _id: { ...columnMap(step.index), [step.column_to_pivot]: $$(step.column_to_pivot) },
        [step.value_column]: { [$$(step.agg_function)]: $$(step.value_column) },
      },
    },
    /**
     * Then we group with with index columns as _id and we push documents as an array of sets
     * including a column for the column to pivot and a column for the corresponding value
     */
    {
      $group: {
        _id: groupCols2,
        _vqbAppArray: {
          $addToSet: {
            [step.column_to_pivot]: `$_id.${step.column_to_pivot}`,
            [step.value_column]: $$(step.value_column),
          },
        },
      },
    },
    /**
     * Then we project a tmp key to get an object from the array of couples [column_to_pivot, corresponding_value]
     * including a column for the column to pivot and a column for the corresponding value
     */
    {
      $project: {
        _vqbAppTmpObj: {
          $arrayToObject: {
            $zip: {
              inputs: [
                `$_vqbAppArray.${step.column_to_pivot}`,
                `$_vqbAppArray.${step.value_column}`,
              ],
            },
          },
        },
      },
    },
    /**
     * Then we include back in every document created in the previous step the index columns
     * (still accessible in the _id object)
     */
    { $addFields: addFieldsStep },
    /**
     * Then we replace the root of the documents tree to get our columns ready for
     * our needed table-like, unnested format
     */
    { $replaceRoot: { newRoot: '$_vqbAppTmpObj' } },
  ];
}

/** transform a 'rank' step into corresponding mongo steps */
function transformRank(step: Readonly<S.RankStep>): MongoStep {
  let vqbVarOrder: MongoStep = {};

  /**
   * Here we define the order variable that will be used in the '$reduce' step
   * defined below. The order definition depends on the ranking method chosen.
   *
   * Example of ranking output depending on method chosen:
   *
   *  - standard: [10, 15, 15, 15, 20, 20, 22] => [1, 2, 2, 2, 5, 5, 7]
   *  - dense: [10, 15, 15, 15, 20, 20, 22] => [1, 2, 2, 2, 3, 3, 4]
   *
   * Notes on special Mongo variables used in the '$reduce' step defined below:
   *
   *  - '$$this' refers to the element being processed
   *  - '$$value' refers to the cumulative value of the expression
   */
  if (step.method === 'dense') {
    vqbVarOrder = {
      $cond: [
        { $ne: [`$$this.${step.valueCol}`, '$$value.prevValue'] },
        { $add: ['$$value.order', 1] },
        '$$value.order',
      ],
    };
  } else {
    vqbVarOrder = { $add: ['$$value.order', 1] };
  }

  /**
   * This is the variable object used in the '$reduce' step described below (see
   * the object structure in the 'rankedArray' doc below). It's here that we
   * compute the rank, that compares two consecutive documents in sorted arrays
   * and which definition depends on the ranking method chosen (see above)
   *
   * Notes on special Mongo variables used in the '$reduce' step defined below:
   *
   *  - '$$this' refers to the element being processed
   *  - '$$value' refers to the cumulative value of the expression
   */
  const vqbVarObj: MongoStep = {
    $let: {
      vars: {
        order: vqbVarOrder,
        rank: {
          $cond: [
            { $ne: [`$$this.${step.valueCol}`, '$$value.prevValue'] },
            { $add: ['$$value.order', 1] },
            '$$value.prevRank',
          ],
        },
      },
      in: {
        a: {
          $concatArrays: [
            '$$value.a',
            [
              {
                $mergeObjects: [
                  '$$this',
                  { [step.newColumnName ?? `${step.valueCol}_RANK`]: '$$rank' },
                ],
              },
            ],
          ],
        },
        order: '$$order',
        prevValue: `$$this.${step.valueCol}`,
        prevRank: '$$rank',
      },
    },
  };

  /**
   * This step transforms sorted arrays (1 array per group as specified by the
   * 'groupby' parameter) of documents into an array of the same sorted documents,
   * with the information of ranking of each document added ionto each(key 'rank).
   *
   * To do so we reduce orignal arrays in one document each with the structure:
   * {
   *   a: [ < list of sorted documents with rank key added > ],
   *   order: < an order counter >,
   *   prevValue: < to keep track of previous document value >,
   *   prevRank: < to keep track of previous document rank >
   * }
   *
   * At the end we just extract the 'a' array (as other keys were only useful as
   * variables in the '$reduce' step)
   */
  const rankedArray: MongoStep = {
    $let: {
      vars: {
        reducedArrayInObj: {
          $reduce: {
            input: '$_vqbArray',
            initialValue: {
              a: [],
              order: 0,
              prevValue: undefined,
              prevRank: undefined,
            },
            in: vqbVarObj,
          },
        },
      },
      in: '$$reducedArrayInObj.a',
    },
  };
  return [
    { $sort: { [step.valueCol]: step.order == 'asc' ? 1 : -1 } },
    {
      $group: {
        _id: step.groupby ? columnMap(step.groupby) : null,
        _vqbArray: { $push: '$$ROOT' },
      },
    },
    { $project: { _vqbSortedArray: rankedArray } },
    { $unwind: '$_vqbSortedArray' },
    { $replaceRoot: { newRoot: '$_vqbSortedArray' } },
  ];
}

function transformRename(step: Readonly<S.RenameStep>): MongoStep[] {
  // For retrocompatibility with old configurations
  if (step.oldname && step.newname) {
    return [
      { $addFields: { [step.newname]: $$(step.oldname) } },
      { $project: { [step.oldname]: 0 } },
    ];
  }

  return [
    { $addFields: Object.fromEntries(step.toRename.map(a => [a[1], $$(a[0])])) },
    { $project: Object.fromEntries(step.toRename.map(a => [a[0], 0])) },
  ];
}

/** transform an 'replace' step into corresponding mongo steps */
function transformReplace(step: Readonly<S.ReplaceStep>): MongoStep {
  const branches: MongoStep[] = step.to_replace.map(([oldval, newval]) => ({
    case: { $eq: [$$(step.search_column), oldval] },
    then: newval,
  }));
  return {
    $addFields: {
      [step.search_column]: {
        $switch: { branches: branches, default: $$(step.search_column) },
      },
    },
  };
}

/** transform a 'rollup' step into corresponding mongo pipeline steps */
function transformRollup(step: Readonly<S.RollupStep>): MongoStep {
  const facet: { [id: string]: MongoStep[] } = {};
  const labelCol = step.labelCol ?? 'label';
  const levelCol = step.levelCol ?? 'level';
  const parentLabelCol = step.parentLabelCol ?? 'parent';
  for (const [idx, elem] of step.hierarchy.entries()) {
    const id = columnMap([...step.hierarchy.slice(0, idx + 1), ...(step.groupby ?? [])]);
    const aggs: { [id: string]: {} } = {};
    for (const aggfStep of step.aggregations) {
      if (aggfStep.aggfunction === 'count') {
        aggs[aggfStep.newcolumn] = {
          $sum: 1,
        };
      } else {
        aggs[aggfStep.newcolumn] = {
          [$$(aggfStep.aggfunction)]: $$(aggfStep.column),
        };
      }
    }
    const project: { [id: string]: string | number } = {
      _id: 0,
      ...Object.fromEntries(Object.keys(id).map(col => [col, `$_id.${col}`])),
      ...Object.fromEntries(Object.keys(aggs).map(col => [col, 1])),
      [labelCol]: `$_id.${elem}`,
      [levelCol]: elem,
    };
    if (idx > 0) {
      project[parentLabelCol] = `$_id.${step.hierarchy[idx - 1]}`;
    }
    facet[`level_${idx}`] = [
      {
        $group: {
          _id: id,
          ...aggs,
        },
      },
      {
        $project: project,
      },
    ];
  }
  return [
    { $facet: facet },
    {
      $project: {
        _vqbRollupLevels: {
          $concatArrays: Object.keys(facet)
            .sort()
            .map(col => $$(col)),
        },
      },
    },
    { $unwind: '$_vqbRollupLevels' },
    { $replaceRoot: { newRoot: '$_vqbRollupLevels' } },
  ];
}

/** transform a 'sort' step into corresponding mongo steps */
function transformSort(step: Readonly<S.SortStep>): MongoStep {
  const sortMongo: PropMap<number> = {};
  for (const sortColumn of step.columns) {
    sortMongo[sortColumn.column] = sortColumn.order === 'asc' ? 1 : -1;
  }
  return { $sort: sortMongo };
}

/** transform a 'split' step into corresponding mongo steps */
function transformSplit(step: Readonly<S.SplitStep>): MongoStep {
  const addFieldsStep: PropMap<object> = {};
  for (let i = 1; i <= step.number_cols_to_keep; i++) {
    addFieldsStep[`${step.column}_${i}`] = { $arrayElemAt: ['$_vqbTmp', i - 1] };
  }
  return [
    { $addFields: { _vqbTmp: { $split: [$$(step.column), step.delimiter] } } },
    { $addFields: addFieldsStep },
    { $project: { _vqbTmp: 0 } },
  ];
}

/** transform a 'statistics' step into corresponding mongo steps */
function transformStatistics(step: Readonly<S.StatisticsStep>): MongoStep {
  /** Get n-th p-quantile.
   * Examples:
   * - the median is the first quantile of order 2.
   * - the last decile is the 9-th quantile of order 10.
   */
  const _getQuantile = (n: number, p: number): any => ({
    $avg: [
      {
        $arrayElemAt: [
          '$data',
          {
            $trunc: {
              $subtract: [{ $multiply: [{ $divide: ['$count', p] }, n] }, 1],
            },
          },
        ],
      },
      {
        $arrayElemAt: [
          '$data',
          {
            $trunc: { $multiply: [{ $divide: ['$count', p] }, n] },
          },
        ],
      },
    ],
  });

  const varianceFormula: any = { $subtract: ['$average_sum_square', { $pow: ['$average', 2] }] }; // I am using this formula of the variance: avg(x^2) - avg(x)^2
  const statisticsFormula: any = {
    count: 1,
    max: 1,
    min: 1,
    average: 1,
    variance: varianceFormula,
    'standard deviation': { $pow: [varianceFormula, 0.5] },
  };

  const doWeNeedTo: any = {
    computeColumnSquare: (step: Readonly<S.StatisticsStep>): boolean =>
      step.statistics.includes('variance') || step.statistics.includes('standard deviation'),
    computeAverage: (step: Readonly<S.StatisticsStep>): boolean =>
      step.statistics.includes('average') ||
      step.statistics.includes('variance') ||
      step.statistics.includes('standard deviation'),
    sort: (step: Readonly<S.StatisticsStep>): boolean => step.quantiles.length > 0,
    count: (step: Readonly<S.StatisticsStep>): boolean =>
      step.quantiles.length > 0 || step.statistics.includes('count'),
  };

  return [
    {
      $project: {
        ...Object.fromEntries(step.groupbyColumns.map(groupByColumn => [groupByColumn, 1])),
        column: $$(step.column),
        ...(doWeNeedTo.computeColumnSquare(step)
          ? { column_square: { $pow: [$$(step.column), 2] } }
          : {}),
      },
    },
    {
      $match: {
        column: { $ne: null },
      },
    },
    ...(doWeNeedTo.sort(step) ? [{ $sort: { column: 1 } }] : []),
    {
      $group: {
        _id:
          Object.fromEntries(
            step.groupbyColumns.map(groupByColumn => [groupByColumn, $$(groupByColumn)]),
          ) || null,
        data: { $push: '$column' },
        ...(doWeNeedTo.count(step) ? { count: { $sum: 1 } } : {}),
        ...(step.statistics.includes('max') ? { max: { $max: '$column' } } : {}),
        ...(step.statistics.includes('min') ? { min: { $min: '$column' } } : {}),
        ...(doWeNeedTo.computeColumnSquare(step)
          ? { average_sum_square: { $avg: '$column_square' } }
          : {}),
        ...(doWeNeedTo.computeAverage(step) ? { average: { $avg: '$column' } } : {}),
      },
    },
    {
      $project: {
        // groupByColumn
        ...Object.fromEntries(
          step.groupbyColumns.map(groupByColumn => [groupByColumn, `$_id.${groupByColumn}`]),
        ),
        // statistics
        ...Object.fromEntries(
          step.statistics.map(statistic => [statistic, statisticsFormula[statistic]]),
        ),
        // quantiles
        ...Object.fromEntries(
          step.quantiles.map(({ label, order, nth }) => [
            label || `${nth}-th ${order}-quantile`,
            _getQuantile(nth, order),
          ]),
        ),
      },
    },
  ];
}

function $add(...args: any[]) {
  return {
    $add: args,
  };
}

/** transform a 'substring' step into corresponding mongo steps */
function transformSubstring(step: Readonly<S.SubstringStep>): MongoStep {
  const posStartIndex: number | PropMap<any> =
    step.start_index > 0
      ? step.start_index - 1
      : $add({ $strLenCP: $$(step.column) }, step.start_index);

  const posEndIndex: number | PropMap<any> =
    step.end_index > 0 ? step.end_index - 1 : $add({ $strLenCP: $$(step.column) }, step.end_index);

  const lengthToKeep = {
    $add: [
      {
        $subtract: [posEndIndex, posStartIndex],
      },
      1,
    ],
  };

  const substrMongo = { $substrCP: [$$(step.column), posStartIndex, lengthToKeep] };

  return { $addFields: { [step.newColumnName ?? `${step.column}_SUBSTR`]: substrMongo } };
}

/** transform an 'top' step into corresponding mongo steps */
function transformTop(step: Readonly<S.TopStep>): MongoStep[] {
  const sortOrder = step.sort === 'asc' ? 1 : -1;
  const groupCols = step.groups ? columnMap(step.groups) : null;

  return [
    { $sort: { [step.rank_on]: sortOrder } },
    { $group: { _id: groupCols, _vqbAppArray: { $push: '$$ROOT' } } },
    { $project: { _vqbAppTopElems: { $slice: ['$_vqbAppArray', step.limit] } } },
    { $unwind: '$_vqbAppTopElems' },
    { $replaceRoot: { newRoot: '$_vqbAppTopElems' } },
  ];
}

/** transform an 'uniquegroups' step into corresponding mongo steps */
function transformUniqueGroups(step: Readonly<S.UniqueGroupsStep>): MongoStep[] {
  const id = columnMap(step.on);
  const project = Object.fromEntries(Object.keys(id).map(col => [col, `$_id.${col}`]));
  return [{ $group: { _id: id } }, { $project: project }];
}

/** transform an 'unpivot' step into corresponding mongo steps */
function transformUnpivot(step: Readonly<S.UnpivotStep>): MongoStep[] {
  // projectCols to be included in Mongo $project steps
  const projectCols: PropMap<string> = _.fromPairs(step.keep.map(col => [col, `$${col}`]));
  // objectToArray to be included in the first Mongo $project step
  const objectToArray: PropMap<object> = _.fromPairs(
    step.unpivot.map(col => [col, { $ifNull: [$$(col), null] }]),
  );
  const mongoPipeline: MongoStep[] = [
    {
      $project: { ...projectCols, _vqbToUnpivot: { $objectToArray: objectToArray } },
    },
    {
      $unwind: '$_vqbToUnpivot',
    },
    {
      $project: {
        ...projectCols,
        [step.unpivot_column_name]: '$_vqbToUnpivot.k',
        [step.value_column_name]: '$_vqbToUnpivot.v',
      },
    },
  ];

  if (step.dropna) {
    mongoPipeline.push({ $match: { [step.value_column_name]: { $ne: null } } });
  }

  return mongoPipeline;
}

/** transform a 'waterfall' step into corresponding mongo steps */
function transformWaterfall(step: Readonly<S.WaterfallStep>): MongoStep[] {
  let concatMongo = {};
  let facet = {};
  const groupby = step.groupby ?? [];
  const parents = step.parentsColumn !== undefined ? [step.parentsColumn] : [];

  // Pipeline that will be executed to get the array of results for the starting
  // and ending milestone of the waterfall
  const facetStartEnd = [
    {
      $group: {
        _id: columnMap([...groupby, step.milestonesColumn]),
        [step.valueColumn]: { $sum: $$(step.valueColumn) },
      },
    },
    {
      $project: {
        ...Object.fromEntries(groupby.map(col => [col, `$_id.${col}`])),
        LABEL_waterfall: `$_id.${step.milestonesColumn}`,
        GROUP_waterfall:
          step.parentsColumn !== undefined ? `$_id.${step.milestonesColumn}` : undefined,
        TYPE_waterfall: null,
        [step.valueColumn]: 1,
        _vqbOrder: { $cond: [{ $eq: [`$_id.${step.milestonesColumn}`, step.start] }, -1, 1] },
      },
    },
  ];

  // Pipeline that will be executed to get the array of results for the children
  // elements of the waterfall
  const facetChildren = [
    {
      $group: {
        _id: columnMap([...groupby, ...parents, step.labelsColumn, step.milestonesColumn]),
        [step.valueColumn]: { $sum: $$(step.valueColumn) },
      },
    },
    {
      $addFields: {
        _vqbOrder: { $cond: [{ $eq: [`$_id.${step.milestonesColumn}`, step.start] }, 1, 2] },
      },
    },
    { $sort: { _vqbOrder: 1 } },
    {
      $group: {
        _id: {
          ...Object.fromEntries(
            [...groupby, ...parents, step.labelsColumn].map(col => [col, `$_id.${col}`]),
          ),
        },
        _vqbValuesArray: { $push: $$(step.valueColumn) },
      },
    },
    {
      $project: {
        ...Object.fromEntries(groupby.map(col => [col, `$_id.${col}`])),
        LABEL_waterfall: `$_id.${step.labelsColumn}`,
        GROUP_waterfall:
          step.parentsColumn !== undefined ? `$_id.${step.parentsColumn}` : undefined,
        TYPE_waterfall: step.parentsColumn !== undefined ? 'child' : 'parent',
        [step.valueColumn]: {
          $reduce: {
            input: '$_vqbValuesArray',
            initialValue: 0,
            in: { $subtract: ['$$this', '$$value'] },
          },
        },
        _vqbOrder: { $literal: 0 },
      },
    },
  ];

  // If parentsColumn is define, we set the pipeline that will be executed to
  // get the array of results for the parents elements of the waterfall. In such
  // a case we add it to the concatenation of all the pipelines results arrays
  if (step.parentsColumn) {
    const facetParents = [
      {
        $group: {
          _id: columnMap([...groupby, ...parents, step.milestonesColumn]),
          [step.valueColumn]: { $sum: $$(step.valueColumn) },
        },
      },
      {
        $addFields: {
          _vqbOrder: { $cond: [{ $eq: [`$_id.${step.milestonesColumn}`, step.start] }, 1, 2] },
        },
      },
      { $sort: { _vqbOrder: 1 } },
      {
        $group: {
          _id: { ...Object.fromEntries([...groupby, ...parents].map(col => [col, `$_id.${col}`])) },
          _vqbValuesArray: { $push: $$(step.valueColumn) },
        },
      },
      {
        $project: {
          ...Object.fromEntries(groupby.map(col => [col, `$_id.${col}`])),
          LABEL_waterfall: `$_id.${step.parentsColumn}`,
          GROUP_waterfall: `$_id.${step.parentsColumn}`,
          TYPE_waterfall: 'parent',
          [step.valueColumn]: {
            $reduce: {
              input: '$_vqbValuesArray',
              initialValue: 0,
              in: { $subtract: ['$$this', '$$value'] },
            },
          },
          _vqbOrder: { $literal: 0 },
        },
      },
    ];

    facet = {
      _vqb_start_end: facetStartEnd,
      _vqb_parents: facetParents,
      _vqb_children: facetChildren,
    };
    concatMongo = { $concatArrays: ['$_vqb_start_end', '$_vqb_parents', '$_vqb_children'] };
  } else {
    facet = { _vqb_start_end: facetStartEnd, _vqb_children: facetChildren };
    concatMongo = { $concatArrays: ['$_vqb_start_end', '$_vqb_children'] };
  }

  return [
    { $match: { [step.milestonesColumn]: { $in: [step.start, step.end] } } },
    { $facet: facet },
    { $project: { _vqbFullArray: concatMongo } },
    { $unwind: '$_vqbFullArray' },
    { $replaceRoot: { newRoot: '$_vqbFullArray' } },
    {
      $sort: {
        _vqbOrder: 1,
        [step.sortBy === 'label' ? 'LABEL_waterfall' : step.valueColumn]:
          step.order === 'asc' ? 1 : -1,
      },
    },
    { $project: { _vqbOrder: 0 } },
  ];
}

const mapper: Partial<StepMatcher<MongoStep>> = {
  aggregate: transformAggregate,
  argmax: transformArgmaxArgmin,
  argmin: transformArgmaxArgmin,
  concatenate: transformConcatenate,
  cumsum: transformCumSum,
  custom: (step: Readonly<S.CustomStep>) => JSON.parse(step.query),
  dateextract: (step: Readonly<S.DateExtractPropertyStep>) => ({
    $addFields: {
      [`${step.new_column_name ?? step.column + '_' + step.operation}`]: {
        [`${DATE_EXTRACT_MAP[step.operation]}`]: `$${step.column}`,
      },
    },
  }),
  delete: (step: Readonly<S.DeleteStep>) => ({
    $project: _.fromPairs(step.columns.map(col => [col, 0])),
  }),
  domain: (step: Readonly<S.DomainStep>) => ({ $match: { domain: step.domain } }),
  duplicate: (step: Readonly<S.DuplicateColumnStep>) => ({
    $addFields: { [step.new_column_name]: $$(step.column) },
  }),
  evolution: transformEvolution,
  fillna: (step: Readonly<S.FillnaStep>) => ({
    $addFields: {
      [step.column]: {
        $ifNull: [$$(step.column), step.value],
      },
    },
  }),
  filter: transformFilterStep,
  formula: (step: Readonly<S.FormulaStep>) => {
    return {
      $addFields: {
        [step.new_column]: buildMongoFormulaTree(buildFormulaTree(step.formula)),
      },
    };
  },
  fromdate: transformFromDate,
  ifthenelse: (step: Readonly<S.IfThenElseStep>) => ({
    $addFields: { [step.newColumn]: transformIfThenElseStep(_.omit(step, ['name', 'newColumn'])) },
  }),
  lowercase: (step: Readonly<S.ToLowerStep>) => ({
    $addFields: { [step.column]: { $toLower: $$(step.column) } },
  }),
  percentage: transformPercentage,
  pivot: transformPivot,
  rank: transformRank,
  rename: transformRename,
  replace: transformReplace,
  rollup: transformRollup,
  select: (step: Readonly<S.SelectStep>) => ({
    $project: _.fromPairs(step.columns.map(col => [col, 1])),
  }),
  split: transformSplit,
  sort: transformSort,
  statistics: transformStatistics,
  substring: transformSubstring,
  text: step => ({ $addFields: { [step.new_column]: step.text } }),
  todate: (step: Readonly<S.ToDateStep>) => ({
    $addFields: { [step.column]: { $dateFromString: { dateString: $$(step.column) } } },
  }),
  top: transformTop,
  uniquegroups: transformUniqueGroups,
  unpivot: transformUnpivot,
  uppercase: (step: Readonly<S.ToUpperStep>) => ({
    $addFields: { [step.column]: { $toUpper: $$(step.column) } },
  }),
  waterfall: transformWaterfall,
};

export class Mongo36Translator extends BaseTranslator {
  static label = 'Mongo 3.6';

  domainToCollection(domain: string) {
    return domain;
  }

  constructor() {
    super();
  }

  setDomainToCollection(domainToCollectionFunc: (domain: string) => string) {
    this.domainToCollection = domainToCollectionFunc;
  }

  translate(pipeline: S.Pipeline) {
    const mongoSteps = super
      .translate(pipeline)
      .reduce((acc: OutputStep[], val) => acc.concat(val), []) as MongoStep[];
    if (mongoSteps.length) {
      return _simplifyMongoPipeline([...mongoSteps, { $project: { _id: 0 } }]);
    }
    return _simplifyMongoPipeline(mongoSteps);
  }

  /** transform an 'append' step into corresponding mongo steps */
  append(step: Readonly<S.AppendStep>): MongoStep[] {
    const pipelines = step.pipelines as S.Pipeline[];
    const pipelinesNames: string[] = ['$_vqbPipelineInline'];
    const lookups: MongoStep[] = [];
    for (let i = 0; i < pipelines.length; i++) {
      const domainStep = pipelines[i][0] as S.DomainStep;
      const pipelineWithoutDomain = pipelines[i].slice(1);
      lookups.push({
        $lookup: {
          from: this.domainToCollection(domainStep.domain),
          pipeline: this.translate(pipelineWithoutDomain),
          as: `_vqbPipelineToAppend_${i}`,
        },
      });
      pipelinesNames.push(`$_vqbPipelineToAppend_${i}`);
    }
    return [
      { $group: { _id: null, _vqbPipelineInline: { $push: '$$ROOT' } } },
      ...lookups,
      { $project: { _vqbPipelinesUnion: { $concatArrays: pipelinesNames } } },
      { $unwind: '$_vqbPipelinesUnion' },
      { $replaceRoot: { newRoot: '$_vqbPipelinesUnion' } },
    ];
  }

  /** transform a 'join' step into corresponding mongo steps */
  join(step: Readonly<S.JoinStep>): MongoStep[] {
    const mongoPipeline: MongoStep[] = [];
    const right = step.right_pipeline as S.Pipeline;
    const rightDomain = right[0] as S.DomainStep;
    const rightWithoutDomain = right.slice(1);
    const mongoLet: { [k: string]: string } = {};
    const mongoExprAnd: { [k: string]: object }[] = [];
    for (const [leftOn, rightOn] of step.on) {
      mongoLet[columnToUserVariable(leftOn)] = $$(leftOn);
      mongoExprAnd.push({
        $eq: [$$(rightOn), $$($$(columnToUserVariable(leftOn)))],
      });
    }
    mongoPipeline.push({
      $lookup: {
        from: this.domainToCollection(rightDomain.domain),
        let: mongoLet,
        pipeline: [
          ...this.translate(rightWithoutDomain),
          { $match: { $expr: { $and: mongoExprAnd } } },
        ],
        as: '_vqbJoinKey',
      },
    });
    if (step.type === 'inner') {
      mongoPipeline.push({ $unwind: '$_vqbJoinKey' });
    } else if (step.type === 'left') {
      mongoPipeline.push({ $unwind: { path: '$_vqbJoinKey', preserveNullAndEmptyArrays: true } });
    } else {
      mongoPipeline.push(
        { $match: { _vqbJoinKey: { $eq: [] } } },
        { $unwind: { path: '$_vqbJoinKey', preserveNullAndEmptyArrays: true } },
      );
    }
    mongoPipeline.push(
      {
        $replaceRoot: { newRoot: { $mergeObjects: ['$_vqbJoinKey', '$$ROOT'] } },
      },
      {
        $project: { _vqbJoinKey: 0 },
      },
    );
    return mongoPipeline;
  }

  validate(customEditedStep: S.CustomStep): ValidationError[] | null {
    try {
      JSON.parse(customEditedStep.query);
      return null;
    } catch (e) {
      return [
        {
          keyword: 'json',
          dataPath: '.query',
          message: e.message,
        },
      ];
    }
  }
}

Object.assign(Mongo36Translator.prototype, mapper);
