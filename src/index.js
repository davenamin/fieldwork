/* jslint esversion:6 */
import io from 'socket.io-client';
import vm from './map.js';

/** frontend entry point */
vm.set_marker_opts({
    marker_id: 'test_row',
    latlng: [45, -71],
    popupContent: 'DOES IT WORK',
    iconOpts:{
            markerColor: 'white',
            iconColor: 'black',
            iconClasses: 'fa fa-info-circle'
    }
});

// for debugging!
window.vm = vm;
