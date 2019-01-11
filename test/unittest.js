'use strict';

const optihelp = require( '../optihelp' );
const expect = require( 'chai' ).expect;
const rimraf = require( 'rimraf' );
const fs = require( 'fs' );

const FAKE_RESULT_DIR = '/tmp/fake_optihelp_result';
const REPORT_FILE = 'optihelp-report.json';

describe( 'OptiHelper', function() {
    const cleanup = ( done ) => {
        rimraf( FAKE_RESULT_DIR, () => {
            rimraf( REPORT_FILE, done );
        } );
    };

    before( cleanup );
    after( cleanup );

    const test_conf = {
        dst_root : FAKE_RESULT_DIR,
        test_time : 2,
        check_prod : false,
        pass: 1,
    };


    it ( 'should check for production', function() {
        expect( () => optihelp( 'Test' ) ).to.throw( 'Please run with NODE_ENV=production' );
    } );

    it ( 'should check for duplicate test name', function() {
        expect( () => optihelp( 'Test', { check_prod: false } ).test( 'A' ).test( 'A' ) )
            .to.throw( 'Test "A" already exists!' );
    } );

    it ( 'should run tests', function( test_done ) {
        this.timeout( 60e3 );
        const suite = optihelp( 'Some Suite', test_conf );

        const logs = [];
        suite._log = ( msg ) => logs.push( msg );

        suite.test( 'Test A', () => {
            for ( let c = 1000; c > 0; --c ) {
                // pass
            }
        } );
        suite.test( 'Test B', ( done ) => {
            setTimeout( done, 100 );
        } );
        suite.start( () => {
            for ( let i = logs.length - 1; i >= 0; --i ) {
                logs[i] = logs[i]
                    .replace( / [^ ]+Hz/, ' 123.456Hz' )
                    .replace( / [0-9-][^ ]+s/, ' 0.123456s' )
                    .replace( / [^ ]+ cycles/, ' 100 cycles' );
            }

            try {
                expect( logs ).to.eql( [
                    '---',
                    'Test Some Suite/Test A',
                    'Calibrating...',
                    'Calibration result: 123.456Hz, 100 cycles',
                    'Warming up...',
                    'Re-calibration result: 123.456Hz, 100 cycles',
                    'Benchmarking...',
                    'Benchmark result:',
                    '  avg:    0.123456s    123.456Hz',
                    '  min:    0.123456s    123.456Hz',
                    '  max:    0.123456s    123.456Hz',
                    'No results to compare yet.',
                    '',
                    '---',
                    'Test Some Suite/Test B',
                    'Calibrating...',
                    'Calibration result: 123.456Hz, 100 cycles',
                    'Warming up...',
                    'Re-calibration result: 123.456Hz, 100 cycles',
                    'Benchmarking...',
                    'Benchmark result:',
                    '  avg:    0.123456s    123.456Hz',
                    '  min:    0.123456s    123.456Hz',
                    '  max:    0.123456s    123.456Hz',
                    'No results to compare yet.',
                    '',
                ] );
                test_done();
            } catch (e) {
                test_done(e);
            }
        } );
    } );

    it ( 'should run repeated tests', function( test_done ) {
        this.timeout( 60e3 );
        const tconf = Object.assign( test_conf, {
            do_profile: true,
            report_file: REPORT_FILE,
        } );
        const suite = optihelp( 'Some Suite', tconf );

        const logs = [];
        suite._log = ( msg ) => logs.push( msg );

        suite.test( 'Test A', () => {
            for ( let c = 1000; c > 0; --c ) {
                // pass
            }
        } );
        suite.test( 'Test B', ( done ) => {
            setTimeout( done, 100 );
        } );
        suite.start( ( report_obj ) => {
            for ( let i = logs.length - 1; i >= 0; --i ) {
                logs[i] = logs[i]
                    .replace( / [^ ]+Hz/, ' 123.456Hz' )
                    .replace( / [0-9-][^ ]*s/, ' 0.123456s' )
                    .replace( / [0-9-][^ ]*%/, ' 0.123%' )
                    .replace( / [^ ]+ cycles/, ' 100 cycles' );
            }

            try {
                expect( logs ).to.eql( [
                    '---',
                    'Test Some Suite/Test A',
                    'Calibrating...',
                    'Calibration result: 123.456Hz, 100 cycles',
                    'Warming up...',
                    'Re-calibration result: 123.456Hz, 100 cycles',
                    'Benchmarking...',
                    'Benchmark result:',
                    '  avg:    0.123456s    123.456Hz',
                    '  min:    0.123456s    123.456Hz',
                    '  max:    0.123456s    123.456Hz',
                    '"v8-profiler" module is missing',
                    'Comparison to base:',
                    '  avg:    0.123%    0.123456s    123.456Hz',
                    '  min:    0.123%    0.123456s    123.456Hz',
                    '  max:    0.123%    0.123456s    123.456Hz',
                    'Comparison to best:',
                    '  avg:    0.123%    0.123456s    123.456Hz',
                    '  min:    0.123%    0.123456s    123.456Hz',
                    '  max:    0.123%    0.123456s    123.456Hz',
                    '',
                    '---',
                    'Test Some Suite/Test B',
                    'Calibrating...',
                    'Calibration result: 123.456Hz, 100 cycles',
                    'Warming up...',
                    'Re-calibration result: 123.456Hz, 100 cycles',
                    'Benchmarking...',
                    'Benchmark result:',
                    '  avg:    0.123456s    123.456Hz',
                    '  min:    0.123456s    123.456Hz',
                    '  max:    0.123456s    123.456Hz',
                    '"v8-profiler" module is missing',
                    'Comparison to base:',
                    '  avg:    0.123%    0.123456s    123.456Hz',
                    '  min:    0.123%    0.123456s    123.456Hz',
                    '  max:    0.123%    0.123456s    123.456Hz',
                    'Comparison to best:',
                    '  avg:    0.123%    0.123456s    123.456Hz',
                    '  min:    0.123%    0.123456s    123.456Hz',
                    '  max:    0.123%    0.123456s    123.456Hz',
                    '',
                ] );

                const report = JSON.parse( fs.readFileSync( REPORT_FILE ) );

                expect( report ).to.eql( report_obj );

                expect( report ).to.have.keys( 'name', 'model', 'ver_hash', 'node_ver', 'date', 'tests' );
                expect( report.tests ).to.have.keys( 'Test A', 'Test B' );

                expect( report.tests['Test A'] ).to.have.keys( 'stored', 'current' );
                expect( report.tests['Test A'].stored ).to.have.keys( 'base', 'best' );

                expect( report.tests['Test A'].stored.base ).to.have.keys(
                    'total', 'count', 'bench_time',
                    'avg', 'avg_hz',
                    'min', 'min_hz',
                    'max', 'max_hz'
                );

                expect( report.tests['Test A'].current ).to.have.keys(
                    'total', 'count', 'bench_time',
                    'avg', 'avg_hz',
                    'avg_diff_base_hz', 'avg_diff_base_hz', 'avg_diff_base_pct',
                    'avg_diff_best_hz', 'avg_diff_best_hz', 'avg_diff_best_pct',
                    'min', 'min_hz',
                    'min_diff_base_hz', 'min_diff_base_hz', 'min_diff_base_pct',
                    'min_diff_best_hz', 'min_diff_best_hz', 'min_diff_best_pct',
                    'max', 'max_hz',
                    'max_diff_base_hz', 'max_diff_base_hz', 'max_diff_base_pct',
                    'max_diff_best_hz', 'max_diff_best_hz', 'max_diff_best_pct'
                );

                test_done();
            } catch ( e ) {
                test_done( e );
            }
        } );
    } );

    it ( 'should check support OPTIHELP_FILTER', function( test_done ) {
        this.timeout( 60e3 );

        process.env.OPTIHELP_FILTER = [ 'Test A,TestB' ];

        const tconf = Object.assign( test_conf, {
            test_time: 0.1,
        } );

        const suite = optihelp( 'FilterSuite', tconf )
            .test( 'Test A', () => {} )
            .test( 'TestB', () => {} )
            .test( 'Test C', () => {} );

        // Adds bits of coverage & cleans output
        const log_bak = console.log;
        console.log = () => {};

        suite.start( ( report ) => {
            console.log = log_bak;
            delete process.env.OPTIHELP_FILTER;

            try {
                expect( report.tests ).to.have.keys( 'Test A', 'TestB' );
                expect( report.tests ).to.not.have.keys( 'Test C' );
                test_done();
            } catch ( e ) {
                test_done( e );
            }
        } );
    } );

    it ( 'should run multiple passes', function( test_done ) {
        this.timeout( 60e3 );

        const tconf = Object.assign( test_conf, {
            test_time: 0.1,
            pass: 3,
        } );
        let repeat_msg = 0;

        const suite = optihelp( 'RepeatSuite', tconf )
            .test( 'Test A', () => {} );

        suite._log = ( msg ) => {
            if ( msg === '======= REPEAT =======' ) {
                ++repeat_msg;
            }
        };

        suite.start( ( report ) => {
            try {
                expect( repeat_msg ).to.equal( 2 );
                test_done();
            } catch ( e ) {
                test_done( e );
            }
        } );
    } );
} );

