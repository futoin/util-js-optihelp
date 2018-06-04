'use strict';

/**
 * @file
 *
 * Copyright 2018 FutoIn Project (https://futoin.org)
 * Copyright 2018 Andrey Galkin <andrey@futoin.org>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const profiler = require( 'v8-profiler' );
const path = require( 'path' );
const fs = require( 'fs' );
const os = require( 'os' );
const crypto = require( 'crypto' );
const { nowDouble } = require( 'microtime' );

const TEST_TIME = 60;

/**
 * Module Optimization Helper
 */
class OptiHelper {
    /**
     * C-tor
     *
     * @param {string} name - suite name
     * @param {string} dst - destination folder
     */
    constructor( name, dst='test/results', {
        test_time = TEST_TIME,
        warmup_ratio = 0.1,
        profile_ratio = 0.1,
        do_profile = true,
    } ) {
        let model = os.cpus()[0].model;
        model = crypto.createHash( 'sha256' ).update( model ).digest( 'hex' );

        this._name = name;
        this._dst_root = path.resolve( dst );
        this._dst = path.join( this._dst_root, model );
        this._result_file = null;
        this._test_time = test_time;
        this._queue = [];
        this._warmup_ratio = warmup_ratio;
        this._profile_ratio = profile_ratio;
        this._do_profile = do_profile;
    }

    /**
     * Execute test several times
     * @param {string} name - test name
     * @param {callable} cb - test callback
     */
    test( name, cb ) {
        const q = this._queue;
        const done = () => {
            const next = q.shift();
            next();
        };

        q.push( () => this._test( name, cb, done ) );
    }

    /**
     * Start execution of tests
     * @param {callable} cb - completion callback
     */
    start( cb ) {
        const q = this._queue;
        q.push( cb );
        const next = q.shift();
        next();
    }

    _test( name, cb, test_done ) {
        const raw_cb = cb;
        const test_cb = ( cb.length === 0 ) ? ( done ) => {
            raw_cb(); done();
        } : raw_cb;

        this._result_file = path.resolve( this._dst, `${name.replace( / /g, '_' )}.json` );
        const data = this._load();
        const full_name = `${this._name}/${name}`;

        this._log( '---' );
        this._log( `Test ${full_name}` );
        this._log( `Calibrating...` );
        const calib_start = nowDouble();
        test_cb( () => {
            const calib_time = nowDouble() - calib_start;
            const count = parseInt( this._test_time / calib_time ) || 1;
            this._log( `Calibration result: ${( 1/calib_time ).toFixed( 3 )}Hz, ${count} cycles` );

            const warmup = () => {
                this._log( `Warming up...` );
                let i = parseInt( count * this._warmup_ratio ) || 1;

                const iterate = () => {
                    if ( i-- > 0 ) {
                        setImmediate( iterate );
                    } else {
                        benchmark();
                    }
                };
                iterate();
            };

            const benchmark = () => {
                let i = 0;
                let min = 0xFFFFFFF;
                let max = 0;
                let total = 0;

                const iterate = () => {
                    const iter_start = nowDouble();
                    test_cb( () => {
                        const iter_time = nowDouble() - iter_start;
                        total += iter_time;
                        min = Math.min( min, iter_time );
                        max = Math.max( max, iter_time );

                        if ( ++i >= count ) {
                            const bench_time = nowDouble() - bench_start;
                            const avg = total/count;
                            const avg_hz = 1 / avg;
                            const min_hz = 1 / min;
                            const max_hz = 1 / max;

                            this._log( `Benchmark result:` );
                            this._log( `  avg:    ${avg}s    ${avg_hz.toFixed( 3 )}Hz` );
                            this._log( `  min:    ${min}s    ${min_hz.toFixed( 3 )}Hz` );
                            this._log( `  max:    ${max}s    ${max_hz.toFixed( 3 )}Hz` );

                            data.current = {
                                total,
                                count,
                                avg,
                                avg_hz,
                                min,
                                min_hz,
                                max,
                                max_hz,
                                bench_time,
                            };

                            setImmediate( profile );
                        } else {
                            setImmediate( iterate );
                        }
                    } );
                };

                this._log( `Benchmarking...` );
                const bench_start = nowDouble();
                iterate();
            };

            const profile = () => {
                if ( !this._do_profile ) {
                    complete();
                    return;
                }

                this._log( `Profiling...` );
                let i = parseInt( count * this._warmup_ratio ) || 1;

                const iterate = () => {
                    if ( i-- > 0 ) {
                        setImmediate( iterate );
                    } else {
                        const p = profiler.stopProfiling( full_name );

                        //const end_snap = profiler.takeSnapshot('End');
                        //this._log(start_snap.compare(end_snap));

                        p.export( function( _, result ) {
                            const fn = full_name.replace( /[ /]/g, '_' );
                            fs.writeFileSync( `prof-${fn}.json`, result );
                            p.delete();
                            complete();
                        } );
                    }
                };
                //const start_snap = profiler.takeSnapshot('Stat');
                profiler.startProfiling( full_name, true );
                iterate();
            };

            const complete = () => {
                const { stored, current } = data;

                if ( !stored.base ) {
                    stored.base = current;
                    stored.best = current;
                    this._log( 'No results to compare yet.' );
                } else {
                    const { base, best } = stored;

                    for ( let m of [ 'total', 'avg', 'min', 'max', 'bench_time' ] ) {
                        best[m] = Math.min( best[m], current[m] );
                    }

                    for ( let m of [ 'count', 'avg_hz', 'min_hz', 'max_hz' ] ) {
                        best[m] = Math.max( best[m], current[m] );
                    }

                    this._log( `Comparison to base:` );

                    for ( let m of [ 'avg', 'min', 'max' ] ) {
                        const diff = current[m] - base[m];
                        const diff_hz = current[`${m}_hz`] - base[`${m}_hz`];
                        const percent = diff / base[m] * 100;
                        this._log( `  ${m}:    ${percent.toFixed( 3 )}%    ${diff}s    ${diff_hz.toFixed( 3 )}Hz` );
                    }

                    this._log( `Comparison to best:` );

                    for ( let m of [ 'avg', 'min', 'max' ] ) {
                        const diff = current[m] - best[m];
                        const diff_hz = current[`${m}_hz`] - best[`${m}_hz`];
                        const percent = diff / best[m] * 100;
                        this._log( `  ${m}:    ${percent.toFixed( 3 )}%    ${diff}s    ${diff_hz.toFixed( 3 )}Hz` );
                    }
                }

                this._store( stored );
                this._log( '' );
                setImmediate( test_done );
            };

            warmup();
        } );
    }

    _log( msg ) {
        // eslint-disable-next-line no-console
        console.log( msg );
    }

    _load() {
        let stored;

        try {
            stored = JSON.parse( fs.readFileSync( this._result_file ) );
        } catch ( _ ) {
            stored = {
                base : null,
                best : null,
            };
        }

        return {
            stored,
            current: null,
        };
    }

    _store( stored ) {
        try {
            fs.mkdirSync( this._dst_root, 0o750 );
        } catch ( _ ) {
            // pass
        }

        try {
            fs.mkdirSync( this._dst, 0o750 );
        } catch ( _ ) {
            // pass
        }

        const tmp = this._result_file + '.tmp';
        fs.writeFileSync( tmp, JSON.stringify( stored ) );
        fs.renameSync( tmp, this._result_file );
    }
}

module.exports = {
    OptiHelper,
};
