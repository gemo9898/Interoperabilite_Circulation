document.addEventListener('DOMContentLoaded', function() {
    // Initialisation de la carte
    const map = L.map('map').setView([48.6921, 6.1844], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© [OpenStreetMap](http://www.openstreetmap.org/copyright)'
    }).addTo(map);

    // Géolocalisation de l'utilisateur
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            console.log(userLat);
            console.log(userLng);

            // Centrer la carte sur la position de l'utilisateur
            map.setView([userLat, userLng], 13);

            // Ajouter un marqueur pour la position de l'utilisateur
            L.marker([userLat, userLng]).addTo(map)
                .bindPopup('Vous êtes ici!').openPopup();

            // Récupérer le département de l'utilisateur
            fetchDepartment(userLat, userLng);
        }, function(error) {
            console.error("Erreur: ", error);
        });
    } else {
        alert("Votre navigateur ne supporte pas la géolocalisation");
    }

    // Récupération des données des stations de vélos
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

            // Ajouter des marqueurs pour chaque station de vélo
            stations.forEach(station => {
                const marker = L.marker([station.lat, station.lon]).addTo(map);
                marker.bindPopup(`Station: ${station.name}<br>Vélos disponibles: ${station.available_bikes}<br>Places libres: ${station.available_bike_stands}`);
            });
        })
        .catch(error => console.error('Erreur:', error));

    // Fonction pour obtenir le département à partir des coordonnées
    function fetchDepartment(latitude, longitude) {
        const url = `https://api-adresse.data.gouv.fr/reverse/?lon=${longitude}&lat=${latitude}`;
    
        fetch(url)
            .then(response => response.json())
            .then(data => {
                const address = data.features[0].properties;
                const department = address.citycode.substring(0, 2);
                console.log("Département trouvé :", department);
    
                
                fetchCovidData(department);
            })
            .catch(error => console.error('Erreur lors de la récupération du département:', error));
    }

    // Fonction pour récupérer les données sur le Sras dans les eaux usées
    function fetchCovidData(department) {
        const url = "https://www.data.gouv.fr/fr/datasets/r/5c4e1452-3850-4b59-b11c-3dd51d7fb8b5";

        fetch(url)
            .then(response => response.text())
            .then(csvData => {
                const parsedData = Papa.parse(csvData, { header: true });
                const filteredData = parsedData.data.filter(entry => entry.dep === department);
                const dates = filteredData.map(entry => entry.date);
                const txPos = filteredData.map(entry => entry.tx_pos);
                const txIncid = filteredData.map(entry => entry.tx_incid);
                renderChart(dates, txPos, txIncid);
            })
            .catch(error => console.error('Erreur lors de la récupération des données:', error));
    }

    // Fonction pour afficher les données avec Chart.js
    function renderChart(dates, txPos, txIncid) {
        const ctx = document.getElementById('covidChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Taux de positivité',
                        data: txPos,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderWidth: 1
                    },
                    {
                        label: 'Taux d\'incidence',
                        data: txIncid,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
 // Appel à l'API de qualité de l'air
const airQualityApiUrl = "https://services3.arcgis.com/Is0UwT37raQYl9Jj/arcgis/rest/services/ind_grandest/FeatureServer/0/query?where=lib_zone%3D%27Nancy%27&orderByFields=date_ech%20DESC&outFields=*&resultRecordCount=1&f=pjson";

// Réaliser l'appel à l'API de qualité de l'air
fetch(airQualityApiUrl)
    .then(response => response.json())
    .then(data => {
        const features = data.features;
        if (features.length > 0) {
            const firstFeature = features[0];
            const attributes = firstFeature.attributes;

            // Extraire le code_qual
            const codeQual = attributes.code_qual;

            // Comparer le code_qual avec l'indice de qualité de l'air
            let qualitéDeLair = "";
            let icône = "";
            switch (codeQual) {
                case 1:
                    qualitéDeLair = "Bon";
                    icône = "🌞";
                    break;
                case 2:
                    qualitéDeLair = "Moyen";
                    icône = "🌈";
                    break;
                case 3:
                    qualitéDeLair = "Dégradé";
                    icône = "🌫️";
                    break;
                case 4:
                    qualitéDeLair = "Mauvais";
                    icône = "🌪️";
                    break;
                default:
                    qualitéDeLair = "Inconnu";
                    icône = "❓";
            }

            // Créer le contenu HTML
            const airQualityContent = `
                <h3>Qualité de l'air à Nancy</h3>
                <p><strong>Indice de qualité de l'air :</strong> ${codeQual}</p>
                <p><strong>Qualité de l'air :</strong> ${qualitéDeLair} ${icône}</p>
            `;

            // Afficher les données dans le div "weather"
            document.getElementById('airQuality').innerHTML = airQualityContent;
        } else {
            document.getElementById('airQuality').innerHTML = "<p>Aucune donnée trouvée pour Nancy.</p>";
        }
    })
    .catch(error => {
        console.error('Erreur lors de la récupération des données de l\'API :', error);
        document.getElementById('airQuality').innerHTML = "<p>Erreur lors du chargement des données.</p>";
    });
});