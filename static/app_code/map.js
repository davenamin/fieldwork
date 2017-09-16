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

    window.map = map;
    window.popup = L.popup();

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);
    map.on('contextmenu', onMapPress);
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