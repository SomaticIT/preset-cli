"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleImporter = void 0;
const tslib_1 = require("tslib");
const vm_1 = tslib_1.__importDefault(require("vm"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const esbuild_1 = require("esbuild");
const inversify_1 = require("inversify");
const exports_1 = require("@/exports");
let ModuleImporter = class ModuleImporter {
    async import(directory) {
        this.bus.debug(`Importing preset at ${exports_1.color.magenta(directory)}.`);
        const filename = this.findConfiguration(directory);
        const script = fs_extra_1.default.readFileSync(filename).toString();
        const sanitizedScript = this.removeSelfImportStatement(script);
        return await this.evaluateConfiguration(sanitizedScript, directory, filename);
    }
    /**
     * Finds the configuration file for the given directory.
     */
    findConfiguration(directory) {
        const packagePath = path_1.default.join(directory, 'package.json');
        // Tries to find a specified configuration file in the package.json.
        // If there is a specified file that does not exist, we throw.
        // If there is no specified file, we try to guess it.
        if (fs_extra_1.default.existsSync(packagePath)) {
            const { preset } = JSON.parse(fs_extra_1.default.readFileSync(packagePath).toString());
            if (preset) {
                const presetPath = path_1.default.join(directory, preset);
                if (fs_extra_1.default.statSync(presetPath).isFile()) {
                    return presetPath;
                }
                throw new exports_1.ExecutionError()
                    .withMessage(`The specified configuration file does not exist (${exports_1.color.magenta(presetPath)}).`)
                    .withoutStack()
                    .stopsExecution();
            }
        }
        // Tries to guess the configuration file. It can be in ./
        // or ./src, is named "preset" and can have a few extensions.
        const paths = ['preset', 'src/preset'];
        const extensions = ['ts', 'js', 'mjs', 'cjs'];
        const files = [];
        paths.forEach((file) => {
            extensions.forEach((extension) => {
                files.push(path_1.default.join(directory, `${file}.${extension}`));
            });
        });
        for (const file of files) {
            if (fs_extra_1.default.existsSync(file)) {
                this.bus.debug(`Found preset file at ${exports_1.color.underline(file)}.`);
                return file;
            }
        }
        throw new exports_1.ExecutionError()
            .withMessage(`The configuration file could not be found (tried in ${exports_1.color.magenta(directory)}).`)
            .withoutStack()
            .stopsExecution();
    }
    /**
     * Evaluates the configuration and returns the preset.
     */
    async evaluateConfiguration(script, directory, filename) {
        try {
            const context = vm_1.default.createContext(this.createContext(directory, filename));
            const code = this.transformScript(script, directory, filename);
            vm_1.default.runInContext(code, context);
            return context.Preset;
        }
        catch (error) {
            throw new exports_1.ExecutionError() //
                .withMessage(`The preset could not be evaluated.`)
                .withCompleteStack(error)
                .stopsExecution();
        }
    }
    /**
     * Removes the import statement for this very package from the given script.
     */
    removeSelfImportStatement(script) {
        return script
            .split(/\r\n|\r|\n/)
            .filter((line) => {
            const lineImports = ['import', 'require'].some((statement) => line.includes(statement));
            const lineMentionsImportValue = [exports_1.getPackage().name, 'color', '@/api', 'use-preset'].some((imp) => line.includes(imp));
            if (lineImports && lineMentionsImportValue) {
                return false;
            }
            return true;
        })
            .join('\n');
    }
    transformScript(contents, resolveDir, sourcefile) {
        if (contents.includes('import ')) {
            const { outputFiles } = esbuild_1.buildSync({
                stdin: {
                    contents,
                    resolveDir,
                    sourcefile,
                    loader: 'ts',
                },
                platform: 'node',
                format: 'cjs',
                external: ['apply'],
                bundle: true,
                write: false,
            });
            return outputFiles[0].text;
        }
        const { code } = esbuild_1.transformSync(contents, {
            loader: 'ts',
            format: 'cjs',
        });
        return code;
    }
    createContext(directory, filename) {
        const exports = {};
        const moduleGlobals = {
            exports,
            require,
            module: {
                exports,
                filename,
                id: filename,
                path: directory,
                require: module.require,
            },
            __dirname: directory,
            __filename: filename,
        };
        const nodeGlobals = {
            Buffer,
            clearImmediate,
            clearInterval,
            clearTimeout,
            console,
            global,
            process,
            queueMicrotask,
            setImmediate,
            setInterval,
            setTimeout,
        };
        return Object.assign(Object.assign(Object.assign({}, moduleGlobals), nodeGlobals), { Preset: new exports_1.Preset(), color: exports_1.color });
    }
};
tslib_1.__decorate([
    inversify_1.inject(exports_1.Binding.Bus),
    tslib_1.__metadata("design:type", exports_1.Bus)
], ModuleImporter.prototype, "bus", void 0);
ModuleImporter = tslib_1.__decorate([
    inversify_1.injectable()
], ModuleImporter);
exports.ModuleImporter = ModuleImporter;
