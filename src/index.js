/* jslint esversion:6 */

import 'font-awesome/css/font-awesome.css';

import 'leaflet';
import 'leaflet/dist/leaflet.css';

import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import 'leaflet-providers';

import 'leaflet-easybutton';
import 'leaflet-easybutton/src/easy-button.css';

import 'leaflet-fa-markers';
import 'leaflet-fa-markers/L.Icon.FontAwesome.css';

import io from 'socket.io-client';

import Vue from 'vue';
import Vuex from 'vuex';

/** custom CSS */
import './map.css';


/** frontend entry point */

Vue.use(Vuex);


// we have four primary objects: the Leaflet Map (map), the SocketIO
// Socket (socket), the Vuex Store (store), a bunch of Vue components
// as View Models which wrap leaflet things, and the top level Vue
// View Model (vm)

const map = L.map('map').fitWorld().addLayer(L.tileLayer.provider('OpenStreetMap.Mapnik'));
const socket = io();

const store = new Vuex.Store({
    state: {
        status: "unknown",
        test_row: {
            backgroundColor: 'white',
            foregroundColor: 'black',
            iconClasses: 'fa-info-circle',
            lat: 45,
            lng: -71,
            popupContent: "howdy from test module"
        },
	rows: ["test_row"]
    },
    mutations: {
        update_status(state, val) {
            state.status = val.status;
        },
        update_icon(state, val) {
            state[val.marker_id] = {
                backgroundColor: val.backgroundColor,
                foregroundColor: val.foregroundColor,
                iconClasses: val.iconClasses,
                lat: val.lat,
                lng: val.lng,
                popupContent: val.popupContent
            };
        }
    }
});


/**------------ VIEW MODELS ------------*/

/**
 * a view model for a leaflet control acting as a status indicator.
 * binds the "status" property of the vuex store to the leaflet
 * control's HTML.
 */
var StatusModel = Vue.component('status-vm', {
    computed: {
	/**
         * a property which creates the status bar created in the
         * upper right corner of the map.
         */
        info_box: function () {
	    let control = new L.Control({
                position: 'topright'
	    });
	    let control_div = L.DomUtil.create('div', 'info',
					       control.getContainer());
	    control.onAdd = function (aMap) {
                return control_div;
	    };
	    control.onRemove = function (aMap) {
                L.DomUtil.remove(control_div);
	    };
	    control.addTo(map);
	    return control;
        }
    },
    render: function (createElement) {
        const state = this.$store.state;
        let container = this.info_box.getContainer();
        if (container) {
            container.innerHTML = state.status;
        }
        return createElement();
    }
});

/**
 * a view model for a leaflet marker cluster group. creates child
 * components representing markers for each element of the "rows"
 * property in the vuex store.
 */
var MarkerClusterModel = Vue.component('cluster-vm', {
    computed: {
	/** 
     	 * the cluster marker layer which holds all markers on the map.
     	 */
     	markers_layer: function() {
     	    let layer = new L.markerClusterGroup();
     	    layer.addTo(map);
     	    return layer;
     	}
    },
    render: function (createElement) {
	const state = this.$store.state;
	const layer = this.markers_layer;
	return createElement(
	    'div', // placeholder element
	    // make a new MarkerModel for every row_id in rows
	    state.rows.map(function(row_id){
		return createElement(
		    MarkerModel,
		    {
			props: {
			    marker_id: row_id,
			    parent_layer: layer
			}
		    });
	    })
	);
    }
});

/**
 * a view model for a leaflet marker. binds to an object representing
 * a row of the spreadsheet in the vuex store.
 */
var MarkerModel = Vue.component('marker-vm', {
    props: {
	parent_layer: {
	    type: L.MarkerClusterGroup,
	    required: true
	},
        marker_id: {
            type: String,
            required: true
        }
    },
    computed: {
	/** the marker this view model wraps */
	marker: function() {
	    // using placeholder lat/lng and empty popup for now
	    return L.marker([0, 0]).bindPopup('');
	}
    },
    created: function() {
	this.parent_layer.addLayer(this.marker);
    },
    destroyed: function() {
	this.parent_layer.removeLayer(this.marker);
    },
    render: function (createElement) {
        const state = this.$store.state;
        let val = state[this.marker_id];
        let marker = this.marker;

        marker.setLatLng([val.lat, val.lng]);
        let opts = {
            markerColor: val.backgroundColor,
            iconColor: val.foregroundColor,
            iconClasses: 'fa ' + val.iconClasses
        };
        marker.setIcon(L.icon.fontAwesome(opts));
        marker.setPopupContent(val.popupContent);

        this.parent_layer.refreshClusters(marker);

        return createElement();
    }
});


/**
 * the Vue main object. instantiates child components to make and
 * manage leaflet things (currently a top level status indicator and a
 * marker cluster layer)
 */
const vm = new Vue({
    store,
    render: function (createElement) {
        return createElement(
	    'div', // placeholder
	    [createElement(StatusModel),
	     createElement(MarkerClusterModel)]
	);
    }
});

vm.$mount();

// for debugging!!
window.vm = vm;


/**


declare global {
    interface Window {
        cluster: any,
        infoControl: any,
        map: any,
        popup: any,
        socket: any,
        myCircle: any,
        markers: any
    }
}

var map_fn = function () {
    let map = L.map('map').fitWorld();
    L.tileLayer.provider('OpenStreetMap.Mapnik').addTo(map);
    map.setZoom(13);
    map.setView([41.48, -71.31], undefined);

    // locate button
    L.easyButton('fa-crosshairs fa-lg',
        function () {
            map.locate({
                setView: true,
                maxZoom: 16
            });
        }).addTo(map);

    // sidewalk marker cluster
    window.cluster = L.markerClusterGroup({
        iconCreateFunction: function (cluster) {
            var markers = cluster.getAllChildMarkers();
            var childCount = cluster.getChildCount();
            var cluster_class = "partial";
            for (var ii = 0; ii < markers.length; ii++) {
                var m = markers[ii];
                if (!(<any>m).data) {
                    cluster_class = "unknown";
                    break;
                } else {
                    if (!(<any>m).data["Verified Status"].toUpperCase().includes("Y")) {
                        if (cluster_class === "verified") {
                            cluster_class = "partial";
                            break;
                        } else {
                            cluster_class = "unverified";
                            continue;
                        }
                    } else {
                        if (cluster_class === "unverified") {
                            cluster_class = "partial";
                            break;
                        } else {
                            cluster_class = "verified";
                            continue;
                        }
                    }

                }
            }

            return new L.DivIcon({
                html: '<div><span>' + childCount + '</span></div>',
                className: 'marker-cluster marker-cluster-' + cluster_class,
                iconSize: new L.Point(40, 40)
            });
        }
    });
    window.cluster.addTo(map);

    // connection status
    var info = new L.Control();

    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info');
        this.updateConnectionStatus("disconnected");
        return this._div;
    };
    (<any>info).updateConnectionStatus = function (status) {
        if (status.toUpperCase() === "CONNECTED".toUpperCase()) {
            this._div.innerHTML = '<h4>connected</h4>'
        } else {
            this._div.innerHTML = '<h4>disconnected</h4>'
        }
    };
    info.addTo(map);
    window.infoControl = info;

    // map legend
    var legend = new L.Control({
        position: 'bottomright'
    });

    legend.onAdd = function (map) {

        var div = L.DomUtil.create('div', 'info legend'),
            status = ["Verified", "Not Verified", "Cluster contains both"],
            colors = ["green", "blue", "orange"];

        for (var i = 0; i < status.length; i++) {
            div.innerHTML +=
                '<i style="background:' + colors[i] + '"></i> ' +
                status[i] + (status[i + 1] ? '<br>' : '');
        }
        return div;
    };

    legend.addTo(map);

    // global variables
    window.map = map;
    window.popup = L.popup();


    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);
    map.on('contextmenu', onMapPress);

    socket.on('connect', onSocketConnect)
        .on('disconnect', onSocketDisconnect)
        .on('data', onDataReceived)
        .on('data_update', onUpdateReceived)
        .on('data_removed', onRemovedReceived)
        .on('data_response', onResponseReceived);
    window.socket = socket;

}

function onMapPress(e) {
    window.popup.setLatLng(e.latlng)
        .setContent("TODO: allow field submissions")
        .openOn(window.map);
}

function onLocationFound(e) {
    var radius = e.accuracy / 2;
    if (window.myCircle == null) {
        window.myCircle = L.circle(e.latlng, radius)
            .addTo(window.map)
            .bindPopup("Your reported location").openPopup();
    } else {
        window.myCircle.setLatLng(e.latlng);
        window.myCircle.setRadius(radius);
        window.map.openPopup(window.myCircle.getPopup());
    }
}

function onLocationError(e) {
    alert(e.message);
}

function onSocketConnect() {
    console.log('connected');
    window.infoControl.updateConnectionStatus('CONNECTED');
}

function onSocketDisconnect() {
    console.log('disconnected');
    window.infoControl.updateConnectionStatus('DISCONNECTED');
}

function onSubmissionButton(e) {
    console.log('submitting: ');
    console.log(e);
    if (window.socket) {
        window.socket.emit('submission', e);
    }
}

function onDataReceived(e) {
    if (window.markers) {
        for (var ii = 0; ii < window.markers.length; ii++) {
            window.cluster.removeLayer(window.markers[ii]);
        }
    }
    window.markers = [];
    var data = JSON.parse(e);
    for (var ii = 0; ii < data.length; ii++) {
        var m = buildMarker(ii, data[ii], undefined);
        window.markers[ii] = m;
        window.cluster.addLayer(m);
    }
}

function onUpdateReceived(e) {
    var data = JSON.parse(e);
    console.log(data);
    for (var ix in data) {
        console.log("updating ix " + ix);
        var m = buildMarker(ix, data[ix], window.markers[ix]);
        if (window.markers[ix]) {
            window.cluster.refreshClusters(m);
        } else {
            window.markers[ix] = m;
            window.cluster.addLayer(m);
        }
    }
}

function onRemovedReceived(e) {
    var data = e;
    console.log(data);
    for (var ix in data) {
        console.log("removing ix " + data[ix]);
        var actual_ix = window.markers.length + data[ix];
        if (window.markers[actual_ix]) {
            var m = window.markers[actual_ix];
            console.log("removing " + actual_ix);
            window.cluster.removeLayer(m);
            window.markers[actual_ix] = undefined;
        }
    }
}

function onResponseReceived(e) {
    console.log('response');
    console.log(e);
}

function buildMarker(key, data, prevMarker) {
    var marker;
    if (prevMarker) {
        marker = prevMarker;
    } else {
        marker = L.marker([data["Latitude"], data["Longitude"]]).bindPopup("");
    }
    marker.setLatLng([data["Latitude"], data["Longitude"]]);
    marker.data = data;
    var opts = <any>{};
    opts.iconColor = "white";
    if (data["Verified Status"] && data["Verified Status"] == "Y") {
        opts.markerColor = "green";
    } else {
        opts.markerColor = "blue";
    }
    if (data["Pedestrian Markings"] &&
        data["Pedestrian Markings"].toUpperCase() !== "unmarked".toUpperCase()) {
        opts.iconClasses = "fa fa-times"
    } else {
        opts.iconClasses = "fa fa-exchange"
    }

    marker.setIcon((<any>L.icon).fontAwesome(opts));
    marker.setPopupContent(buildPopupContent(key, data));
    return marker;
}

function buildPopupContent(key, data) {
    // the popup we're building 
    var div = L.DomUtil.create('div', 'info gis');

    // notes
    L.DomUtil.create('br', undefined, div);
    var notes = L.DomUtil.create('label', 'notes', div);
    notes.innerHTML = "Notes: " + data["Notes"] + "<br>";

    // create click handlers for logging data

    // verified status
    var verify = L.DomUtil.create('label', 'switch', div);
    verify.innerHTML = "Verified Status";
    var vcheckbox = L.DomUtil.create('input', 'slider', verify);
    vcheckbox.setAttribute("type", "checkbox");
    if (data["Verified Status"] && data["Verified Status"].toUpperCase() === "Y") {
        (<any>vcheckbox).checked = true;
    }

    // pedestrian markings
    L.DomUtil.create('br', undefined, div);
    var markings = L.DomUtil.create('label', 'switch', div);
    markings.innerHTML = "Pedestrian Markings";
    var mcheckbox = L.DomUtil.create('input', 'slider', markings);
    mcheckbox.setAttribute("type", "checkbox");
    if (data["Pedestrian Markings"] && data["Pedestrian Markings"].toUpperCase() === "Y") {
        (<any>mcheckbox).checked = true;
    }

    // crossing signal
    L.DomUtil.create('br', undefined, div);
    var signal = L.DomUtil.create('label', 'switch', div);
    signal.innerHTML = "Crossing Signal";
    var scheckbox = L.DomUtil.create('input', 'slider', signal);
    scheckbox.setAttribute("type", "checkbox");
    if (data["Crossing Signal"] && data["Crossing Signal"].toUpperCase() === "Y") {
        (<any>scheckbox).checked = true;
    }


    // other features
    L.DomUtil.create('br', undefined, div);
    var other = L.DomUtil.create('label', 'notes', div);
    other.innerHTML = "Other Features: ";
    var otherInput = L.DomUtil.create('input', 'notes', other);
    otherInput.setAttribute("type", "text");
    otherInput.setAttribute("placeholder", data["Other Features"]);

    // submit
    var otherSubmit = L.DomUtil.create('button', 'submit', div);
    otherSubmit.innerHTML = "Save";
    otherSubmit.onclick = function (e) {
        onSubmissionButton({
            row: key,
            lat: data["Latitude"],
            lon: data["Longitude"],
            verified: (<any>vcheckbox).checked,
            markings: (<any>mcheckbox).checked,
            signal: (<any>scheckbox).checked,
            other: (<any>otherInput).value
        });
    };

    return div;
}
$(map_fn);

*/
