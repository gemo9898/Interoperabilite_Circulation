document.addEventListener('DOMContentLoaded', function() {
    const map = L.map('map').setView([48.6921, 6.1844], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© [OpenStreetMap](http://www.openstreetmap.org/copyright)'
    }).addTo(map);

    
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
        var userLat = position.coords.latitude;
        var userLng = position.coords.longitude;

        
        map.setView([userLat, userLng], 13);

        
        L.marker([userLat, userLng]).addTo(map)
            .bindPopup('Vous êtes ici!').openPopup();
    }, function(error) {
        console.error("Erreur: ", error);
    });
} else {
    alert("Votre navigateur ne supporte pas la géolocalisation");
}
    
    fetch('https://api.cyclocity.fr/contracts/nancy/gbfs/gbfs.json')
        .then(response => response.json())
        .then(gbfsData => {
            
            const stationInfoUrl = gbfsData.data.fr.feeds.find(feed => feed.name === 'station_information').url;
            const stationStatusUrl = gbfsData.data.fr.feeds.find(feed => feed.name === 'station_status').url;

            
            return Promise.all([
                fetch(stationInfoUrl).then(response => response.json()),
                fetch(stationStatusUrl).then(response => response.json())
            ]);
        })
        .then(([stationInfo, stationStatus]) => {
            
            const stations = stationInfo.data.stations.map(station => {
                const status = stationStatus.data.stations.find(s => s.station_id === station.station_id);
                return {
                    ...station,
                    available_bikes: status.num_bikes_available,
                    available_bike_stands: status.num_docks_available
                };
            });

            
            stations.forEach(station => {
                const marker = L.marker([station.lat, station.lon]).addTo(map);
                marker.bindPopup(`Station: ${station.name}<br>Vélos disponibles: ${station.available_bikes}<br>Places libres: ${station.available_bike_stands}`);
            });
        })
        .catch(error => console.error('Erreur:', error));
});