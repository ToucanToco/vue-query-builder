import numpy as np
import pytest
from pandas import DataFrame

from weaverbird.backends.pandas_executor.steps import execute_aggregate
from weaverbird.exceptions import DuplicateColumnError
from weaverbird.pipeline.steps import AggregateStep
from weaverbird.pipeline.steps.aggregate import Aggregation


def test_benchmark_aggregate(benchmark):
    sample_df = DataFrame(
        {
            'Group': ['Group 1'] * 500 + ['Group 2'] * 500,
            'Value1': np.random.random(1000),
            'Value2': np.random.random(1000),
        }
    )
    step = AggregateStep(
        name='aggregate',
        on=['Group'],
        aggregations=[
            Aggregation(
                aggfunction='avg',
                columns=['Value1'],
                newcolumns=['RESULT'],
            ),
        ],
    )
    benchmark(execute_aggregate, step, sample_df)


def test_duplicate_aggregation_columns():
    df = DataFrame(
        {
            'Label': ['Label 1', 'Label 2', 'Label 3'],
            'Group': ['Group 1'] * 3,  # type: ignore
            'Value1': [13, 7, 20],
        }
    )
    with pytest.raises(DuplicateColumnError):
        step = AggregateStep(
            name='aggregate',
            on=['Group'],
            aggregations=[
                Aggregation(
                    aggfunction='count distinct including empty',
                    columns=['Group', 'Group'],
                    newcolumns=['__VQB_COUNT'],
                ),
            ],
        )
        execute_aggregate(step, df)
