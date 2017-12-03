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

const create_popup_content = (data) => {
    return JSON.stringify(data);
};

// ---- leaflet specific stuff - building the markers out ---- /
const build_marker_opts = (id, data) => {
    let lat = data.Latitude ? data.Latitude : 0;
    let lon = data.Longitude ? data.Longitude : 0;
    let iconOpts = build_icon_opts(data);
    let popupContent = create_popup_content(data);
return {
    marker_id: id,
    latlng: [lat, lon],
    popup: popupContent,
    icon: iconOpts
};
};

const build_icon_opts = (data) => {
    return {
        markerColor: 'white',
        iconColor: 'black',
        iconClasses: 'fa fa-info-circle'
    };
};

// ---- vuex module, representing actions that manipulate leaflet ---- /
const vuex_logic = {
    actions: {
	connected(context) {
	    context.commit('set_status', connected_html);
	},
	disconnected(context) {
	    context.commit('set_status', disconnected_html);
	},
	set_data(context, data_str) {
	    if (!data_str) {
		// noop
		return;
	    }
	    let data = JSON.parse(data_str);
	    // capture all of the ids in the data to show everything
	    let row_ids = [];
	    for (let row in data) {
		row_ids.push(row);
		context.commit('set_marker_opts',
			       build_marker_opts(row, data[row]));
	    }
	    // also need to set the displayed markers
	    context.commit('set_markers', row_ids);
	},
	update_data(context, data_str) {
	    if (!data_str) {
		// noop
		return;
	    }
	    let data = JSON.parse(data_str);
	    for (let row in data) {
		context.commit('set_marker_opts',
			       build_marker_opts(row, data[row]));
	    }
	},
	remove_ids(context, del_ids) {
	    if (!del_ids) {
		// noop
		return;
	    }
	    let cur_ids = context.rootState.marker_ids;
	    // ids are passed in as offsets from total length
	    let total_length = cur_ids.length;
	    del_ids = del_ids.map((offset) => offset + total_length);

	    // strip out the given ids
	    let new_ids = cur_ids.filter((id) => del_ids.indexOf(id) < 0);
	    context.commit('set_markers', new_ids);
	}
    }
};

// add these behaviors to the map's vuex store
vm.$store.registerModule('main', vuex_logic);



// ---- map setup stuff ---- /
let legend = {'Verified': 'green',
	      'Not Verified': 'blue',
	      'Cluster contains both': 'orange'};

vm.$store.commit('set_legend', legend);


// ---- socket io setup stuff ---- /
let socket = io();
socket
    .on('connect', () => vm.$store.dispatch('connected'))
    .on('disconnect', () => vm.$store.dispatch('disconnected'))
    .on('all_data', (data) => vm.$store.dispatch('set_data', data))
    .on('data_updated', () => vm.$store.dispatch('update_data'))
    .on('data_removed', (ids) => vm.$store.dispatch('remove_ids', ids))
    .on('data_response', () => vm.$store.dispatch('data_response'));


// ---- debugging stuff ---- /
vm.$store.commit('set_marker_opts', {
    marker_id: 'test_row',
    latlng: [45, -71],
    popup: 'DOES IT WORK',
    icon:{
            markerColor: 'white',
            iconColor: 'black',
            iconClasses: 'fa fa-info-circle'
    }
});

// for debugging!
window.vm = vm;
