'use strict';

const optihelp = require( '../optihelp' );
const expect = require( 'chai' ).expect;
const rimraf = require( 'rimraf' );

const FAKE_RESULT_DIR = '/tmp/fake_optihelp_result';

describe( 'OptiHelper', function() {
    before( ( done ) => {
        rimraf( FAKE_RESULT_DIR, done );
    } );

    after( ( done ) => {
        rimraf( FAKE_RESULT_DIR, done );
    } );

    const test_conf = {
        dst_root : FAKE_RESULT_DIR,
        test_time : 2,
        check_prod : false,
    };

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
        } );
    } );

    it ( 'should run repeated tests', function( test_done ) {
        this.timeout( 60e3 );
        const tconf = Object.assign( { do_profile: true }, test_conf );
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
        suite.start( () => {
            for ( let i = logs.length - 1; i >= 0; --i ) {
                logs[i] = logs[i]
                    .replace( / [^ ]+Hz/, ' 123.456Hz' )
                    .replace( / [0-9-][^ ]*s/, ' 0.123456s' )
                    .replace( / [0-9-][^ ]*%/, ' 0.123%' )
                    .replace( / [^ ]+ cycles/, ' 100 cycles' );
            }

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
                'Profiling...',
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
                'Profiling...',
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
            test_done();
        } );
    } );

    it ( 'should check for production', function() {
        expect( () => optihelp( 'Test' ) ).to.throw( 'Please run with NODE_ENV=production' );
    } );
} );

