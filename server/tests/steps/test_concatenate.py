from pandas import DataFrame

from tests.utils import assert_dataframes_equals
from weaverbird.backends.pandas_executor.steps.concatenate import execute_concatenate
from weaverbird.pipeline.steps import ConcatenateStep


def test_concatenate():
    sample_df = DataFrame({'NAME': ['foo', 'bar'], 'AGE': [42, 43], 'SCORE': [100, 200]})

    step = ConcatenateStep(
        name='concatenate',
        columns=['NAME', 'AGE', 'SCORE'],
        separator=' - ',
        new_column_name='newcol',
    )

    df_result = execute_concatenate(step, sample_df)

    expected_result = DataFrame(
        {
            'NAME': ['foo', 'bar'],
            'AGE': [42, 43],
            'SCORE': [100, 200],
            'newcol': ['foo - 42 - 100', 'bar - 43 - 200'],
        }
    )
    assert_dataframes_equals(df_result, expected_result)


def test_benchmark_concatenate(benchmark):
    big_df = DataFrame(
        {
            'value': list(range(1000)),
            'value2': list(range(1000)),
        }
    )

    step = ConcatenateStep(
        name='concatenate',
        columns=['value', 'value2'],
        separator=' - ',
        new_column_name='newcol',
    )

    benchmark(execute_concatenate, step, big_df)
