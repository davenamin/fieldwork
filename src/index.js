/* jslint esversion:6 */
import io from 'socket.io-client';
import vm from './map.js';

/** frontend entry point */



const vuex_logic = {
    actions: {
	connected(context) {
	    context.commit('set_status', 'CONNECTED');
	},
	disconnected(context) {
	    context.commit('set_status', 'DISCONNECTED');
	}
    }
};

// add these behaviors to the map's vuex store
vm.$store.registerModule('main', vuex_logic);



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

var legend = {'Verified': 'green',
	      'Not Verified': 'blue',
	      'Cluster contains both': 'orange'};

vm.set_legend(legend);

// for debugging!
window.vm = vm;
