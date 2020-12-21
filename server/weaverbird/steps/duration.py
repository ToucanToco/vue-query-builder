from pandas import DataFrame
from pydantic import Field

from weaverbird.steps import BaseStep
from weaverbird.types import ColumnName, DomainRetriever, PipelineExecutor

_SECOND = 1
_MINUTE = _SECOND * 60
_HOUR = _MINUTE * 60
_DAY = _HOUR * 24

durations_in_second = {'seconds': _SECOND, 'minutes': _MINUTE, 'hours': _HOUR, 'days': _DAY}


class DurationStep(BaseStep):
    name: str = Field('duration', const=True)
    new_column_name: ColumnName = Field(alias='newColumnName')
    start_date_column: ColumnName = Field(alias='startDateColumn')
    end_date_column: ColumnName = Field(alias='endDateColumn')
    duration_in: ColumnName = Field(alias='durationIn')

    def execute(
        self,
        df: DataFrame,
        domain_retriever: DomainRetriever = None,
        pipeline_executor: PipelineExecutor = None,
    ) -> DataFrame:
        assert self.duration_in in durations_in_second

        duration_serie_in_seconds = (df[self.end_date_column] - df[self.start_date_column]).astype(
            'timedelta64[s]'
        )
        duration_serie_in_given_unit = (
            duration_serie_in_seconds / durations_in_second[self.duration_in]
        )
        return df.assign(**{self.new_column_name: duration_serie_in_given_unit})
