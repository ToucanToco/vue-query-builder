import datetime
from datetime import timedelta

import pandas

from weaverbird.backends.pandas_executor.steps.convert import execute_convert
from weaverbird.pipeline.steps import ConvertStep


def test_benchmark_convert(benchmark):
    dates = [
        str(datetime.datetime.today() + timedelta(days=nb_day)) for nb_day in list(range(1, 2001))
    ]
    df = pandas.DataFrame(
        {
            'date': dates,
        }
    )
    step = ConvertStep(name='convert', columns=['date'], data_type='date')

    benchmark(execute_convert, step, df)
