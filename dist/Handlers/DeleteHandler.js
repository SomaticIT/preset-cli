"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteHandler = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const inversify_1 = require("inversify");
const exports_1 = require("@/exports");
let DeleteHandler = class DeleteHandler {
    constructor() {
        this.name = exports_1.Name.Handler.Delete;
    }
    async handle(action, applierOptions) {
        for (const relativePath of action.paths) {
            const absolutePath = path_1.default.join(applierOptions.target, relativePath);
            if (!fs_extra_1.default.existsSync(absolutePath)) {
                this.bus.debug(`Skipping deletion of ${exports_1.color.magenta(absolutePath)} because it does not exist.`);
                continue;
            }
            this.bus.debug(`Deleting ${exports_1.color.magenta(absolutePath)}.`);
            fs_extra_1.default.rmdirSync(absolutePath, {
                recursive: true,
            });
        }
    }
};
tslib_1.__decorate([
    inversify_1.inject(exports_1.Binding.Bus),
    tslib_1.__metadata("design:type", exports_1.Bus)
], DeleteHandler.prototype, "bus", void 0);
DeleteHandler = tslib_1.__decorate([
    inversify_1.injectable()
], DeleteHandler);
exports.DeleteHandler = DeleteHandler;
