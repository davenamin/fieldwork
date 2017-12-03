/* jslint esversion:6 */
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import io from 'socket.io-client';
import vm from './map.js';


/** frontend entry point */

// ---- html strings, using bootstrap. these are shown dynamically ---- /
const create_bootstrap_alert = (alert_type, string_content) => {
    return `
<div class="alert alert-${alert_type} alert-dismissible">
  ${string_content}
  <button type="button" class="close" 
   data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
</div>
`;
};
const connected_html = create_bootstrap_alert('success', 'CONNECTED');
const disconnected_html = create_bootstrap_alert('danger', 'DISCONNECTED');

// ---- vuex module, representing actions that manipulate leaflet ---- /
const vuex_logic = {
    actions: {
	connected(context) {
	    context.commit('set_status', connected_html);
	},
	disconnected(context) {
	    context.commit('set_status', disconnected_html);
	}
    }
};

// add these behaviors to the map's vuex store
vm.$store.registerModule('main', vuex_logic);



// ---- map setup stuff ---- /
let legend = {'Verified': 'green',
	      'Not Verified': 'blue',
	      'Cluster contains both': 'orange'};

vm.set_legend(legend);


// ---- socket io setup stuff ---- /
let socket = io();
socket.on('connect', () => vm.$store.dispatch('connected'))
    .on('disconnect', () => vm.$store.dispatch('disconnected'));


// ---- debugging stuff ---- /
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
