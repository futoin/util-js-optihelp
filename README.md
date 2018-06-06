
  [![NPM Version](https://img.shields.io/npm/v/@futoin/optihelp.svg?style=flat)](https://www.npmjs.com/package/@futoin/optihelp)
  [![NPM Downloads](https://img.shields.io/npm/dm/@futoin/optihelp.svg?style=flat)](https://www.npmjs.com/package/@futoin/optihelp)
  [![Build Status](https://travis-ci.org/futoin/util-js-optihelp.svg)](https://travis-ci.org/futoin/util-js-optihelp)
  [![stable](https://img.shields.io/badge/stability-stable-green.svg?style=flat)](https://www.npmjs.com/package/@futoin/optihelp)

  [![NPM](https://nodei.co/npm/@futoin/optihelp.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/@futoin/optihelp/)


# About

FutoIn OptiHelp is Node.js module optimization helper.

Unlike simple benchmark tools, FutoIn OptiHelp
stores base and best results. It helps you to understand how new optimization
and other changes affect performance of your project over time.

**Documentation** --> [FutoIn Guide](https://futoin.org/docs/miscjs/optihelp/)

Author: [Andrey Galkin](mailto:andrey@futoin.org)

# Installation for Node.js

Command line:
```sh
$ npm install @futoin/optihelp --save
```
or:

```sh
$ yarn add @futoin/optihelp --save
```

# Concept & notes

1. Tests are unique per CPU model and Node.js version.
    - The combination is obfuscated with SHA-256 hash for minor security and ease of result management.
1. History of test results is stored under `test/results` in project root by default.
    - See OptiHelper `dst_root` option.
1. Upon first run, only benchmark results are shown. This results are called "base".
1. Upon any subsequent run, OptiHelper also shows different to "base" and "best" ever values.
1. Benchmark sequence:
    - calibration run (single shot),
    - warmup run based on `test_time`*`warmup_ratio` options,
    - actual benchmark for `test_time` option,
    - after all tests are done, additional benchmark passes may run (`pass` option).
1. Optional profiling uses `v8-profiler` module.
1. The result is dumped in stdout, but an overall machine readable report is also generated.
1. `process.hrtime()` with nanosecond resolution is used.

# Usage

1. Create `optihelp.js` in your tests folder with Suite of tests.
1. Run the first ever cycle to get "base" results.
1. Commit changes and the results.
1. Create a branch of your project, for example `optimization-refdata`.
    - It would be helpful when you'll want to add extra tests.
1. Make optimization and/or other changes
1. Run the `optihelp.js` test again and observe the results.

# Examples

```javascript
const optihelp = require('@futoin/optihelp');

optihelp('Suite Name', { test_time : 5, pass : 3 } )
    .test( 'Async Test', (done) => { /* ... */; done() } )
    .test( 'Sync Test', () => { /* ... */; } )
    .start((report) => console.log(report));

```

# API documentation

<a name="OptiHelper"></a>

## OptiHelper
Module Optimization Helper

**Kind**: global class  

* [OptiHelper](#OptiHelper)
    * [new OptiHelper(name, options)](#new_OptiHelper_new)
    * [.test(name, cb)](#OptiHelper+test) ⇒ [<code>OptiHelper</code>](#OptiHelper)
    * [.start(cb)](#OptiHelper+start)

<a name="new_OptiHelper_new"></a>

### new OptiHelper(name, options)
C-tor


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | suite name |
| options | <code>object</code> |  | various options |
| options.pass | <code>integer</code> | <code>2</code> | how many passes to run |
| options.dst_root | <code>string</code> | <code>&quot;&#x27;test/results&#x27;&quot;</code> | result history folder |
| options.test_time | <code>float</code> | <code>5</code> | how long to run a single pass of each test in seconds |
| options.warmup_ratio | <code>float</code> | <code>1</code> | how long to warmup based on test_time |
| options.profile_ratio | <code>float</code> | <code>0.1</code> | how long to profile based on test_time |
| options.do_profile | <code>boolean</code> | <code>false</code> | run v8-profiler, if true |
| options.check_prod | <code>boolean</code> | <code>true</code> | ensure running in production env |
| options.report_file | <code>string</code> | <code>null</code> | store report in file, if true |

<a name="OptiHelper+test"></a>

### optiHelper.test(name, cb) ⇒ [<code>OptiHelper</code>](#OptiHelper)
Execute test several times

**Kind**: instance method of [<code>OptiHelper</code>](#OptiHelper)  
**Returns**: [<code>OptiHelper</code>](#OptiHelper) - self for chaining  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | test name |
| cb | <code>callable</code> | test callback |

<a name="OptiHelper+start"></a>

### optiHelper.start(cb)
Start execution of tests

**Kind**: instance method of [<code>OptiHelper</code>](#OptiHelper)  

| Param | Type | Description |
| --- | --- | --- |
| cb | <code>callable</code> | completion callback |


