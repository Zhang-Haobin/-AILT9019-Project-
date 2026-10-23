const EARTH_RADIUS_METERS = 6_371_000;

function radians(degrees) {
  return degrees * Math.PI / 180;
}

function distanceMeters(from, to) {
  const latitudeDifference = radians(to.latitude - from.latitude);
  const longitudeDifference = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDifference / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function findNearestLocation(position, locations) {
  if (!Number.isFinite(position.latitude) || !Number.isFinite(position.longitude)) {
    throw new TypeError('A valid current position is required.');
  }

  let nearest;
  for (const location of locations) {
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
      continue;
    }
    const distance = distanceMeters(position, location);
    if (!nearest || distance < nearest.distanceMeters) {
      nearest = {location, distanceMeters: distance};
    }
  }

  if (!nearest) {
    throw new Error('No mapped bin locations are available.');
  }
  return nearest;
}

export function googleMapsDirectionsUrl(origin, destination) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', `${origin.latitude},${origin.longitude}`);
  url.searchParams.set('destination', `${destination.latitude},${destination.longitude}`);
  url.searchParams.set('travelmode', 'walking');
  return url.href;
}
