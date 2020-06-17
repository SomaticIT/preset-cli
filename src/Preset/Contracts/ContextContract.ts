import { GeneratorContract } from './GeneratorContract';

export interface ContextContract {
  /**
   * Name of the preset
   */
  presetName: string;

  /**
   * A complete path to the template directory.
   */
  presetTemplates: string;

  /**
   * A complete path to the preset directory.
   */
  presetDirectory: string;

  /**
   * A complete path to the root target directory.
   */
  targetDirectory: string;

  /**
   * A complete path to the preset file.
   */
  presetFile: string;

  /**
   * The generator object.
   */
  generator: GeneratorContract;

  /**
   * Additional command line arguments.
   */
  args: string[];

  /**
   * True if the current preset directory is temporary.
   */
  temporary: boolean;
}