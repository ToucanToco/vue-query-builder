from typing import Any

import numpy as np
import pandas as pd

from weaverbird.backends.pandas_executor.steps.append import execute_append
from weaverbird.pipeline.steps import AppendStep


def test_benchmark_append(benchmark):
    df_left = pd.DataFrame({'values': np.random.random(1000)})
    df_right = pd.DataFrame({'values': np.random.random(1000)})

    step = AppendStep(name='append', pipelines=['other'])

    df_result = benchmark(
        execute_append,
        step,
        df_left,
        domain_retriever=lambda _p: df_right,
        execute_pipeline=lambda _p, _dr: (df_right, Any),
    )
    assert len(df_result) == 2000
