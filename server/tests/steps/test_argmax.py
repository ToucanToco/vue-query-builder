import numpy as np
import pytest
from pandas import DataFrame

from tests.utils import assert_dataframes_equals
from weaverbird.backends.pandas_executor.steps.argmax import execute_argmax
from weaverbird.pipeline.steps.argmax import ArgmaxStep


@pytest.fixture
def sample_df():
    return DataFrame(
        {
            'label': ['label1', 'label2', 'label3', 'label4', 'label5', 'label6'],
            'group': ['group 1', 'group 1', 'group 1', 'group 2', 'group 2', 'group 2'],
            'value': [13, 7, 20, 1, 10, 5],
        }
    )


def test_simple_argmax(sample_df):
    step = ArgmaxStep(name='argmax', column='value')
    result = execute_argmax(step, sample_df, domain_retriever=None)
    assert_dataframes_equals(
        result,
        DataFrame(
            {
                'label': ['label3'],
                'group': ['group 1'],
                'value': [20],
            }
        ),
    )


def test_argmax_with_group(sample_df):
    step = ArgmaxStep(name='argmax', column='value', groups=['group'])
    result = execute_argmax(step, sample_df, domain_retriever=None)
    assert_dataframes_equals(
        result,
        DataFrame(
            {
                'label': ['label3', 'label5'],
                'group': ['group 1', 'group 2'],
                'value': [20, 10],
            }
        ),
    )


def test_benchmark_argmax(benchmark):
    sample_df = DataFrame(
        {
            'Group': ['Group 1'] * 500 + ['Group 2'] * 500,
            'Value1': np.random.random(1000),
            'Value2': np.random.random(1000),
        }
    )
    step = ArgmaxStep(name='argmax', column='Value1', groups=['Group'])

    benchmark(execute_argmax, step, sample_df)
