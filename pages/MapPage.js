import React, { Component } from 'react'
import {
  StyleSheet,
  Text, // eslint-disable-line no-unused-vars
  Button, // eslint-disable-line no-unused-vars
  TouchableNativeFeedback, // eslint-disable-line no-unused-vars
  View, // eslint-disable-line no-unused-vars
  Animated, // eslint-disable-line no-unused-vars
  Easing,
  Modal,
  ScrollView,
  TouchableOpacity
} from 'react-native'
import firebase from 'firebase'
import { FontAwesome } from '@expo/vector-icons'
import { Location, Permissions } from 'expo'
import MapView from 'react-native-maps' // eslint-disable-line no-unused-vars
import MapMarkerCallout from '../components/MapMarkerCallout'
import {
  getLocations,
  getLocation,
  getPOIFromLatLng,
  getPOIDetails,
  makePhotoRequest,
  submitPoiToFirebase,
  getMatchingType
} from '../network/Requests'
import CustomPinSearch from '../components/CustomPinSearch'
import CategoryFilter from '../components/CategoryFilter'
import { primary, white, gray, compass } from '../utils/colors'
import { types } from '../utils/poiTypes'

export default class MapPage extends Component {
  constructor (props) {
    super(props)

    centerChosenPOI = false

    this.state = {
      region: {
        latitude: 40.9549774,
        longitude: -76.8813942,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      },
      locations: {},
      filteredLocations: {},
      types: {},
      customPinFilterTypes: {},
      customPinSelectedFilters: [],
      customPinSearchCoords: {},
      editingCustomPin: false,
      customPinSearchResults: [],
      filteredCustomPinSearchResults: [],
      selectedFilter: 'park',
      selectedPOI: {},
      atCurrentLocation: false,
      filters: []
    }
  }

  componentDidMount () {
    // Center map at chosen poi if exists
    if (this.props.state.params && this.props.state.params.id) {
      let place_id = this.props.state.params.id
      this.centerChosenPOI = true
      getLocation(place_id).then((data) => {
        var locations = {}
        locations[data.id] = data
        this.setState({
          region: {
            latitude: data.lat,
            longitude: data.long,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          },
          locations: locations
        })
      })
    }
    else {
      this.getCurrentLocation()
    }
  }

  async getCurrentLocation() {
    //const { Location, Permissions } = Expo;
    const { status } = await Permissions.askAsync(Permissions.LOCATION)
    if (status === 'granted') {
      let location = await Location.getCurrentPositionAsync({})
      if (location.coords) {
        var region = {}
        region.latitude = location.coords.latitude
        region.longitude = location.coords.longitude
        region.latitudeDelta = 0.0922
        region.longitudeDelta = 0.0421
        this.setState({ region, atCurrentLocation: true })
      }
      else {
        this.runGeoQuery(this.state.region)
      }
    } else {
      console.log("Permission denied")
    }
  }

  runGeoQuery(region) {
    var ref = firebase.database().ref('pois/')
    var locations = {}
    var self = this
    ref.orderByChild("lat").startAt(region.latitude - region.latitudeDelta/2).endAt(region.latitude + region.latitudeDelta/2).on("value", function(querySnapshot) {
      if (querySnapshot.numChildren()) {
        querySnapshot.forEach(function(poiSnapshot) {
          if ((region.longitude - region.longitudeDelta/2) <= poiSnapshot.val().long && poiSnapshot.val().long <= (region.longitude + region.longitudeDelta/2)) {
            locations[poiSnapshot.key] = poiSnapshot.val()
          }
        });
        self.setState({ locations, filteredLocations: locations })

        var POIs = {};
        for (var key in locations) {
          var retTypes = locations[key].type;
          if (POIs.hasOwnProperty(retTypes) == false) {
            POIs[retTypes] = 1;
          } else {
            POIs[retTypes] += 1;;
          }
        }
        var keysSorted = Object.keys(POIs).sort(function(a,b){return POIs[a]-POIs[b]})
        var types = {};
        for (var i = 0; i < keysSorted.length; i++) {
          types[keysSorted[i]] = POIs[keysSorted[i]];
        }
        self.setState({ types });
      } else {
      }
    })
    this.filterLocations()
  }

  filterLocations () {
    let { filters, locations } = this.state
    let filteredLocations = {}
    if (filters.length > 0) {
      Object.keys(locations).forEach((locId) => {
        if (filters.includes(locations[locId].type)) {
          filteredLocations[locId] = locations[locId]
        } else if (locations[locId].type === undefined && filters.includes('undefined')) {
          filteredLocations[locId] = locations[locId]
        }
      })
    } else {
      filteredLocations = locations
    }
    this.setState({ filteredLocations })
  }

  dropPin (coords) {
    if (!this.state.editingCustomPin) {
      this.setState({
        editingCustomPin: true,
        customPinSearchCoords: coords
      })
      this.searchForPOI(coords)
    }
  }

  searchForPOI (coords) {
    getPOIFromLatLng(coords.latitude, coords.longitude)
      .then((locations) => {
        var POIs = {}
        locations.forEach((location) => {
          var locType = getMatchingType(location['types'])
          if (POIs.hasOwnProperty(locType)) {
            POIs[locType] += 1
          } else {
            POIs[locType] = 1
          }
        })
        this.setState({
          customPinSearchResults: locations,
          filteredCustomPinSearchResults: locations,
          customPinSearchCoords: coords,
          customPinFilterTypes: POIs
        })
      })
  }

  onRegionChangeComplete (region) {
    if (this.centerChosenPOI) {
      this.centerChosenPOI = false
    }
    else {
      this.setState({ region })
      this.runGeoQuery(region);
    }
  }

  handleFilterPress (filterName) {
    this.setState({
      selectedFilter: filterName
    }, () => {
      this.searchForPOI(this.state.customPinSearchCoords)
    })
  }

  filterCustomPinResults (customPinSelectedFilters) {
    let { customPinSearchResults } = this.state
    let filteredResults = []
    if (customPinSelectedFilters.length > 0) {
      customPinSearchResults.forEach((location) => {
        var type = getMatchingType(location['types'])
        if (customPinSelectedFilters.includes(type)) {
          filteredResults.push(location)
        }
      })
    } else {
      filteredResults = customPinSearchResults
    }
    this.setState({ filteredCustomPinSearchResults: filteredResults })
  }

  cancelCustomPin () {
    this.setState({
      editingCustomPin: false,
      customPinSearchCoords: {}
    })
  }

  submitPoi () {
    let poi = this.state.selectedPOI
    let poiType = this.state.selectedFilter
    getPOIDetails(poi.place_id)
      .then((details) => {
          if (details.result.photos) {
            makePhotoRequest(details.result.photos[0].photo_reference)
            .then((photoUrl) => {
              submitPoiToFirebase(poi, photoUrl)
              .then(() => {
                this.updateLocations (poi.place_id)
              })
            })
          } else {
            submitPoiToFirebase(poi, undefined)
            .then(() => {
              this.updateLocations (poi.place_id)
            })
          }
      })
  }

  updateLocations (id) {
    let locations = this.state.locations
    getLocation(id).then((locationData) => {
      locations[id] = locationData
      this.setState({
        locations,
        editingCustomPin: false,
        customPinSearchCoords: {}
      })
    })
  }

  handlePOISelect (poi) {
    this.setState({
      selectedPOI: poi,
      customPinSearchCoords: {
        latitude: poi.geometry.location.lat,
        longitude: poi.geometry.location.lng
      }
    })
  }

  updateFilters (filters) {
    this.setState({ filters }, () => this.filterLocations())
  }

  render() {
    let { locations, filteredLocations } = this.state
    return (
      <View style={styles.container}>
        <MapView
          style={this.state.editingCustomPin ? styles.mapSquished : styles.map}
          initialRegion={this.state.region}
          region={this.state.region}
          onRegionChangeComplete={(region) => this.onRegionChangeComplete(region)}
          onLongPress={e => this.dropPin(e.nativeEvent.coordinate)}
        >
          { Object.keys(filteredLocations).length > 0 &&
            Object.keys(filteredLocations).map((locationId, index) =>
              <MapView.Marker
                key={index}
                coordinate={{
                  latitude: locations[locationId].lat,
                  longitude: locations[locationId].long
                }}
                pinColor={ types[locations[locationId].type].color }
              >
              <MapView.Callout>
                <MapMarkerCallout
                  key={locations[locationId].id}
                  title={locations[locationId].name}
                  imageUrl={locations[locationId].image}
                  id={locations[locationId].id}
                  uid={this.props.uid}
                  navigate={this.props.navigate}
                />
              </MapView.Callout>
              </MapView.Marker>
            )
          }
          { this.state.editingCustomPin &&
            <MapView.Marker
              coordinate={this.state.customPinSearchCoords}
              draggable
              onDragEnd={e => this.searchForPOI(e.nativeEvent.coordinate)}
            />
          }
        </MapView>

        {/* Category Filter */}

        <View style={{position: 'absolute', top: 0, width: '100%', height: 50}}>
          <CategoryFilter
            types={this.state.types}
            updateFilters={(filters) => this.updateFilters(filters)}
          />
        </View>


        { this.state.editingCustomPin &&
          <CustomPinSearch
            types={this.state.customPinFilterTypes}
            updateSelectedFilters={(selectedFilters) => this.filterCustomPinResults(selectedFilters)}
            handleOptionSelect={(selectedOption) => this.handlePOISelect(selectedOption)}
            customPinSearchResults={this.state.filteredCustomPinSearchResults}
            onCancel={() => this.cancelCustomPin()}
            poiSubmit={() => this.submitPoi()}
          />
        }
        <TouchableOpacity style={styles.customPinButtonWrapper}
          onPress={() => this.dropPin({
            latitude: this.state.region.latitude,
            longitude: this.state.region.longitude
          })}>
          <FontAwesome name='map-pin' style={styles.compass}/>
        </TouchableOpacity>
        <TouchableOpacity style={styles.compassWrapper} onPress={() => { this.getCurrentLocation() }}>
          <FontAwesome name='location-arrow' style={styles.compass}/>
        </TouchableOpacity>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  mapSquished: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 250
  },
  googleSearch: {
    height: 300
  },
  customPinBanner: {
    width: '100%',
    height: 50,
    backgroundColor: 'lightblue',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row'
  },
  resultsContainer: {
    width: '100%',
    height: 200,
  },
  poiContainer: {
    width: '100%',
    height: 50,
    borderColor: '#bbb',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingLeft: 20,
    alignItems: 'flex-start',
    justifyContent: 'center'
  },
  filterContainer: {
    width: '100%',
    height: 50,
    position: 'absolute',
    bottom: 250
  },
  compass: {
    fontSize: 20,
    color: gray
  },
  compassWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: white,
    position: 'absolute',
    right: 15,
    bottom: 15,
    shadowColor: gray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 1
  },
  customPinButtonWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: white,
    position: 'absolute',
    left: 15,
    bottom: 15,
    shadowColor: gray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 1
  }
})
