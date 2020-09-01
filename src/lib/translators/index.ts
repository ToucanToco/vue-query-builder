/**
 * Translation toolchain utilities.
 *
 * The main exported function is `getTranslator` that takes a
 * backend name as input and returns the corresponding translator.
 *
 */
import { PipelineStepName } from '@/lib/steps';

import { BaseTranslator } from './base';
import { JavaScriptTranslator } from './js';
import { Mongo36Translator } from './mongo';
import { Mongo40Translator } from './mongo4';

const TRANSLATORS: { [backend: string]: typeof BaseTranslator } = {};

export function registerTranslator(backend: string, translatorClass: typeof BaseTranslator) {
  TRANSLATORS[backend] = translatorClass;
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
  return new TRANSLATORS[backend]();
}

/**
 * returns the list of backends supporting a given pipeline step.
 *
 * @param stepname the name of the step
 */
export function backendsSupporting(stepname: PipelineStepName) {
  return Object.entries(TRANSLATORS)
    .filter(([_, translator]) => new translator().supports(stepname))
    .map(([backend, _]) => backend)
    .sort();
}

/**
 * returns and object mapping each available backend to its corresponding translator.
 */
export function availableTranslators() {
  return { ...TRANSLATORS };
}

registerTranslator('js', JavaScriptTranslator);
registerTranslator('mongo36', Mongo36Translator);
registerTranslator('mongo40', Mongo40Translator);
