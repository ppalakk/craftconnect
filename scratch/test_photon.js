async function testPhotonAndOverpass() {
  const lat = 27.1752554;
  const lon = 78.0098161;

  // 1. Photon by Komoot (OSM-based, very fast, worldwide, free)
  console.log('Testing Photon by Komoot...');
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=craft&lat=${lat}&lon=${lon}&limit=10`;
    const res = await fetch(photonUrl, { headers: { 'User-Agent': 'CraftConnect/2.0' } });
    const data = await res.json();
    console.log(`Photon craft results for Agra:`, data.features?.length);
    if (data.features?.length) {
      data.features.slice(0, 5).forEach(f => {
        console.log(` - ${f.properties.name} (${f.properties.osm_value}) in ${f.properties.city || f.properties.state || f.properties.country}`);
      });
    }
  } catch (e) {
    console.log('Photon error:', e.message);
  }

  // 2. Overpass with lightweight node query
  console.log('\nTesting lightweight Overpass node query...');
  const query = `[out:json][timeout:10];
node(around:15000,${lat},${lon})[shop];
out 10;`;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'CraftConnect/2.0' }
    });
    console.log('Overpass status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log(`Overpass shop nodes:`, data.elements?.length);
      data.elements?.slice(0, 5).forEach(e => {
        console.log(` - ${e.tags.name || 'Shop'} (${e.tags.shop}) [${e.lat}, ${e.lon}]`);
      });
    }
  } catch (e) {
    console.log('Overpass error:', e.message);
  }
}

testPhotonAndOverpass().catch(console.error);

