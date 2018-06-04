'use strict';

const { OptiHelper } = require( '../optihelp' );
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

    it ( 'should run tests', function( test_done ) {
        this.timeout( 30e3 );
        const suite = new OptiHelper( 'Some Suite', FAKE_RESULT_DIR, { test_time : 2 } );

        suite.test( 'Test A', () => {
            for ( let c = 1000; c > 0; --c ) {
                // pass
            }
        } );
        suite.test( 'Test B', ( done ) => {
            setTimeout( done, 100 );
        } );
        suite.start( test_done );
    } );

    it ( 'should run repeated tests', function( test_done ) {
        this.timeout( 30e3 );
        const suite = new OptiHelper( 'Some Suite', FAKE_RESULT_DIR, { test_time : 2 } );

        suite.test( 'Test A', () => {
            for ( let c = 1000; c > 0; --c ) {
                // pass
            }
        } );
        suite.test( 'Test B', ( done ) => {
            setTimeout( done, 100 );
        } );
        suite.start( test_done );
    } );
} );

