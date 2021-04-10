"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditJsonHandler = void 0;
const tslib_1 = require("tslib");
// @ts-ignore - TODO: maybe update this
const unset_value_1 = tslib_1.__importDefault(require("unset-value"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const deepmerge_1 = tslib_1.__importDefault(require("deepmerge"));
const detect_indent_1 = tslib_1.__importDefault(require("detect-indent"));
const inversify_1 = require("inversify");
const exports_1 = require("@/exports");
let EditJsonHandler = class EditJsonHandler {
    constructor() {
        this.name = exports_1.Name.Handler.EditJson;
    }
    async handle(action, applierOptions) {
        var _a;
        if (!action.file) {
            this.bus.debug(`No JSON file given.`);
            return;
        }
        const absolutePath = path_1.default.join(applierOptions.target, action.file);
        if (!fs_extra_1.default.existsSync(absolutePath)) {
            this.bus.debug(`${exports_1.color.magenta(absolutePath)} could not be found.`);
            return;
        }
        const { content, indent } = this.getContent(absolutePath);
        // Merge
        const updated = deepmerge_1.default(content, (_a = action.json) !== null && _a !== void 0 ? _a : {});
        // Deletion
        action.pathsToDelete.forEach((noContextPaths) => {
            const contextualizedPaths = exports_1.contextualizeValue(action.preset, noContextPaths);
            const paths = [];
            if (!Array.isArray(contextualizedPaths)) {
                paths.push(contextualizedPaths);
            }
            else {
                paths.push(...contextualizedPaths);
            }
            paths.forEach((path) => unset_value_1.default(updated, exports_1.contextualizeValue(action.preset, path)));
        });
        // Write
        this.bus.debug(`Writing back to ${exports_1.color.magenta(absolutePath)}.`);
        this.bus.debug(`Content: ${exports_1.color.gray(JSON.stringify(updated))}`);
        fs_extra_1.default.writeJSONSync(absolutePath, updated, {
            spaces: indent,
        });
    }
    /**
     * Gets the content of the file.
     */
    getContent(path) {
        try {
            let content = fs_extra_1.default.readFileSync(path, {
                encoding: 'utf-8',
            });
            return Object.assign({ content: JSON.parse(content) }, detect_indent_1.default(content));
        }
        catch (error) {
            throw new exports_1.ExecutionError() //
                .withMessage('Could not read the JSON file.')
                .withCompleteStack(error)
                .stopsExecution();
        }
    }
};
tslib_1.__decorate([
    inversify_1.inject(exports_1.Binding.Bus),
    tslib_1.__metadata("design:type", exports_1.Bus)
], EditJsonHandler.prototype, "bus", void 0);
EditJsonHandler = tslib_1.__decorate([
    inversify_1.injectable()
], EditJsonHandler);
exports.EditJsonHandler = EditJsonHandler;
