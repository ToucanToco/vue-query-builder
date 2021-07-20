import numpy as np
from pandas import DataFrame

from weaverbird.backends.pandas_executor.steps.argmin import execute_argmin
from weaverbird.pipeline.steps.argmin import ArgminStep


def test_benchmark_argmin(benchmark):
    sample_df = DataFrame(
        {
            'Group': ['Group 1'] * 500 + ['Group 2'] * 500,
            'Value1': np.random.random(1000),
            'Value2': np.random.random(1000),
        }
    )
    step = ArgminStep(name='argmin', column='Value1', groups=['Group'])

    benchmark(execute_argmin, step, sample_df)
