/**
 * Translation toolchain utilities.
 *
 * The main exported function is `getTranslator` that takes a
 * backend name as input and returns the corresponding translator.
 *
 */
import { PipelineStepName } from '@/lib/steps';
import { translators as mongoTranslators } from '@/lib/translators/mongo';
import { BaseTranslator } from './base';

// type TransformerFunc = (pipeline: Array<PipelineStep>) => any;
export type TranslatorRegistryType = { [backend: string]: BaseTranslator };

const TRANSLATORS: TranslatorRegistryType = {};

export function registerTranslator(backend: string, translator: BaseTranslator) {
  TRANSLATORS[backend] = translator;
}

/** return a function translating an array of pipeline steps to expected backend
 * steps
 *
 * Example usage:
 * ```typescript
 * const translator = getTranslator('mongo36');
 * const result = translator(myPipeline);
 * ```
 */
export function getTranslator(backend: string): BaseTranslator {
  if (TRANSLATORS[backend] === undefined) {
    throw new Error(
      `no translator found for backend ${backend}. Available ones are: ${Object.keys(
        TRANSLATORS,
      ).join(' | ')}`,
    );
  }
  return TRANSLATORS[backend];
}

/**
 * returns the list of backends supporting a given pipeline step.
 *
 * @param stepname the name of the step
 */
export function backendsSupporting(stepname: PipelineStepName) {
  return Object.entries(TRANSLATORS)
    .filter(([_, translator]) => translator.supports(stepname))
    .map(([backend, _]) => backend)
    .sort();
}

// register mongo translators
for (const [backend, translator] of Object.entries(mongoTranslators)) {
  registerTranslator(backend, translator);
}
