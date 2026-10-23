import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findNearestLocation, googleMapsDirectionsUrl} from '../public/locator.mjs';

const locations = [
  {id:'first', latitude:22.28, longitude:114.14},
  {id:'second', latitude:22.29, longitude:114.14},
];

test('findNearestLocation chooses the closest mapped point', () => {
  const result = findNearestLocation({latitude:22.281, longitude:114.14}, locations);
  assert.equal(result.location.id, 'first');
  assert.ok(result.distanceMeters > 0 && result.distanceMeters < 200);
});

test('findNearestLocation rejects invalid positions and empty location data', () => {
  assert.throws(() => findNearestLocation({latitude:NaN, longitude:114.14}, locations), TypeError);
  assert.throws(() => findNearestLocation({latitude:22.28, longitude:114.14}, []), /No mapped bin locations/);
});

test('Google Maps directions include the current position, destination, and walking mode', () => {
  const url = new URL(googleMapsDirectionsUrl(
    {latitude:22.28, longitude:114.14},
    {latitude:22.29, longitude:114.15},
  ));
  assert.equal(url.hostname, 'www.google.com');
  assert.equal(url.searchParams.get('origin'), '22.28,114.14');
  assert.equal(url.searchParams.get('destination'), '22.29,114.15');
  assert.equal(url.searchParams.get('travelmode'), 'walking');
});
