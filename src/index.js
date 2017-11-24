/* jslint esversion:6 */

import io from 'socket.io-client';
import vm from './map.js';

/** frontend entry point */
vm.set_marker_opts({
    marker_id: 'test_row',
    popupContent: 'DOES IT WORK'});

// for debugging!
window.vm = vm;
