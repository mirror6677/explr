import firebase from 'firebase'
const fetch = require('node-fetch')
import { types, googleTypes } from '../utils/poiTypes'

var config = {
  apiKey: 'AIzaSyBztce7Z8iOrB5EgV4IE8gjlFGAy6MXSkQ'
}

export function getGeoqueryLocations (region, callback) {
  var ref = firebase.database().ref('pois/')
  var locations = {}
  ref.orderByChild("lat").startAt(region.latitude - region.latitudeDelta/2).endAt(region.latitude + region.latitudeDelta/2).once("value", function(querySnapshot) {
    if (querySnapshot.numChildren()) {
      querySnapshot.forEach(poiSnapshot => {
        if ((region.longitude - region.longitudeDelta/2) <= poiSnapshot.val().long && poiSnapshot.val().long <= (region.longitude + region.longitudeDelta/2)) {
          locations[poiSnapshot.key] = poiSnapshot.val()
        }
      })
      callback(region, locations)
    }
  })
}

export function getLocation (locationId, callback) {
  var ref = firebase.database().ref(`pois/${locationId}`)
  ref.once('value', function(snapshot) {
    if (snapshot.numChildren) {
      callback(snapshot.val())
    }
  })
}

async function getPOIByType (lat, lng, type) {
  return fetch (
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=400&type=${type}&key=${config.apiKey}`
  )
  .then((response) => response.json())
  .then((responseJson) => {
    return responseJson.results
  })
}

export async function getPOIFromLatLng (lat, lng) {
  let results = []
  Object.keys(googleTypes).forEach((type) => {
    results = results.concat(getPOIByType(lat, lng, type)
      .then((result) => {
        return result
      }))
  })
  return results
}

export async function getPOIDetails (placeId) {
  try {
    let poiDetail = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?placeid=${placeId}&key=${config.apiKey}`
    )
    let poiDetailJson = await poiDetail.json()
    return poiDetailJson
  } catch (error) {
    console.error(error) // eslint-disable-line
  }
}

export async function makePhotoRequest (photoReference) {
  try {
    let photoUrl = await fetch(
      `https://maps.googleapis.com/maps/api/place/photo?&maxheight=400&photoreference=${photoReference}&key=${config.apiKey}`
    )
    return photoUrl
  } catch (error) {
    console.error(error) // eslint-disable-line
  }
}

export function getMatchingType (poiTypes) {
  for (let i = 0; i < poiTypes.length; i++) {
    if (Object.keys(types).includes(poiTypes[i])) {
      return poiTypes[i]
    }
  }
  return 'undefined'
}

export function submitPoiToFirebase (poi, photoUrl) {
  if (!checkDuplicateLocation(poi.place_id)) {
    let type = getMatchingType(poi.types)
    firebase.database().ref('pois/' + poi.place_id).set({
      name: poi.name,
      id: poi.place_id,
      image: photoUrl ? photoUrl.url : types[poi.type].defaultPic,
      lat: poi.geometry.location.lat,
      long: poi.geometry.location.lng,
      description: poi.name, // FIX THIS,
      type: type
    })
    return 'success'
  } else {
    return 'failure'
  }
}

function checkDuplicateLocation (locId) {
  firebase.database().ref('pois/').once('value', function(snapshot) {
    return snapshot.hasChild(locId)
  })
}

export async function getPOIAutocomplete (query) {
  const BONSAI_URL = 'https://explrelasticsearch.herokuapp.com'
  let resp = await fetch(
    `${BONSAI_URL}/search_places?q=${query}`
  )
  let data = JSON.parse(resp._bodyText).hits.hits
  var results = []
  data.forEach(function(poi) {
    results.push(poi._source)
  })
  return results
}
