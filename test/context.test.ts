import { Parser, Log } from '../src';
import path from 'path';

describe('Context', () => {
  // function expectToThrowWith()
  it('throws when the given directory does not exist', async () => {
    Log.fake();
    const exit = jest.spyOn(process, 'exit').mockImplementation();
    const directory = path.join(__dirname, 'stubs', 'inexisting-preset-directory');
    const context = await Parser.parse(directory, false);

    expect(exit).toHaveBeenCalled();
    expect(context).toBeUndefined();
    expect(Log.logs).toContainEqual(`error ${directory} is not a preset directory.`);
  });

  it('throws when there is no package.json', async () => {
    Log.fake();
    const exit = jest.spyOn(process, 'exit').mockImplementation();
    const directory = path.join(__dirname, 'stubs', 'packageless-preset');
    const context = await Parser.parse(directory, false);

    expect(exit).toHaveBeenCalled();
    expect(context).toBeUndefined();
    expect(Log.logs).toContainEqual(`error ${directory} does not have a package.json.`);
  });

  it('throws when the specified preset file does not exist', async () => {
    Log.fake();
    const exit = jest.spyOn(process, 'exit').mockImplementation();
    const directory = path.join(__dirname, 'stubs', 'wrong-preset-file');
    const presetFile = require(path.join(directory, 'package.json')).preset;
    const context = await Parser.parse(directory, false);

    expect(exit).toHaveBeenCalled();
    expect(context).toBeUndefined();
    expect(Log.logs).toContainEqual(`error Preset file ${path.join(directory, presetFile)} does not exist.`);
  });

  it('throws when the specified preset is not valid', async () => {
    Log.fake();
    const exit = jest.spyOn(process, 'exit').mockImplementation();
    const directory = path.join(__dirname, 'stubs', 'invalid-preset-file');
    const context = await Parser.parse(directory, false);

    expect(exit).toHaveBeenCalled();
    expect(context).toBeUndefined();
    expect(Log.logs).toContainEqual(`error ${path.join(directory, 'preset.js')} is not a valid preset file.`);
  });

  it('loads a context for a preset', async () => {
    const directory = path.join(__dirname, 'stubs', 'copy');
    const context = await Parser.parse(directory, false);

    delete context.generator;
    expect(context).toEqual({
      args: [],
      presetDirectory: directory,
      presetFile: path.join(directory, 'preset.js'),
      presetName: 'Unnamed',
      presetTemplates: path.join(directory, 'templates'),
      targetDirectory: process.cwd(),
      temporary: false,
    });
  });
});
