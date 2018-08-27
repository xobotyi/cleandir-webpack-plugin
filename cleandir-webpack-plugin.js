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
    /**
     * @param paths {array<string>|string}
     * @param options {object}
     */
    constructor(paths, options) {
        if (typeof paths === "string") {
            if (!paths) {
                throw new TypeError(`paths expected to be a valuable string`);
            }

            paths = [paths];
        }
        else if (!Array.isArray(paths)) {
            throw new TypeError(`paths expected to be an array or string, got ${typeof paths}`);
        }

        this.paths = paths;

        this.opt = {
            stage:         STAGE_BEFORE,
            exclude:       [],
            verbose:       true,
            silent:        false,
            dryRun:        false,
            root:          undefined,
            allowExternal: false,
            ...options,
        };

        if (typeof this.opt.exclude === "string") {
            if (!this.opt.exclude) {
                throw new TypeError(`options.exclude expected to be a valuable string`);
            }

            this.opt.exclude = [this.opt.exclude];
        }
        else if (!Array.isArray(this.opt.exclude)) {
            throw new TypeError(`options.exclude expected to be an array or string, got ${typeof this.opt.exclude}`);
        }

        if (this.opt.root && !path.isAbsolute(this.opt.root)) {
            throw new Error("project root has to be an absolute path");
        }

        if (!STAGES.includes(this.opt.stage)) {
            throw new Error(`stage '${this.opt.stage}' not supported`);
        }

        this.opt.allowExternal = !!this.opt.allowExternal;
        this.opt.verbose = !!this.opt.verbose;
        this.opt.silent = !!this.opt.silent;
        this.opt.dryRun = !!this.opt.dryRun;

        this.cwd = process.cwd();
        this.dirName = __dirname;
        this.webpackDir = path.dirname(module.parent.filename);
        this.projectRoot = path.resolve(this.opt.root || path.dirname(module.parent.filename));

        if (IS_WINDOWS) {
            this.cwd = CleanDirWebpackPlugin.fixWindowsPath(this.cwd);
            this.dirName = CleanDirWebpackPlugin.fixWindowsPath(this.dirName);
            this.webpackDir = CleanDirWebpackPlugin.fixWindowsPath(this.webpackDir);
            this.projectRoot = CleanDirWebpackPlugin.fixWindowsPath(this.projectRoot);
        }

        this.cwd.slice(-1) !== "/" && (this.cwd += "/");
        this.dirName.slice(-1) !== "/" && (this.dirName += "/");
        this.webpackDir.slice(-1) !== "/" && (this.webpackDir += "/");
        this.projectRoot.slice(-1) !== "/" && (this.projectRoot += "/");

        this.clean = this.clean.bind(this);
        this.hookCallback = this.hookCallback.bind(this);
    }

    /**
     * @param pathToFix {string}
     * @param forceWindowsSeparatorSplit {boolean}
     *
     * @return {string}
     */
    static fixWindowsPath(pathToFix, forceWindowsSeparatorSplit = false) {
        pathToFix = pathToFix.split(forceWindowsSeparatorSplit ? path.win32.sep : path.sep);
        pathToFix[0] = pathToFix[0].toUpperCase();

        return pathToFix.join("/");
    }

    /**
     * @param filePath {string}
     * @return {boolean}
     */
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

    /**
     * @param dirPath {string}
     * @return {boolean}
     */
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
        if (!this.paths.length) {
            !this.opt.silent && this.opt.verbose && console.log(chalk.yellow(`${PLUGIN_NAME}: paths is empty. Skipping everything!`));
            return [[undefined, "paths is empty, nothing to clean"]];
        }

        const results = [];
        const excludedPaths = [];

        this.opt.exclude
            .forEach((excludedGlob) => {
                excludedPaths.push(...glob.sync(excludedGlob,
                                                {
                                                    cwd:      this.projectRoot,
                                                    absolute: true,
                                                    mark:     true,
                                                }));
            });

        this.paths
            .forEach((pathToRemove) => {
                pathToRemove = path.resolve(this.projectRoot, pathToRemove);

                if (IS_WINDOWS) {
                    pathToRemove = CleanDirWebpackPlugin.fixWindowsPath(pathToRemove);
                }

                // prevent from deleting external files
                if (!pathToRemove.includes(this.projectRoot) && !this.opt.allowExternal) {
                    results.push([pathToRemove, "skipped. Outside of root dir."]);
                    !this.opt.silent && console.log(chalk.yellow(`${PLUGIN_NAME}: "${pathToRemove}" is outside of the setted root directory. Skipping..`));
                    return;
                }

                pathToRemove = pathToRemove.slice(-1) === "/" ? pathToRemove + "**" : pathToRemove;

                const ignored = [];
                const removed = [];

                const matchedDirectories = [];
                const matchedFiles = [];

                glob.sync(pathToRemove, {
                        cwd:      this.projectRoot,
                        absolute: true,
                        mark:     true,
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
                if (matchedDirectories.includes(this.webpackDir)) {
                    results.push([pathToRemove, "skipped. Will delete webpack."]);
                    !this.opt.silent && console.log(chalk.red(`${PLUGIN_NAME}: '${pathToRemove}' would delete webpack. Skipping..`));
                    return;
                }

                // prevent from deleting project root
                if (matchedDirectories.includes(this.projectRoot)) {
                    results.push([pathToRemove, "skipped. Will delete root directory."]);
                    !this.opt.silent && console.log(chalk.red(`${PLUGIN_NAME}: '${pathToRemove}' would delete project directory. Skipping..`));
                    return;
                }

                // prevent from deleting project root
                if (matchedDirectories.includes(this.cwd) || matchedDirectories.includes(this.dirName)) {
                    results.push([pathToRemove, "skipped. Will delete working directory."]);
                    !this.opt.silent && console.log(chalk.red(`${PLUGIN_NAME}: '${pathToRemove}' would delete working directory. Skipping..`));
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

    /**
     * @param arg
     * @param callback {function}
     */
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
