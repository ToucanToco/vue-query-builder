from pandas import DataFrame

from weaverbird.backends.pandas_executor.steps.cumsum import execute_cumsum
from weaverbird.pipeline.steps import CumSumStep


def test_benchmark_cumsum(benchmark):
    big_df = DataFrame({'value': list(range(1000))})
    step = CumSumStep(
        name='cumsum',
        referenceColumn='value',
        valueColumn='value',
        newColumn='my_cumsum',
    )
    benchmark(execute_cumsum, step, big_df)
