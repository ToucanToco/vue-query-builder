import datetime
from datetime import timedelta

import pandas
import pytest
from pandas import DataFrame, Timestamp

from tests.utils import assert_dataframes_equals
from weaverbird.backends.pandas_executor.steps.convert import execute_convert
from weaverbird.pipeline.steps import ConvertStep


@pytest.fixture
def sample_df() -> DataFrame:
    return DataFrame({'value': [41, '42', 43.5, '43.6', None, 'meh']})


def test_convert_to_float(sample_df: DataFrame):
    step = ConvertStep(name='convert', columns=['value'], data_type='float')
    df_result = execute_convert(step, sample_df)

    expected_result = DataFrame({'value': [41.0, 42.0, 43.5, 43.6, None, None]})
    assert_dataframes_equals(df_result, expected_result)


def test_convert_to_integer(sample_df: DataFrame):
    step = ConvertStep(name='convert', columns=['value'], data_type='integer')
    df_result = execute_convert(step, sample_df)

    expected_result = DataFrame({'value': [41, 42, 43, 43, None, None]})
    assert_dataframes_equals(df_result, expected_result)


def test_convert_to_text(sample_df: DataFrame):
    step = ConvertStep(name='convert', columns=['value'], data_type='text')
    df_result = execute_convert(step, sample_df)

    expected_result = DataFrame({'value': ['41', '42', '43.5', '43.6', 'None', 'meh']})
    assert_dataframes_equals(df_result, expected_result)


def test_convert_to_datetime():
    input_df = DataFrame(
        {
            'value': [
                '2020',
                '2020-11-02',
                '11/02/2020',
                '2020-11-02T15:30',
                1604331000000000000,
                'meh',
            ]
        }
    )
    step = ConvertStep(name='convert', columns=['value'], data_type='date')
    df_result = execute_convert(step, input_df)

    expected_result = DataFrame(
        {
            'value': [
                Timestamp(year=2020, month=1, day=1),
                Timestamp(year=2020, month=11, day=2),
                Timestamp(year=2020, month=11, day=2),
                Timestamp(year=2020, month=11, day=2, hour=15, minute=30),
                Timestamp(year=2020, month=11, day=2, hour=15, minute=30),
                None,
            ]
        }
    )
    assert_dataframes_equals(df_result, expected_result)


def test_convert_to_bool():
    input_df = DataFrame({'value': ['plop', 0, 0.0, 1, '', None]})
    step = ConvertStep(name='convert', columns=['value'], data_type='boolean')
    df_result = execute_convert(step, input_df)

    expected_result = DataFrame({'value': [True, False, False, True, False, False]})
    assert_dataframes_equals(df_result, expected_result)


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
