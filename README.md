<h1 align="center">cleandir-webpack-plugin</h1>
<p align="center">
    <a href="https://www.npmjs.com/package/cleandir-webpack-plugin"><img src="https://img.shields.io/badge/npm-cleandir--webpack--plugin-brightgreen.svg" /></a>
    <a href="https://www.npmjs.com/package/cleandir-webpack-plugin"><img src="https://img.shields.io/npm/v/cleandir-webpack-plugin.svg" /></a>
    <a href="https://www.npmjs.com/package/cleandir-webpack-plugin"><img src="https://img.shields.io/npm/dt/cleandir-webpack-plugin.svg" /></a>
    <a href="https://www.npmjs.com/package/cleandir-webpack-plugin"><img src="https://img.shields.io/travis/xobotyi/cleandir-webpack-plugin.svg" /></a>
    <a href="https://www.codacy.com/app/xobotyi/cleandir-webpack-plugin"><img src="https://api.codacy.com/project/badge/Grade/d014e06fb8a94b2480d3e6827c1d6d3e"/></a>
    <a href="https://www.codacy.com/app/xobotyi/cleandir-webpack-plugin"><img src="https://api.codacy.com/project/badge/Coverage/d014e06fb8a94b2480d3e6827c1d6d3e"/></a>
    <a href="https://www.npmjs.com/package/cleandir-webpack-plugin"><img src="https://img.shields.io/npm/l/cleandir-webpack-plugin.svg" /></a>
</p>
This plugin allow you to delete files/directories before or after bundle compilation.  
Comparing to most popular cleanup plugin, `cleandir-webpack-plugin` providies you with ability to run plugin after files was written to output directory and ability to exclude files with glob patterns.

## Installation
```bash
npm i --save cleandir-webpack-plugin
```

## Usage
```javascript
// webpack.conf.js
const CleanDirWebpackPlugin = require("cleandir-webpack-plugin");

module.exports = {
    plugins:[
            new CleanDirWebpackPlugin(paths [, options])
    ]
}
```
#### paths _(required)_
Paths can be a valuable string or an array of strings.  
_Each string should be a valid glob pattern_ (node-glob is used under the hood).

#### options _(optional)_
```javascript
const options = {
    // The momen when cleanup will be triggered, before or after emitting assets to output dir.
    // This way you will be able to remove redundant files generated by webpack
    // 
    // Variants: "before", "after"
    // Default: "before"
    stage: "before",
    
    // Same as paths parameter, but files and direcroties matching given globs wont be deleted
    //
    // Default: []
    exclude: [],
    
    // If true writes result of each glob processing
    //
    // Default: true
    verbose: true,
    
    // If true, will not generate any console output (excepting error)
    //
    // Default: false
    silent: false,
    
    // If true, will only emulate deletion (will not remove files)
    //
    // Default: false
    dryRun: false,
    
    // Allow plugin to clean paths outside of given root path
    //
    // Default: false
    allowExternal: false,
    
    // Path that will be treated as relative root for globs
    //
    // Default: path.dirname(module.parent.filename)
    root: path.dirname(module.parent.filename),
}
```
