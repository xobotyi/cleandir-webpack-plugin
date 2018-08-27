const CleanDirWebpackPlugin = require("./../cleandir-webpack-plugin");
const path = require("path");
const fs = require("fs");
const rimraf = require("rimraf");

describe("cleandir-webpack-plugin",
         () => {
             describe(".constructor()", () => {
                 it("should throw a TypeError if paths is not an array", () => {
                     try {
                         new CleanDirWebpackPlugin({paths: false});
                     }
                     catch (e) {
                         expect(e).toBeInstanceOf(TypeError);
                     }
                 });

                 it("should throw a TypeError if exclude is not an array", () => {
                     try {
                         new CleanDirWebpackPlugin({exclude: false});
                     }
                     catch (e) {
                         expect(e).toBeInstanceOf(TypeError);
                     }
                 });

                 it("should throw an Error if unknown stage passed", () => {
                     try {
                         new CleanDirWebpackPlugin({stage: "whoa!"});
                     }
                     catch (e) {
                         expect(e).toBeInstanceOf(Error);
                     }
                 });

                 it("should throw an Error if passed root is not an absolute path", () => {
                     let errorEmitted = false;
                     try {
                         new CleanDirWebpackPlugin({root: "/someStuff"});
                     }
                     catch (e) {
                         errorEmitted = true;
                     }

                     expect(errorEmitted).toBeFalsy();

                     try {
                         new CleanDirWebpackPlugin({root: "someStuff"});
                     }
                     catch (e) {
                         expect(e).toBeInstanceOf(Error);
                     }
                 });
             });

             describe(".hookCallback()", () => {
                 it("should call the callback", () => {
                     const spy = jest.fn(() => {});
                     const plugin = new CleanDirWebpackPlugin({dryRun: true, paths: ["files/**"], silent: true});

                     plugin.hookCallback(undefined, spy);

                     expect(spy).toHaveBeenCalled();
                 });

                 it("should call the .clean() method", () => {
                     const plugin = new CleanDirWebpackPlugin({dryRun: true, paths: ["files/**"], silent: true});

                     const spy = jest.spyOn(plugin, "clean");
                     plugin.hookCallback(undefined, () => {});

                     expect(spy).toHaveBeenCalled();
                 });
             });

             describe(".fixWindowsPath()", () => {

                 it("should transform the windows-stype path to unix-style", () => {
                     const transformSource = "C:\\some\\path";

                     expect(CleanDirWebpackPlugin.fixWindowsPath(transformSource, true)).toEqual("C:/some/path");
                 });

                 it("should uppercase first symbol (it is drive letter)", () => {
                     const transformSource = "c:\\some\\path";

                     expect(CleanDirWebpackPlugin.fixWindowsPath(transformSource)[0]).toEqual("C");
                 });
             });

             describe(".apply()", () => {
                 it("should instantly perform clean if first parameter not passed", () => {
                     const plugin = new CleanDirWebpackPlugin({dryRun: true, paths: ["files/**"], silent: true});

                     const spy = jest.spyOn(plugin, "clean");

                     plugin.apply();
                     expect(spy).toHaveBeenCalled();
                 });

                 const compiler = {
                     hooks: {
                         emit:      {
                             tap: jest.fn(() => {}),
                         },
                         afterEmit: {
                             tapAsync: jest.fn(() => {}),
                         },
                     },
                 };

                 it("should throw an Error if stage changed to unsupperted after the construction", () => {
                     const plugin = new CleanDirWebpackPlugin({dryRun: true, paths: ["files/**"], stage: "before", silent: true});

                     plugin.opt.stage = "hey!";

                     try {
                         plugin.apply(compiler);
                     }
                     catch (e) {
                         expect(e).toBeInstanceOf(Error);
                     }
                 });

                 it("should tap the emit hook if stage === 'before'", () => {
                     const plugin = new CleanDirWebpackPlugin({dryRun: true, paths: ["files/**"], stage: "before", silent: true});

                     plugin.apply(compiler);

                     expect(compiler.hooks.emit.tap).toHaveBeenCalled();
                     compiler.hooks.emit.tap.mockReset();
                 });

                 it("should tap the afterEmit hook if stage === 'after'", () => {
                     const plugin = new CleanDirWebpackPlugin({dryRun: true, paths: ["files/**"], stage: "after", silent: true});

                     plugin.apply(compiler);

                     expect(compiler.hooks.afterEmit.tapAsync).toHaveBeenCalled();
                     compiler.hooks.afterEmit.tapAsync.mockReset();
                 });
             });

             describe(".removeFile()", () => {
                 const testFilePath = path.join(__dirname, 'testFile');

                 it("should remove file if it exists", () => {
                     fs.writeFileSync(testFilePath, "");
                     expect(fs.existsSync(testFilePath)).toBeTruthy();

                     CleanDirWebpackPlugin.removeFile(testFilePath);

                     expect(fs.existsSync(testFilePath)).toBeFalsy();
                 });

                 it("should not emit error if file not exists", () => {
                     expect(fs.existsSync(testFilePath)).toBeFalsy();

                     let errorEmitted = false;

                     try {
                         CleanDirWebpackPlugin.removeFile(testFilePath);
                     }
                     catch (e) {
                         errorEmitted = true;
                     }

                     expect(errorEmitted).toBeFalsy();
                 });
             });

             describe(".removeDir()", () => {
                 const testDirPath = path.join(__dirname, 'testDir');
                 const testFilePath = path.join(__dirname, 'testDir', 'testFile');

                 it("should remove directory if it exists", () => {
                     fs.mkdirSync(testDirPath);
                     expect(fs.existsSync(testDirPath)).toBeTruthy();

                     CleanDirWebpackPlugin.removeDir(testDirPath);

                     expect(fs.existsSync(testDirPath)).toBeFalsy();
                 });

                 it("should not emit error if path not exists", () => {
                     expect(fs.existsSync(testDirPath)).toBeFalsy();

                     let errorEmitted = false;

                     try {
                         CleanDirWebpackPlugin.removeDir(testDirPath);
                     }
                     catch (e) {
                         errorEmitted = true;
                     }

                     expect(errorEmitted).toBeFalsy();
                 });

                 it("should not emit error if directory is not empty", () => {
                     fs.mkdirSync(testDirPath);
                     fs.writeFileSync(testFilePath, "");

                     expect(fs.existsSync(testFilePath)).toBeTruthy();
                     expect(fs.existsSync(testDirPath)).toBeTruthy();

                     let errorEmitted = false;

                     try {
                         CleanDirWebpackPlugin.removeDir(testDirPath);
                     }
                     catch (e) {
                         errorEmitted = true;
                     }

                     expect(errorEmitted).toBeFalsy();

                     fs.unlinkSync(testFilePath);
                     fs.rmdirSync(testDirPath);
                 });
             });

             describe(".clean()", () => {
                 let testDirPath = path.join(__dirname, 'test_dir');
                 let testFilePath1 = path.join(testDirPath, 'testFile.js');
                 let testFilePath2 = path.join(testDirPath, 'testFile.css');
                 let testFilePath3 = path.join(__dirname, 'testFile.html');

                 if (process.platform === "win32") {
                     testDirPath = CleanDirWebpackPlugin.fixWindowsPath(testDirPath);
                     testFilePath1 = CleanDirWebpackPlugin.fixWindowsPath(testFilePath1);
                     testFilePath2 = CleanDirWebpackPlugin.fixWindowsPath(testFilePath2);
                     testFilePath3 = CleanDirWebpackPlugin.fixWindowsPath(testFilePath3);
                 }

                 beforeEach(() => {
                     rimraf.sync(testDirPath);
                     rimraf.sync(testFilePath3);

                     fs.mkdirSync(testDirPath);
                     fs.writeFileSync(testFilePath1, "");
                     fs.writeFileSync(testFilePath2, "");
                     fs.writeFileSync(testFilePath3, "");
                 });

                 afterEach(() => {
                     rimraf.sync(testDirPath);
                     rimraf.sync(testFilePath3);
                 });

                 it("should skip if paths is empty", () => {
                     const plugin = new CleanDirWebpackPlugin({paths: [], silent: true});
                     const result = plugin.clean();

                     expect(result[0][0]).toBeUndefined();
                     expect(result[0][1]).toEqual("paths is empty, nothing to clean");
                 });

                 it("should skip external files if its not allowed", () => {
                     const plugin = new CleanDirWebpackPlugin({paths: ["./../testFile.html"], silent: true, root: testDirPath});
                     const result = plugin.clean();

                     expect(result[0][0]).toEqual(testFilePath3);
                     expect(result[0][1]).toEqual("skipped. Outside of root dir.");
                 });

                 it("should properly process glob patterns", () => {
                     const plugin = new CleanDirWebpackPlugin({paths: ["./*.css"], silent: true, root: testDirPath});
                     const result = plugin.clean();

                     expect(fs.existsSync(testFilePath1)).toBeTruthy();
                     expect(fs.existsSync(testFilePath2)).toBeFalsy();
                 });

                 it("should properly process exclusion glob patterns", () => {
                     const plugin = new CleanDirWebpackPlugin({paths: ["*"], exclude: ["*.js"], silent: true, root: testDirPath});
                     const result = plugin.clean();

                     expect(fs.existsSync(testFilePath1)).toBeTruthy();
                     expect(fs.existsSync(testFilePath2)).toBeFalsy();
                 });

                 it("should skip paths deleting root path", () => {
                     const plugin = new CleanDirWebpackPlugin({paths: [testDirPath], silent: true, root: testDirPath, allowExternal: true});
                     const result = plugin.clean();

                     console.log(testDirPath);

                     expect(result[0][0]).toEqual(testDirPath);
                     expect(result[0][1]).toEqual('skipped. Will delete root directory.');
                 });

                 it("should skip paths deleting cwd", () => {
                     let cwd = process.cwd();

                     if (process.platform === "win32") {
                         cwd = CleanDirWebpackPlugin.fixWindowsPath(cwd);
                     }

                     const plugin = new CleanDirWebpackPlugin({paths: ['./../../'], silent: true, root: testDirPath, allowExternal: true});
                     const result = plugin.clean();

                     expect(result[0][0]).toEqual(cwd);
                     expect(result[0][1]).toEqual('skipped. Will delete working directory.');
                 });

                 it("should skip paths deleting webpack", () => {
                     let webpackPath = __dirname;

                     if (process.platform === "win32") {
                         webpackPath = CleanDirWebpackPlugin.fixWindowsPath(webpackPath);
                     }

                     const plugin = new CleanDirWebpackPlugin({paths: [webpackPath], silent: true, root: testDirPath, allowExternal: true});
                     const result = plugin.clean();

                     expect(result[0][0]).toEqual(webpackPath);
                     expect(result[0][1]).toEqual('skipped. Will delete webpack.');
                 });

                 it("should skip paths even if whole directory marked for deletion", () => {
                     const plugin = new CleanDirWebpackPlugin({
                                                                  paths:         [
                                                                      'test_dir/**',
                                                                      '*.html',
                                                                  ],
                                                                  exclude:       [
                                                                      '**/*.css',
                                                                  ],
                                                                  silent:        true,
                                                                  allowExternal: false,
                                                              });
                     const result = plugin.clean();

                     expect(fs.existsSync(testDirPath)).toBeTruthy();
                     expect(fs.existsSync(testFilePath2)).toBeTruthy();
                     expect(fs.existsSync(testFilePath1)).toBeFalsy();
                     expect(fs.existsSync(testFilePath3)).toBeFalsy();
                 });

                 it("should delete directory if it marked for deletion and empty", () => {
                     const plugin = new CleanDirWebpackPlugin({
                                                                  paths:         [
                                                                      'test_dir/**',
                                                                      '*.html',
                                                                  ],
                                                                  silent:        true,
                                                                  allowExternal: false,
                                                              });
                     const result = plugin.clean();

                     expect(fs.existsSync(testDirPath)).toBeFalsy();
                     expect(fs.existsSync(testFilePath2)).toBeFalsy();
                     expect(fs.existsSync(testFilePath1)).toBeFalsy();
                     expect(fs.existsSync(testFilePath3)).toBeFalsy();
                 });

                 it("dry run should not delete files", () => {
                     const plugin = new CleanDirWebpackPlugin({
                                                                  paths:         [
                                                                      'test_dir/**',
                                                                      '*.html',
                                                                  ],
                                                                  dryRun:        true,
                                                                  silent:        true,
                                                                  allowExternal: false,
                                                              });
                     const result = plugin.clean();

                     expect(fs.existsSync(testDirPath)).toBeTruthy();
                     expect(fs.existsSync(testFilePath2)).toBeTruthy();
                     expect(fs.existsSync(testFilePath1)).toBeTruthy();
                     expect(fs.existsSync(testFilePath3)).toBeTruthy();
                 });
             });
         });
