import { Log, Color, ContextContract, PresetPackage, Resolver, Validator } from '../';
import { Preset } from './Preset';
import path from 'path';
import ts from 'typescript';
import fs from 'fs';
import { CopyValidator } from 'Validator';

export class Parser {
  /**
   * Tries to find a preset of the given name.
   * @param name
   * @param debug
   * @param args
   */
  static async handle(name: string, debug: boolean, args: string[]): Promise<void> {
    Log.configure({ debug });

    // Resolves and parses the preset
    Log.debug(`Current working directory is ${Color.directory(process.cwd())}.`);
    const directory = await Resolver.resolve(name);
    const context = await this.parse(directory, ...args);

    // Preset has been found
    Log.debug(`Running preset ${Color.preset(context.presetName ?? name)}.`);

    // Run the preset
    await this.run(context);

    // Sends the end message
    Log.success(`Applied preset ${Color.preset(context.presetName)} on ${Color.directory(context.targetDirectory)}.`);
  }

  /**
   * Returns a preset context from the given directory.
   *
   * @param directory A preset directory.
   */
  private static async parse(directory: string, ...args: string[]): Promise<ContextContract> | never {
    Log.debug(`Parsing preset at ${Color.directory(directory)}.`);

    // Directory check
    if (!directory || !fs.existsSync(directory)) {
      return Log.exit(`${Color.directory(directory)} is not a preset directory.`);
    }

    const packagePath = path.join(directory, 'package.json');

    // package.json check
    if (!fs.existsSync(packagePath)) {
      return Log.exit(`${Color.directory(directory)} does not have a ${Color.file('package.json')}.`);
    }

    const presetPackage = require(packagePath) as PresetPackage;
    const presetAbsolutePath = path.join(directory, presetPackage.preset ?? 'preset.js');

    // Preset file check
    if (!fs.existsSync(presetAbsolutePath)) {
      return Log.exit(`Preset file ${Color.file(presetAbsolutePath)} does not exist.`);
    }

    // Instead of requiring or importing, we read the preset file, transpile and evaluate it.
    // It allows for a no-dependency installation with a good DX for the preset developer.
    // This is risky, but the nature of `npx` is risky anyway. Any external script represents
    // a danger, so the end-user needs to be aware of that.
    // const preset = (await import(presetAbsolutePath)) as Preset;
    const file = fs.readFileSync(presetAbsolutePath).toString();
    const preset = eval(ts.transpile(file)) as Preset;

    // Preset check
    if (!preset || !preset.isValid()) {
      return Log.exit(`${Color.file(presetAbsolutePath)} is not a valid preset file.`);
    }

    return preset.generateContext(directory, presetPackage, ...args);
  }

  /**
   * Runs the preset for the given context.
   */
  private static async run(context: ContextContract): Promise<void> {
    const actions = await context.generator.actions(context);

    const validators = {
      copy: CopyValidator,
    };

    // Validates actions first.
    // If one action is not correctly parsed, the whole preset is compromised.
    // The validator returns an action with its defaults.
    const validated = await Promise.all(
      actions.map(async action => {
        return await Validator.validate(action, context);
      })
    );

    // Executes actions
    // for (const action of validated) {
    //   await Action.execute(context, <ActionContract>action); // TODO test that
    // }
  }
}