import React from 'react'
import firebase from 'firebase'
const fetch = require('node-fetch')
import { types } from '../utils/poiTypes'

var config = {
  apiKey: 'AIzaSyBztce7Z8iOrB5EgV4IE8gjlFGAy6MXSkQ'
}

export async function createTrip(uid, tripName, tripTags, permission) {
  var tripId = firebase.database().ref(`trips/`).push().key // eslint-disable-line
  await firebase.database().ref(`trips/${tripId}`).update({
    name: tripName,
    tags: tripTags,
    permission: permission,
    numLocs: 0,
    creator: uid,
    locations: {}
  })

  tripTags.forEach(tag => {
    firebase.database().ref(`tags/${tag}/trips`).update({
      [tripId]: Date.now()
    })
    firebase.database().ref(`tags/${tag}/count`).transaction(function(count) {
      count = count ? count + 1 : 1
      return count
    })
  })
}

export async function createTripWithLocation(uid, tripName, tripTags, permission, locationId, locationName) {
  var tripId = firebase.database().ref(`trips/`).push().key // eslint-disable-line
  await firebase.database().ref(`trips/${tripId}`).update({
    name: tripName,
    tags: tripTags,
    permission: permission,
    numLocs: 1,
    creator: uid,
    locations: {
      [locationId]: {
        visited: false,
        name: locationName,
        index: 0
      }
    }
  })

  tripTags.forEach(tag => {
    firebase.database().ref(`tags/${tag}/trips`).update({
      [tripId]: Date.now()
    })
    firebase.database().ref(`tags/${tag}/count`).transaction(function(count) {
      count = count ? count + 1 : 1
      return count
    })
  })
}

export async function editTrip(tripId, name, tags, permission, oldTags) {
  await firebase.database().ref(`trips/${tripId}/`).update({
    name: name,
    tags: tags,
    permission: permission
  })

  tags.forEach(tag => {
    if (oldTags.indexOf(tag) === -1) {
      firebase.database().ref(`tags/${tag}/trips`).update({
        [tripId]: Date.now()
      })
      firebase.database().ref(`tags/${tag}/count`).transaction(function(count) {
        count = count ? count + 1 : 1
        return count
      })
    }
  })

  oldTags.forEach(tag => {
    if (tags.indexOf(tag) === -1) {
      firebase.database().ref(`tags/${tag}/trips/${tripId}`).set(null)
      firebase.database().ref(`tags/${tag}/count`).transaction(function(count) {
        if (count > 1) {
          return count - 1
        }
        return null
      })
    }
  })
}

const checkDuplicateLocationInTrip = (tripId, locationId) => {
  firebase.database().ref(`trips/${tripId}/locations`).once('value', function(snapshot) {
    return snapshot.hasChild(locationId)
  })
}


//Add a new location to a trip
export async function addLocationToTrip(tripId, locationId, locationName) {

  if (checkDuplicateLocation) {
    return 'failure'
  } else {
    var numLocations = 0
    await firebase.database().ref(`trips/${tripId}/numLocs/`).transaction(function(numLocs) {
      numLocations = numLocs
      return numLocs + 1
    })

    await firebase.database().ref(`trips/${tripId}/locations/${locationId}`).set({
      visited: false,
      name: locationName,
      index: numLocations
    })
    return 'success'
  }
}

export async function toggleVisited(tripId, locationId, visited) {
  firebase.database().ref(`trips/${tripId}/locations/${locationId}`).update({
    visited: visited
  })
}

export async function getTrips(uid, callback) {
  firebase.database().ref('trips/').orderByChild('creator').equalTo(uid).on('value', function(snapshot) {
    if (snapshot.numChildren()) {
      callback(snapshot.val())
    }
  })
}

export async function getTrip (tripId) {
  try {
    let trip = await fetch(`https://senior-design-explr.firebaseio.com/trips/${tripId}.json`)
    let tripJson = await trip.json()
    return tripJson
  } catch (error) {
    console.error(error) // eslint-disable-line
    return null
  }
}

export async function getLocations (locationType) {
  try {
    let locations = await fetch(`https://senior-design-explr.firebaseio.com/${locationType}.json`)
    let locationsJson = await locations.json()
    return locationsJson
  } catch (error) {
    // Handle error
    console.error(error) // eslint-disable-line
  }
}

export async function getLocation (locationId) {
  try {
    let location = await fetch (`https://senior-design-explr.firebaseio.com/pois/${locationId}.json`)
    let locationJson = await location.json()
    return locationJson
  } catch (error) {
    console.error(error)
  }
}

export async function getPOIFromLatLng (lat, lng) {
  let results = []
  try {
    let pointsOfInterest = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=500&key=${config.apiKey}`
    )
    let poiJson = await pointsOfInterest.json()
    poiJson.results.forEach((poi) => {
      var type = getMatchingType(poi['types'])
      if (type != 'undefined') {
        results.push(poi)
      }
    })
    return results
  } catch (error) {
    console.error(error)
  }
}

export async function getPOIFromLatLngWithFilter (lat, lng, selectedFilter) {
  try {
    let pointsOfInterest = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=500&type=${selectedFilter}&key=${config.apiKey}`
    )
    let poiJson = await pointsOfInterest.json()
    return poiJson
  } catch (error) {
    console.error(error) // eslint-disable-line
  }
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

export async function submitPoiToFirebase (poi, photoUrl) {
  if (checkDuplicateLocation(poi.place_id)) {
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

const checkDuplicateLocation = (locId) => {
  firebase.database().ref('pois/').once('value', function(snapshot) {
    return snapshot.hasChild(locId)
  })
}

export async function uploadNewProfilePic(base64, uid) {
  var url = 'https://us-central1-senior-design-explr.cloudfunctions.net/profileImageUpload'
  await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid: uid,
      base64: base64
    }),
  })
}

export async function calculateDistance(trip) {
  var urlStart = ''
  var urlEnd = '&waypoints='
  for (var i = 0; i < trip.length; i++) {
    if (i == 0) {
      urlStart += 'origin=place_id:' + trip[i].locId
    } else if (i == trip.length - 1) {
      urlStart += '&destination=place_id:' + trip[i].locId
    } else {
      urlEnd += 'place_id:' + trip[i].locId + '|'
    }
  }

  var urlWaypoints = urlStart + urlEnd
  var urlFinal = 'https://maps.googleapis.com/maps/api/directions/json?' + urlWaypoints + '&key=AIzaSyBbEBNs_oq5jkeq2rRkSd1mKBkVGX7RjGg'

  return fetch(urlFinal).then(function(response) {
    var googleRet = response.json()
    return googleRet.then((data) => {
      var distance = 0
      var parsed = ''
      for (var i = 0; i < (trip.length - 1); i++) {
        parsed = (data.routes[0].legs[i].distance.text)
        parsed = parseFloat(parsed.replace(',','').replace(' mi',''))
        distance += parsed
      }
      return distance
    })
  })
}

export async function optimizeTrip(trip, tripID, tripName, callback) {
  var urlStart = ''
  var urlEnd = '&waypoints=optimize:true|'
  for (var i = 0; i < trip.length; i++) {
    if (i == 0) {
      urlStart += 'origin=place_id:' + trip[i].locId
    } else if (i == trip.length - 1) {
      urlStart += '&destination=place_id:' + trip[i].locId
    } else {
      urlEnd += 'place_id:' + trip[i].locId + '|'
    }
  }

  var urlWaypoints = urlStart + urlEnd
  var urlFinal = 'https://maps.googleapis.com/maps/api/directions/json?' + urlWaypoints + '&key=AIzaSyBbEBNs_oq5jkeq2rRkSd1mKBkVGX7RjGg'

  fetch(urlFinal).then(function(response) {
    const googleRet = response.json()
    googleRet.then((data) => {
      var waypointArr = data.routes[0].waypoint_order

      var resArray = []
      for (var i = 0; i < trip.length; i++) {
        if (i != 0 && i != trip.length - 1) {
        resArray.push(trip[waypointArr[i-1]+1])
        } else {
        resArray.push(trip[i])
        }
      }
      recreateTrip(tripID, tripName, resArray)
      callback(resArray)
    })
  })

}

export async function recreateTrip(tripId, tripName, resArray) {
  await resetTrip(tripId, tripName, resArray)

  var numLocations = -1
  await firebase.database().ref(`trips/${tripId}/numLocs/`).transaction(function(numLocs) {
    numLocations = numLocs
  })
  await addAllLocations(tripId, tripName, resArray)
}

export async function resetTrip(tripId) {
  await firebase.database().ref('trips/' + tripId).update({
    numLocs: 0,
    locations: {}
  })
  return
}

export async function addAllLocations(tripId, tripName, locationArray) {
  for (var i = 0; i < locationArray.length; i++) {
    await addLocationToTrip(tripId, locationArray[i].locId, locationArray[i].name)
  }
  return
}

//Delete a trip
export function deleteTrip(tripId) {
	firebase.database().ref(`trips/${tripId}`).once('value', function(snapshot) {
    if (snapshot.numChildren()) {
      var trip = snapshot.val()
      var followers = trip.followers ? Object.keys(trip.followers) : []
      var participants = trip.participants ? Object.keys(trip.participants) : []
      var tags = trip.tags ? trip.tags : []

      followers.forEach(follower => {
        firebase.database().ref(`users/main/${follower}/followedTrips/${tripId}`).set(null)
      })

      participants.forEach(participant => {
        firebase.database().ref(`users/main/${participant}/joinedTrips/${tripId}`).set(null)
      })

      tags.forEach(tag => {
        firebase.database().ref(`tags/${tag}/trips/${tripId}`).set(null)
        firebase.database().ref(`tags/${tag}/count`).transaction(function(count) {
          if (count > 1) {
            return count - 1
          }
          return null
        })
      })

      firebase.database().ref(`trips/${tripId}`).set(null)
    }
  })
}

//Remove a location
export async function removeLocation(tripId, locationID) {
	await firebase.database().ref(`trips/${tripId}/locations/${locationID}`).set(null)

	var numLocations = 0
	await firebase.database().ref(`trips/${tripId}/numLocs/`).transaction(function(numLocs) {
		numLocations = numLocs
		return numLocs - 1
	})
}

//Mark a location as visited
export async function markVisited(tripId, locationID) {
  await firebase.database().ref(`trips/${tripId}/locations/${locationID}`).update({
    visited: true
  })
}
