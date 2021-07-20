from pandas import DataFrame

from weaverbird.backends.pandas_executor.steps.duplicate import execute_duplicate
from weaverbird.pipeline.steps import DuplicateStep


def test_benchmark_duplicate(benchmark):
    big_df = DataFrame({'value': list(range(1000))})
    step = DuplicateStep(name='duplicate', column='value', new_column_name='y')
    benchmark(execute_duplicate, step, big_df)
