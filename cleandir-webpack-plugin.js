const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const glob = require("glob");

const IS_WINDOWS = require("os").platform() === "win32";

const PLUGIN_NAME = "cleandir-webpack-plugin";

const STAGE_BEFORE = "before";
const STAGE_AFTER = "after";
const STAGES = [STAGE_BEFORE, STAGE_AFTER];

class CleanDirWebpackPlugin
{
    constructor(options) {
        this.opt = {
            stage:         STAGE_BEFORE,
            paths:         [],
            exclude:       [],
            verbose:       true,
            silent:        false,
            dryRun:        true,
            root:          path.dirname(module.parent.filename),
            allowExternal: false,
            ...options,
        };

        if (!STAGES.includes(this.opt.stage)) {
            throw new Error(`stage '${this.opt.stage}' not supported`);
        }
        if (!Array.isArray(this.opt.paths)) {
            throw new TypeError(`paths expected to be an array, got ${typeof this.opt.paths}`);
        }
        if (!Array.isArray(this.opt.exclude)) {
            throw new TypeError(`exclude expected to be an array, got ${typeof this.opt.exclude}`);
        }
        if (!path.isAbsolute(this.opt.root)) {
            throw new Error("project root has to be an absolute path");
        }

        this.clean = this.clean.bind(this);
        this.hookCallback = this.hookCallback.bind(this);
    }

    static fixWindowsPath(pathToFix, forceWindowsSeparatorSplit = false) {
        pathToFix = pathToFix.split(forceWindowsSeparatorSplit ? path.win32.sep : path.sep);
        pathToFix[0] = pathToFix[0].toUpperCase();

        return pathToFix.join("/");
    }

    static removeFile(filePath) {
        try {
            fs.unlinkSync(filePath);
        }
        catch (e) {
            if (e.code === "ENOENT") {
                return true;
            }

            throw e;
        }

        return true;
    }

    static removeDir(dirPath) {
        try {
            fs.rmdirSync(dirPath);
        }
        catch (e) {
            switch (e.code) {
                case "ENOENT":
                    return true;

                case "ENOTEMPTY":
                    return false;
            }

            throw e;
        }

        return true;
    }

    clean() {
        if (!this.opt.paths.length) {
            this.opt.verbose && console.log(chalk.yellow(`${PLUGIN_NAME}: project root has to be an absolute path. Skipping everything!`));
            return [[undefined, "paths are empty, nothing to clean"]];
        }

        let cwd = process.cwd();
        let dirName = __dirname;
        let projectRoot = path.resolve(this.opt.root);
        let webpackDir = path.dirname(module.parent.filename);

        if (IS_WINDOWS) {
            cwd = CleanDirWebpackPlugin.fixWindowsPath(cwd);
            dirName = CleanDirWebpackPlugin.fixWindowsPath(dirName);
            projectRoot = CleanDirWebpackPlugin.fixWindowsPath(projectRoot);
            webpackDir = CleanDirWebpackPlugin.fixWindowsPath(webpackDir);
        }

        const results = [];
        const excludedPaths = [];

        this.opt.exclude
            .forEach((excludedGlob) => {
                excludedPaths.push(...glob.sync(excludedGlob,
                                                {
                                                    cwd:      projectRoot,
                                                    absolute: true,
                                                }));
            });

        this.opt.paths
            .forEach((pathToRemove) => {
                pathToRemove = path.resolve(projectRoot, pathToRemove);

                if (IS_WINDOWS) {
                    pathToRemove = CleanDirWebpackPlugin.fixWindowsPath(pathToRemove);
                }

                // prevent from deleting external files
                if (!pathToRemove.includes(projectRoot) && !this.opt.allowExternal) {
                    results.push([pathToRemove, "skipped. Outside of root dir."]);
                    console.log(chalk.yellow(`${PLUGIN_NAME}: "${pathToRemove}" is outside of the setted root directory. Skipping..`));
                    return;
                }

                const ignored = [];
                const removed = [];

                const matchedDirectories = [];
                const matchedFiles = [];

                glob.sync(pathToRemove, {
                        cwd:      projectRoot,
                        absolute: true,
                    })
                    .forEach((match) => {
                        if (excludedPaths.includes(match)) {
                            return ignored.push(match);
                        }

                        match.slice(-1) === "/"
                        ? matchedDirectories.unshift(match)
                        : matchedFiles.unshift(match);
                    });

                // prevent from deleting webpack dir
                if (matchedDirectories.includes(webpackDir)) {
                    results.push([pathToRemove, "skipped. Will delete webpack."]);
                    console.log(chalk.red(`${PLUGIN_NAME}: '${pathToRemove}' would delete webpack. Skipping..`));
                    return;
                }

                // prevent from deleting project root
                if (matchedDirectories.includes(projectRoot)) {
                    results.push([pathToRemove, "skipped. Will delete root directory."]);
                    console.log(chalk.red(`${PLUGIN_NAME}: '${pathToRemove}' would delete project directory. Skipping..`));
                    return;
                }

                // prevent from deleting project root
                if (matchedDirectories.includes(cwd) || matchedDirectories.includes(dirName)) {
                    results.push([pathToRemove, "skipped. Will delete working directory."]);
                    console.log(chalk.red(`${PLUGIN_NAME}: '${pathToRemove}' would delete working directory. Skipping..`));
                    return;
                }
                if (!this.opt.dryRun) {
                    matchedFiles.forEach((filePath) => {
                        if (CleanDirWebpackPlugin.removeFile(filePath)) {
                            removed.unshift(filePath);
                        }
                    });

                    matchedDirectories.forEach((dirPath) => {
                        if (CleanDirWebpackPlugin.removeDir(dirPath)) {
                            removed.unshift(dirPath);
                        }
                    });
                }
                else {
                    removed.push(...matchedFiles);
                    removed.push(...matchedDirectories);
                }

                if (!this.opt.silent) {
                    this.opt.verbose
                    ? console.log(`${PLUGIN_NAME}: '${pathToRemove}' processed.\n\tRemoved ${removed.length}:\n\t\t ${removed.join("\n\t\t")} \n\tIgnored ${ignored.length}:\n\t\t ${ignored.join("\n\t\t")}.`)
                    : console.log(`${PLUGIN_NAME}: '${pathToRemove}' processed (${removed.length} removed, ${ignored.length} ignored).`);
                }
            });

        return results;
    }

    hookCallback(arg, callback) {
        this.clean();

        callback();
    }

    apply(compiler) {
        if (!compiler) { return this.clean(); }

        switch (this.opt.stage) {
            case STAGE_BEFORE:
                compiler.hooks.emit.tap(PLUGIN_NAME, this.clean);
                break;

            case STAGE_AFTER:
                compiler.hooks.afterEmit.tapAsync(PLUGIN_NAME, this.hookCallback);
                break;

            default:
                throw new Error(`stage '${this.opt.stage}' not supported`);
        }
    }
}

module.exports = CleanDirWebpackPlugin;
