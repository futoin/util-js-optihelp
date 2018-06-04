
  [![NPM Version](https://img.shields.io/npm/v/@futoin/optihelp.svg?style=flat)](https://www.npmjs.com/package/@futoin/optihelp)
  [![NPM Downloads](https://img.shields.io/npm/dm/@futoin/optihelp.svg?style=flat)](https://www.npmjs.com/package/@futoin/optihelp)
  [![Build Status](https://travis-ci.org/futoin/util-js-optihelp.svg)](https://travis-ci.org/futoin/util-js-optihelp)
  [![stable](https://img.shields.io/badge/stability-stable-green.svg?style=flat)](https://www.npmjs.com/package/@futoin/optihelp)

  [![NPM](https://nodei.co/npm/@futoin/optihelp.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/@futoin/optihelp/)


# About

Node.js module optimization helper.

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

# Examples

```javascript
const optihelp = require('@futoin/optihelp');

```

# API documentation

<a name="OptiHelper"></a>

## OptiHelper
Module Optimization Helper

**Kind**: global class  

* [OptiHelper](#OptiHelper)
    * [new OptiHelper(name, dst)](#new_OptiHelper_new)
    * [.test(name, cb)](#OptiHelper+test) ⇒ [<code>OptiHelper</code>](#OptiHelper)
    * [.start(cb)](#OptiHelper+start)

<a name="new_OptiHelper_new"></a>

### new OptiHelper(name, dst)
C-tor


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | suite name |
| dst | <code>string</code> | <code>&quot;test/results&quot;</code> | destination folder |

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


