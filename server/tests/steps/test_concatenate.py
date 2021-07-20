from pandas import DataFrame

from weaverbird.backends.pandas_executor.steps.concatenate import execute_concatenate
from weaverbird.pipeline.steps import ConcatenateStep


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
