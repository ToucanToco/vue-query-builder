from typing import List

from pandas import DataFrame
from pydantic import Field

from weaverbird.steps.base import BaseStep


class ArgminStep(BaseStep):
    name = Field('argmin', const=True)
    column: str
    groups: List[str] = []

    def execute(self, df: DataFrame, domain_retriever=None, pipeline_executor=None) -> DataFrame:
        if len(self.groups) == 0:
            return df.assign(**{self.column: df[self.column].min()})
        else:
            grouped_by_df = df.groupby(self.groups, as_index=False)
            return df.assign(**{self.column: grouped_by_df[self.column].transform('min')})