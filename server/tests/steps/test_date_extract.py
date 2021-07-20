import datetime

import pytest
from pandas import DataFrame, to_datetime
from pandas.core.arrays.integer import UInt32Dtype

from tests.utils import assert_dataframes_equals
from weaverbird.backends.pandas_executor.steps.date_extract import execute_date_extract
from weaverbird.pipeline.steps import DateExtractStep


@pytest.fixture
def sample_df():
    return DataFrame(
        {
            'date': to_datetime(
                [
                    '2021-03-29T00:00:00.000Z',
                    '2020-12-13T00:00:00.000Z',
                    '2020-07-29T00:00:00.000Z',
                    '2019-04-09T01:02:03.004Z',
                    '2017-01-02T00:00:00.000Z',
                    '2016-01-01T00:00:00.000Z',
                    None,
                ]
            )
        }
    )


def test_date_extract_no_uint32(sample_df: DataFrame):
    step = DateExtractStep(
        name='dateextract',
        column='date',
        dateInfo=[
            'year',
            'month',
            'day',
            'week',
            'quarter',
            'dayOfWeek',
            'dayOfYear',
            'isoYear',
            'isoWeek',
            'isoDayOfWeek',
            'firstDayOfYear',
            'firstDayOfMonth',
            'firstDayOfWeek',
            'firstDayOfQuarter',
            'firstDayOfIsoWeek',
            'previousDay',
            'firstDayOfPreviousYear',
            'firstDayOfPreviousMonth',
            'firstDayOfPreviousWeek',
            'firstDayOfPreviousQuarter',
            'firstDayOfPreviousIsoWeek',
            'previousYear',
            'previousMonth',
            'previousWeek',
            'previousQuarter',
            'previousIsoWeek',
            'hour',
            'minutes',
            'seconds',
            'milliseconds',
        ],
        newColumns=[
            'date_year',
            'date_month',
            'date_day',
            'date_week',
            'date_quarter',
            'date_dayOfWeek',
            'date_dayOfYear',
            'date_isoYear',
            'date_isoWeek',
            'date_isoDayOfWeek',
            'date_firstDayOfYear',
            'date_firstDayOfMonth',
            'date_firstDayOfWeek',
            'date_firstDayOfQuarter',
            'date_firstDayOfIsoWeek',
            'date_previousDay',
            'date_firstDayOfPreviousYear',
            'date_firstDayOfPreviousMonth',
            'date_firstDayOfPreviousWeek',
            'date_firstDayOfPreviousQuarter',
            'date_firstDayOfPreviousIsoWeek',
            'date_previousYear',
            'date_previousMonth',
            'date_previousWeek',
            'date_previousQuarter',
            'date_previousIsoWeek',
            'date_hour',
            'date_minutes',
            'date_seconds',
            'date_milliseconds',
        ],
    )
    df_result = execute_date_extract(step, sample_df)
    expected_result = DataFrame(
        {
            'date': to_datetime(
                [
                    '2021-03-29T00:00:00.000Z',
                    '2020-12-13T00:00:00.000Z',
                    '2020-07-29T00:00:00.000Z',
                    '2019-04-09T01:02:03.004Z',
                    '2017-01-02T00:00:00.000Z',
                    '2016-01-01T00:00:00.000Z',
                    None,
                ]
            ),
            'date_year': [2021, 2020, 2020, 2019, 2017, 2016, None],
            'date_month': [3, 12, 7, 4, 1, 1, None],
            'date_day': [29, 13, 29, 9, 2, 1, None],
            'date_week': [13, 50, 30, 14, 1, 0, None],
            'date_quarter': [1, 4, 3, 2, 1, 1, None],
            'date_dayOfWeek': [2, 1, 4, 3, 2, 6, None],
            'date_dayOfYear': [88, 348, 211, 99, 2, 1, None],
            'date_isoYear': [2021, 2020, 2020, 2019, 2017, 2015, None],
            'date_isoWeek': [13, 50, 31, 15, 1, 53, None],
            'date_isoDayOfWeek': [1, 7, 3, 2, 1, 5, None],
            'date_firstDayOfYear': to_datetime(
                [
                    "2021-01-01T00:00:00.000Z",
                    "2020-01-01T00:00:00.000Z",
                    "2020-01-01T00:00:00.000Z",
                    "2019-01-01T00:00:00.000Z",
                    "2017-01-01T00:00:00.000Z",
                    "2016-01-01T00:00:00.000Z",
                    None,
                ]
            ),
            'date_firstDayOfMonth': to_datetime(
                [
                    "2021-03-01T00:00:00.000Z",
                    "2020-12-01T00:00:00.000Z",
                    "2020-07-01T00:00:00.000Z",
                    "2019-04-01T00:00:00.000Z",
                    "2017-01-01T00:00:00.000Z",
                    "2016-01-01T00:00:00.000Z",
                    None,
                ]
            ),
            'date_firstDayOfWeek': to_datetime(
                [
                    "2021-03-28T00:00:00.000Z",
                    "2020-12-13T00:00:00.000Z",
                    "2020-07-26T00:00:00.000Z",
                    "2019-04-07T00:00:00.000Z",
                    "2017-01-01T00:00:00.000Z",
                    "2015-12-27T00:00:00.000Z",
                    None,
                ]
            ),
            'date_firstDayOfQuarter': to_datetime(
                [
                    "2021-01-01T00:00:00.000Z",
                    "2020-10-01T00:00:00.000Z",
                    "2020-07-01T00:00:00.000Z",
                    "2019-04-01T00:00:00.000Z",
                    "2017-01-01T00:00:00.000Z",
                    "2016-01-01T00:00:00.000Z",
                    None,
                ]
            ),
            'date_firstDayOfIsoWeek': to_datetime(
                [
                    "2021-03-29T00:00:00.000Z",
                    "2020-12-07T00:00:00.000Z",
                    "2020-07-27T00:00:00.000Z",
                    "2019-04-08T00:00:00.000Z",
                    "2017-01-02T00:00:00.000Z",
                    "2015-12-28T00:00:00.000Z",
                    None,
                ]
            ),
            'date_previousDay': to_datetime(
                [
                    "2021-03-28T00:00:00.000Z",
                    "2020-12-12T00:00:00.000Z",
                    "2020-07-28T00:00:00.000Z",
                    "2019-04-08T00:00:00.000Z",
                    "2017-01-01T00:00:00.000Z",
                    "2015-12-31T00:00:00.000Z",
                    None,
                ]
            ),
            'date_firstDayOfPreviousYear': to_datetime(
                [
                    "2020-01-01T00:00:00.000Z",
                    "2019-01-01T00:00:00.000Z",
                    "2019-01-01T00:00:00.000Z",
                    "2018-01-01T00:00:00.000Z",
                    "2016-01-01T00:00:00.000Z",
                    "2015-01-01T00:00:00.000Z",
                    None,
                ]
            ),
            'date_firstDayOfPreviousMonth': to_datetime(
                [
                    "2021-02-01T00:00:00.000Z",
                    "2020-11-01T00:00:00.000Z",
                    "2020-06-01T00:00:00.000Z",
                    "2019-03-01T00:00:00.000Z",
                    "2016-12-01T00:00:00.000Z",
                    "2015-12-01T00:00:00.000Z",
                    None,
                ]
            ),
            'date_firstDayOfPreviousWeek': to_datetime(
                [
                    "2021-03-21T00:00:00.000Z",
                    "2020-12-06T00:00:00.000Z",
                    "2020-07-19T00:00:00.000Z",
                    "2019-03-31T00:00:00.000Z",
                    "2016-12-25T00:00:00.000Z",
                    "2015-12-20T00:00:00.000Z",
                    None,
                ]
            ),
            'date_firstDayOfPreviousQuarter': to_datetime(
                [
                    "2020-10-01T00:00:00.000Z",
                    "2020-07-01T00:00:00.000Z",
                    "2020-04-01T00:00:00.000Z",
                    "2019-01-01T00:00:00.000Z",
                    "2016-10-01T00:00:00.000Z",
                    "2015-10-01T00:00:00.000Z",
                    None,
                ]
            ),
            'date_firstDayOfPreviousIsoWeek': to_datetime(
                [
                    "2021-03-22T00:00:00.000Z",
                    "2020-11-30T00:00:00.000Z",
                    "2020-07-20T00:00:00.000Z",
                    "2019-04-01T00:00:00.000Z",
                    "2016-12-26T00:00:00.000Z",
                    "2015-12-21T00:00:00.000Z",
                    None,
                ]
            ),
            'date_previousYear': [2020, 2019, 2019, 2018, 2016, 2015, None],
            'date_previousMonth': [2, 11, 6, 3, 12, 12, None],
            'date_previousQuarter': [4, 3, 2, 1, 4, 4, None],
            'date_previousWeek': [12, 49, 29, 13, 52, 51, None],
            'date_previousIsoWeek': [12, 49, 30, 14, 52, 52, None],
            'date_hour': [0, 0, 0, 1, 0, 0, None],
            'date_minutes': [0, 0, 0, 2, 0, 0, None],
            'date_seconds': [0, 0, 0, 3, 0, 0, None],
            'date_milliseconds': [0, 0, 0, 4, 0, 0, None],
        }
    )
    assert_dataframes_equals(df_result, expected_result)

    # Ensure there are no unsigned int types in result:
    assert UInt32Dtype() not in list(df_result.dtypes)


def test_benchmark_dateextract(benchmark):
    dates = [
        datetime.datetime.today() + datetime.timedelta(days=nb_day)
        for nb_day in list(range(1, 2001))
    ]
    df = DataFrame(
        {
            'date': dates,
        }
    )
    step = DateExtractStep(
        name='dateextract', column='date', operation='day', new_column_name='date'
    )

    benchmark(execute_date_extract, step, df)
