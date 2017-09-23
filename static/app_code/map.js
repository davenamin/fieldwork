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
    window.cluster = L.markerClusterGroup();
    window.cluster.addTo(map);
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
}

function onSocketDisconnect() {
    console.log('disconnected');
}

function onDataReceived(e) {
    if (!window.markers) {
        window.markers = [];
    }
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
        window.cluster.removeLayer(m);
        window.cluster.addLayer(m);
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
        marker = L.marker();
    }
    marker.setLatLng([data.Latitude, data.Longitude]);
    return marker;
}