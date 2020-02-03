<template>
  <div>
    <step-form-header :cancel="cancelEdition" :title="title" :stepName="this.editedStep.name" />
    <ColumnPicker
      id="column"
      v-model="editedStep.column"
      name="Column to work on:"
      :options="columnNames"
      placeholder="Pick a column"
      data-path=".column"
      :errors="errors"
    />
    <AutocompleteWidget
      name="Property to extract"
      id="operation"
      :options="operations"
      :value="currentOperation"
      @input="updateCurrentOperation"
      placeholder="Extract operations"
      :trackBy="`operation`"
      :label="`label`"
      data-path=".operation"
      :errors="errors"
    />
    <InputTextWidget
      id="newColumnName"
      v-model="editedStep.new_column_name"
      name="New column name:"
      :placeholder="newColumnNamePlaceholder"
      data-path=".new_column_name"
      :errors="errors"
    />
    <step-form-buttonbar :cancel="cancelEdition" :submit="submit" />
  </div>
</template>

<script lang="ts">
import { Prop } from 'vue-property-decorator';

import { StepFormComponent } from '@/components/formlib';
import ColumnPicker from '@/components/stepforms/ColumnPicker.vue';
import AutocompleteWidget from '@/components/stepforms/widgets/Autocomplete.vue';
import InputTextWidget from '@/components/stepforms/widgets/InputText.vue';
import { DateExtractPropertyStep } from '@/lib/steps';

import BaseStepForm from './StepForm.vue';

type OperationOption = {
  operation: DateExtractPropertyStep['operation'];
  label: string;
};

@StepFormComponent({
  vqbstep: 'dateextract',
  name: 'dateextract-step-form',
  components: {
    AutocompleteWidget,
    ColumnPicker,
    InputTextWidget,
  },
})
export default class DateExtractStepForm extends BaseStepForm<DateExtractPropertyStep> {
  @Prop({ type: Object, default: () => ({ name: 'dateextract', column: '' }) })
  initialStepValue!: DateExtractPropertyStep;

  readonly title: string = 'Convert Column From Text to Date';

  readonly operations: OperationOption[] = [
    { operation: 'year', label: 'year' },
    { operation: 'month', label: 'month' },
    { operation: 'day', label: 'day of month' },
    { operation: 'hour', label: 'hour' },
    { operation: 'minutes', label: 'minutes' },
    { operation: 'seconds', label: 'seconds' },
    { operation: 'milliseconds', label: 'milliseconds' },
    { operation: 'dayOfYear', label: 'day of year' },
    { operation: 'dayOfWeek', label: 'day of week' },
    { operation: 'week', label: 'week number' },
  ];

  get newColumnNamePlaceholder() {
    const currentColname = this.editedStep.column ?? '<date-column-name>';
    return `Enter a column name (default is ${currentColname}_${this.editedStep.operation})`;
  }

  get currentOperation(): OperationOption | null {
    if (this.editedStep.operation) {
      return this.operations.filter(d => d.operation === this.editedStep.operation)[0];
    }
    return null;
  }

  updateCurrentOperation(op: OperationOption) {
    this.editedStep.operation = op.operation;
  }

  get stepSelectedColumn() {
    return this.editedStep.column;
  }

  set stepSelectedColumn(colname: string | null) {
    if (colname === null) {
      throw new Error('should not try to set null on "column" field');
    }
    this.editedStep.column = colname;
  }
}
</script>