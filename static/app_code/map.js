/** main logic for client-side */
map_fn = function () {
    var map = L.map('map').fitWorld();
    L.tileLayer.provider('OpenStreetMap.Mapnik').addTo(map);
    map.setZoom(13);
    map.setView([41.48, -71.31]);

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
                if (!m.data) {
                    cluster_class = "unknown";
                    break;
                } else {
                    if (!m.data["Verified Status"].toUpperCase().includes("Y")) {
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
    var info = L.control();

    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info');
        this.updateConnectionStatus("disconnected");
        return this._div;
    };
    info.updateConnectionStatus = function (status) {
        if (status.toUpperCase() === "CONNECTED".toUpperCase()) {
            this._div.innerHTML = '<h4>connected</h4>'
        } else {
            this._div.innerHTML = '<h4>disconnected</h4>'
        }
    };
    info.addTo(map);
    window.infoControl = info;

    // map legend
    var legend = L.control({
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

    var socket = io();
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
        .setContent("hi")
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
    console.log('submitting: ' + e);
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
    data = JSON.parse(e);
    for (var ii = 0; ii < data.length; ii++) {
        var m = buildMarker(data[ii]);
        window.markers[ii] = m;
        window.cluster.addLayer(m);
    }
}

function onUpdateReceived(e) {
    data = JSON.parse(e);
    console.log(data);
    for (var ix in data) {
        console.log("trying ix " + ix);
        var m = buildMarker(data[ix], window.markers[ix]);
        if (window.markers[ii]) {
            window.cluster.refreshClusters(m);
        } else {
            window.markers[ix] = m;
            window.cluster.addLayer(m);
        }
    }
}

function onRemovedReceived(e) {
    data = e;
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

function buildMarker(data, prevMarker) {
    var marker;
    if (prevMarker) {
        marker = prevMarker;
    } else {
        marker = L.marker().bindPopup("");
    }
    marker.setLatLng([data["Latitude"], data["Longitude"]]);
    marker.data = data;
    var opts = {};
    if (data["Verified Status"] && data["Verified Status"] == "Y") {
        opts.markerColor = "green";
    } else {
        opts.markerColor = "blue";
    }
    if (data["Pedestrian Markings"] &&
        data["Pedestrian Markings"].toUpperCase() !== "unmarked".toUpperCase()) {
        opts.icon = "times"
    } else {
        opts.icon = "exchange"
    }

    marker.setIcon(L.VectorMarkers.icon(opts));
    marker.setPopupContent(buildPopupContent(data));
    return marker;
}

function buildPopupContent(data) {
    var div = L.DomUtil.create('div', 'info gis');
    div.innerHTML = "Verified: " + data["Verified Status"] + "<br>" +
        "Pedestrian Markings: " + data["Pedestrian Markings"] + "<br>" +
        "Crossing Signal: " + data["Crossing Signal"] + "<br>" +
        "Other Features: " + data["Other Features"] + "<br>" +
        "Notes: " + data["Notes"];
    return div;
}