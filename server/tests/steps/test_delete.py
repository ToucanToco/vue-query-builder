from pandas import DataFrame

from weaverbird.backends.pandas_executor.steps.delete import execute_delete
from weaverbird.pipeline.steps import DeleteStep


def test_benchmark_delete(benchmark):
    big_df = DataFrame({'value': list(range(1000))})
    step = DeleteStep(
        name='delete',
        columns=['value'],
    )
    benchmark(execute_delete, step, big_df)
