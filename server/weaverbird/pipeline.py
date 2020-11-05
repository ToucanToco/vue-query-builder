from typing import List, Union

from pydantic import BaseModel

from weaverbird.steps import (
    AppendStep,
    ArgmaxStep,
    ArgminStep,
    ConcatenateStep,
    ConvertStep,
    CumSumStep,
    DateExtractStep,
    DomainStep,
    FilterStep,
    JoinStep,
    RenameStep,
    StatisticsStep,
)

PipelineStep = Union[
    AppendStep,
    ArgmaxStep,
    ArgminStep,
    ConcatenateStep,
    ConvertStep,
    CumSumStep,
    DateExtractStep,
    DomainStep,
    FilterStep,
    JoinStep,
    RenameStep,
    StatisticsStep,
]


class Pipeline(BaseModel):
    steps: List[PipelineStep]
