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

const { hrtime } = process;
const start_time = () => hrtime();
const diff_time = ( st ) => {
    const r = hrtime( st );
    return r[0] + ( r[1] / 1e9 );
};

const TEST_TIME = 5;

/**
 * Module Optimization Helper
 */
class OptiHelper {
    /**
     * C-tor
     *
     * @param {string} name - suite name
     * @param {object} options - various options
     */
    constructor( name, {
        dst_root = 'test/results',
        test_time = TEST_TIME,
        warmup_ratio = 1,
        profile_ratio = 0.1,
        do_profile = false,
        check_prod = true,
        report_file = null,
        pass = 2,
    } = {} ) {
        let model = os.cpus()[0].model;
        model = crypto.createHash( 'sha256' ).update( model ).digest( 'hex' );

        this._name = name;
        this._dst_root = path.resolve( dst_root );
        this._dst = path.join( this._dst_root, model );
        this._result_file = null;
        this._test_time = test_time;
        this._queue = [];
        this._warmup_ratio = warmup_ratio;
        this._profile_ratio = profile_ratio;
        this._do_profile = do_profile;
        this._report = {
            name,
            model,
            date: ( new Date() ).toString(),
            tests: {},
        };
        this._report_file = report_file ? path.resolve( report_file ) : null;

        // multi-pass
        this._pass = pass;
        this._final_pass = true;

        // filtering
        const { OPTIHELP_FILTER } = process.env;
        this._filter_tests = OPTIHELP_FILTER ? new Set( OPTIHELP_FILTER.split( ',' ) ) : null;

        // Allow only prod
        if ( check_prod && ( process.env.NODE_ENV !== 'production' ) ) {
            throw new Error( 'Please run with NODE_ENV=production' );
        }
    }

    /**
     * Execute test several times
     * @param {string} name - test name
     * @param {callable} cb - test callback
     * @returns {OptiHelper} self for chaining
     */
    test( name, cb ) {
        if ( this._filter_tests && !this._filter_tests.has( name ) ) {
            return this;
        }

        const q = this._queue;
        const done = () => {
            const next = q.shift();
            next();
        };

        q.push( () => this._test( name, cb, done ) );
        return this;
    }

    /**
     * Start execution of tests
     * @param {callable} cb - completion callback
     */
    start( cb = () => {} ) {
        const q = this._queue;
        const orig_len = q.length;
        let pass = this._pass;

        while ( --pass > 0 ) {
            this._final_pass = false;
            const last_run = ( pass === 1 );

            q.push( () => {
                this._log( `======= REPEAT =======` );
                this._final_pass = last_run;
                const next = q.shift();
                next();
            } );

            for ( let i = 0; i < orig_len; ++i ) {
                q.push( q[i] );
            }
        }

        q.push( () => {
            const report_file = this._report_file;

            if ( report_file ) {
                const report_data = JSON.stringify( this._report, null, 4 );
                fs.writeFileSync( report_file, report_data );
            }

            cb( this._report );
        } );
        const next = q.shift();
        next();
    }

    _test( name, cb, test_done ) {
        const raw_cb = cb;
        const test_cb = ( cb.length === 0 ) ? ( done ) => {
            raw_cb(); done();
        } : raw_cb;

        this._result_file = path.resolve( this._dst, `${name.replace( / /g, '_' )}.json` );
        const data = this._report.tests[name] || this._load();
        const full_name = `${this._name}/${name}`;

        this._log( '---' );
        this._log( `Test ${full_name}` );
        this._log( `Calibrating...` );
        const calib_start = start_time();
        test_cb( () => {
            const calib_time = diff_time( calib_start );
            const calib_count = parseInt( this._test_time / calib_time ) || 1;
            let recalib_count = calib_count;
            this._log( `Calibration result: ${( 1/calib_time ).toFixed( 3 )}Hz, ${calib_count} cycles` );

            const warmup = () => {
                this._log( `Warming up...` );
                recalib_count = parseInt( calib_count * this._warmup_ratio ) || 1;
                let i = recalib_count;
                let recalib_time = 0;

                const iterate = () => {
                    const recalib_start = start_time();

                    test_cb( () => {
                        recalib_time += diff_time( recalib_start );

                        if ( i-- > 0 ) {
                            setImmediate( iterate );
                        } else {
                            recalib_time /= recalib_count;
                            recalib_count = parseInt( this._test_time / recalib_time ) || 1;
                            this._log( `Re-calibration result: ${( 1/recalib_time ).toFixed( 3 )}Hz, ${recalib_count} cycles` );
                            benchmark( recalib_time );
                        }
                    } );
                };

                iterate();
            };

            const benchmark = () => {
                const count = recalib_count;

                let i = 0;
                let min = 0xFFFFFFF;
                let max = 0;
                let total = 0;

                const iterate = () => {
                    const iter_start = start_time();
                    test_cb( () => {
                        const iter_time = diff_time( iter_start );
                        total += iter_time;

                        if ( iter_time > 0 ) {
                            min = Math.min( min, iter_time );
                            max = Math.max( max, iter_time );
                        }

                        if ( ++i >= count ) {
                            const bench_time = diff_time( bench_start );
                            const avg = total/count;
                            const avg_hz = 1 / avg;
                            const min_hz = 1 / min;
                            const max_hz = 1 / max;

                            const new_pass = {
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
                            const prev_pass = data.current;

                            if ( prev_pass ) {
                                for ( let m of [ 'total', 'avg', 'min', 'max', 'bench_time' ] ) {
                                    prev_pass[m] = Math.min( prev_pass[m], new_pass[m] );
                                }

                                for ( let m of [ 'count', 'avg_hz', 'min_hz', 'max_hz' ] ) {
                                    prev_pass[m] = Math.max( prev_pass[m], new_pass[m] );
                                }
                            } else {
                                data.current = new_pass;
                            }

                            if ( this._final_pass ) {
                                const current = data.current;
                                this._log( `Benchmark result:` );
                                this._log( `  avg:    ${current.avg}s    ${current.avg_hz.toFixed( 3 )}Hz` );
                                this._log( `  min:    ${current.min}s    ${current.min_hz.toFixed( 3 )}Hz` );
                                this._log( `  max:    ${current.max}s    ${current.max_hz.toFixed( 3 )}Hz` );
                            } else {
                                this._log( `Deferred result, not the last pass.` );
                            }

                            setImmediate( profile );
                        } else {
                            setImmediate( iterate );
                        }
                    } );
                };

                this._log( `Benchmarking...` );
                const bench_start = start_time();
                iterate();
            };

            const profile = () => {
                if ( !this._do_profile ) {
                    complete();
                    return;
                }

                this._log( `Profiling...` );
                let i = parseInt( recalib_count * this._profile_ratio ) || 1;

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
                if ( !this._final_pass ) {
                    setImmediate( test_done );
                    return;
                }

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
                        current[`${m}_diff_base`] = diff;
                        current[`${m}_diff_base_hz`] = diff_hz;
                        current[`${m}_diff_base_pct`] = percent;
                        this._log( `  ${m}:    ${percent.toFixed( 3 )}%    ${diff}s    ${diff_hz.toFixed( 3 )}Hz` );
                    }

                    this._log( `Comparison to best:` );

                    for ( let m of [ 'avg', 'min', 'max' ] ) {
                        const diff = current[m] - best[m];
                        const diff_hz = current[`${m}_hz`] - best[`${m}_hz`];
                        const percent = diff / best[m] * 100;
                        current[`${m}_diff_best`] = diff;
                        current[`${m}_diff_best_hz`] = diff_hz;
                        current[`${m}_diff_best_pct`] = percent;
                        this._log( `  ${m}:    ${percent.toFixed( 3 )}%    ${diff}s    ${diff_hz.toFixed( 3 )}Hz` );
                    }
                }

                this._report.tests[name] = data;
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
        fs.writeFileSync( tmp, JSON.stringify( stored, null, 4 ) );
        fs.renameSync( tmp, this._result_file );
    }
}

module.exports = exports = function( ...args ) {
    return new OptiHelper( ...args );
};

exports.OptiHelper = OptiHelper;
