const CleanDirWebpackPlugin = require("./../cleandir-webpack-plugin");
const path = require("path");

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
             });

             describe(".hookCallback()", () => {
                 it("should call the callback", () => {
                     const spy = jest.fn(() => {});
                     const plugin = new CleanDirWebpackPlugin({dryRun: true, paths: ["files/**"]});

                     plugin.hookCallback(undefined, spy);

                     expect(spy).toHaveBeenCalled();
                 });

                 it("should call the .clean() method", () => {
                     const plugin = new CleanDirWebpackPlugin({dryRun: true, paths: ["files/**"]});

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
                     const plugin = new CleanDirWebpackPlugin({dryRun: true, paths: ["files/**"]});

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
                     const plugin = new CleanDirWebpackPlugin({dryRun: true, paths: ["files/**"], stage: "before"});

                     plugin.opt.stage = "hey!";

                     try {
                         plugin.apply(compiler);
                     }
                     catch (e) {
                         expect(e).toBeInstanceOf(Error);
                     }
                 });

                 it("should tap the emit hook if stage === 'before'", () => {
                     const plugin = new CleanDirWebpackPlugin({dryRun: true, paths: ["files/**"], stage: "before"});

                     plugin.apply(compiler);

                     expect(compiler.hooks.emit.tap).toHaveBeenCalled();
                     compiler.hooks.emit.tap.mockReset();
                 });

                 it("should tap the afterEmit hook if stage === 'after'", () => {
                     const plugin = new CleanDirWebpackPlugin({dryRun: true, paths: ["files/**"], stage: "after"});

                     plugin.apply(compiler);

                     expect(compiler.hooks.afterEmit.tapAsync).toHaveBeenCalled();
                     compiler.hooks.afterEmit.tapAsync.mockReset();
                 });
             });
         });
