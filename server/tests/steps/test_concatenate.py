import pytest
from pandas import DataFrame

from tests.utils import assert_dataframes_equals
from weaverbird.steps import ConcatenateStep


@pytest.fixture
def sample_df():
    return DataFrame({'NAME': ['foo', 'bar'], 'AGE': [42, 43], 'SCORE': [100, 200]})


def test_rename(sample_df: DataFrame):
    df_result = ConcatenateStep(
        name='concatenate',
        columns=['NAME', 'AGE', 'SCORE'],
        separator=' - ',
        new_column_name='newcol',
    ).execute(sample_df)

    expected_result = DataFrame(
        {
            'NAME': ['foo', 'bar'],
            'AGE': [42, 43],
            'SCORE': [100, 200],
            'newcol': ['foo - 42 - 100', 'bar - 43 - 200'],
        }
    )
    assert_dataframes_equals(df_result, expected_result)
