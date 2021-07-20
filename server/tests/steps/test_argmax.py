import numpy as np
from pandas import DataFrame

from weaverbird.backends.pandas_executor.steps.argmax import execute_argmax
from weaverbird.pipeline.steps.argmax import ArgmaxStep


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
