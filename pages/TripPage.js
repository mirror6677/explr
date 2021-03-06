import React, { Component } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Button, Platform, NativeModules } from 'react-native'
import Modal from 'react-native-modal'
import { white, primary, transparentWhite, gray, black, progress } from '../utils/colors'
import { FontAwesome, Ionicons } from '@expo/vector-icons'
import { getPOIAutocomplete } from '../network/pois'
import { getTrip, addLocationToTrip, calculateDistance, recreateTrip, optimizeTrip, toggleVisited } from '../network/trips'
import { Toaster } from '../components/Toaster'

const { StatusBarManager } = NativeModules
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBarManager.HEIGHT
const REQUEST_JOIN = 'https:///us-central1-senior-design-explr.cloudfunctions.net/sendTripJoinRequestNotification/'
const FOLLOW_TRIP = 'https:///us-central1-senior-design-explr.cloudfunctions.net/sendTripFollowNotification/'

export default class TripPage extends Component {

  constructor (props) {
    super(props)
    this.state = {
      trip: {},
      tripLocations: [],
      oldTripLocations: [],
      addingLocation: false,
      locations: [],
      editing: false,
      distance: 0,
      errorDisplaying: false
    }
  }

  componentWillMount () {
    this.setState({
      trip: this.props.nav.state.params.trip,
      uid: this.props.nav.state.params.uid,
    }, () => {this.updateTrip()})
  }

  handleTextChange (text) {
		if (!text) {
			this.setState({ locations: [] })
		} else {
			getPOIAutocomplete(text).then((data) => {
				var locations = []
				data.forEach((poi) => {
					locations.push({
						place_id: poi.id,
						name: poi.name
					})
				})
				this.setState({ locations })
			})
		}
	}

  addLocation (trip_id, place_id, location_name) {
		addLocationToTrip(trip_id, place_id, location_name)
    .then((result) => {
      if (result === 'failure') {
        this.displayError()
      } else {
        this.updateTrip()
      }
    })
	}

  updateTrip () {
    getTrip(this.state.trip.tripId, this.onGetTripComplete)
  }

  onGetTripComplete = (trip) => {
    var tripLocations = []
    trip.locations && Object.keys(trip.locations).forEach((locId) => {
      trip.locations[locId].locId = locId
      tripLocations[trip.locations[locId].index] = trip.locations[locId]
    })
    trip.tripId = this.state.trip.tripId
    this.setState({
      tripLocations
    })
    calculateDistance(tripLocations).then((distance) => {
      this.setState({
        distance,
        trip,
        addingLocation: false
      })
    })
  }

  cancelLocationSearch () {
		this.setState({
			addingLocation: false,
			locations: []
		})
	}

  deleteLocation (index) {
    let {tripLocations} = this.state
    let updatedLocations = tripLocations.slice(0, index).concat(tripLocations.slice(index + 1))
    let newLocations = []
    for (i = 0; i < updatedLocations.length; i++) {
      newLocations[i] = Object.assign({}, updatedLocations[i], {index: i})
    }
    this.setState({ tripLocations: newLocations })
  }

  increaseIndex(index) {
    let {tripLocations} = this.state
    let maxIndex = tripLocations.length - 1
    let newLocations = []
    if (index < maxIndex) {
      let updatedLocations =
        tripLocations.slice(0, index)
        .concat(tripLocations[index + 1])
        .concat(tripLocations[index])
        .concat(tripLocations.slice(index + 2))
      for (i = 0; i < updatedLocations.length; i++) {
        newLocations[i] = Object.assign({}, updatedLocations[i], {index: i})
      }
      calculateDistance(newLocations).then((distance) => {
        this.setState({distance, tripLocations: newLocations})
      })
    }
  }

  decreaseIndex(index) {
    let {tripLocations} = this.state
    let newLocations = []
    if (index > 0) {
      let updatedLocations =
        tripLocations.slice(0, index - 1)
        .concat(tripLocations[index])
        .concat(tripLocations[index - 1])
        .concat(tripLocations.slice(index + 1))
      for (i = 0; i < updatedLocations.length; i++) {
        newLocations[i] = Object.assign({}, updatedLocations[i], {index: i})
      }
      calculateDistance(newLocations).then((distance) => {
        this.setState({distance, tripLocations: newLocations})
      })
    }
  }

  editOrSubmit () {
    let { trip } = this.state
    if (!this.state.editing) {
      console.log('editing')
    } else {
      recreateTrip(trip.tripId, this.state.tripLocations)
    }
    this.setState({
      oldTripLocations: this.state.tripLocations,
      editing: !this.state.editing
    })
  }

  optimizeTripCallback = (newTripArray) => {
    calculateDistance(newTripArray).then((distance) => {
      this.setState({distance, tripLocations: newTripArray})
    })
  }

  toggleVisited (locId, index, visited) {
    let { tripLocations } = this.state
    tripLocations[index].visited = !visited
    this.setState({ tripLocations })
    toggleVisited(this.state.trip.tripId, locId, !visited)
  }

  onDeleteTrip = () => {
    this.props.nav.goBack()
  }

  displayError() {
    this.setState({ errorDisplaying: true, addingLocation: false})
    setTimeout(() => {
      this.setState({errorDisplaying: false})
    }, 2000)
  }

  render () {
    let { trip, tripLocations } = this.state
    let { tripId, name, numLocs, tags, followers, participants, creator, permission } = trip
    var numFollowers = followers ? Object.keys(followers).length : 0
    var numParticipants = participants ? Object.keys(participants).length : 0
    return (
      <View style={{backgroundColor: white, height: '100%', position: 'relative'}}>
        {this.state.errorDisplaying &&
          <View style={styles.toaster}>
            <Toaster text='You&apos;ve already added that location to this trip!'/>
          </View>
        }
        <Modal
          isVisible={this.state.addingLocation}
          backdropColor={'black'}
          backdropOpacity={0}
          style={{margin: 0}}
        >
          <View style={styles.modalContent}>
            <View style={styles.searchBarContainer}>
              <TextInput
                placeholder='Search for locations to add...'
                placeholderTextColor={transparentWhite}
                onChangeText={ (text) => this.handleTextChange(text.trim()) }
                autoFocus={ true }
                style={styles.searchBar}
              />
              <Button title='Cancel' color='white' onPress={() => this.cancelLocationSearch()}/>
            </View>
            <ScrollView>
              {this.state.locations.map((location, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.location}
                  onPress={() => this.addLocation(trip.tripId, location.place_id, location.name)}
                >
                  <Text style={{fontSize: 15}}>{location.name}</Text>
                    <Ionicons
                      name='ios-add-circle-outline'
                      size={25}
                      style={{ color: primary }}
                    />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
        <View>
          <View style={styles.profileContainer}>
            <View style={styles.titleWrapper}>
              <Text style={styles.name}>
                { name.length < 25 ? name: (name.slice(0,22) + "...") }
              </Text>
              <TouchableOpacity onPress={() => this.props.nav.navigate('EditTripPage', { tripId: tripId, name: name, tags: tags, perm: permission, onDeleteTrip: this.onDeleteTrip })}>
                <FontAwesome name='pencil-square-o' style={styles.handle}/>
              </TouchableOpacity>
            </View>
            <Text style={styles.subTitle}>
              { numLocs + ' locations \u00b7 ' + numFollowers + ' followers \u00b7 ' + numParticipants + ' participants' }
            </Text>
            { tags ? <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.tagsContainer}>
              { tags.map((tag, index) => (
                <TouchableOpacity style={styles.tag} key={index}>
                  <Text style={styles.tagTitle}>{'#' + tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView> : <View />}
          </View>
          { this.state.editing ?
            <View style={styles.editSubmitContainer}>
              <View style={{position: 'absolute', left: 0}}>
                <TouchableOpacity
                  onPress={() => this.setState({
                    tripLocations: this.state.oldTripLocations,
                    editing: !this.state.editing
                  })}
                  style={styles.cancelSubmitButtonContainer}
                >
                  <Text style={{color: white, fontSize: 16}}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <View style={{position: 'absolute', right: 0}}>
                <TouchableOpacity
                  onPress={() => this.editOrSubmit()}
                  color={white}
                  style={styles.cancelSubmitButtonContainer}
                >
                  <Text style={{color: white, fontSize: 16}}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View> :
            <View style={styles.toolbarContainer}>
              <Text style={{fontSize: 16, fontWeight: 'bold', color: white}}>Manage locations</Text>
              <View style={{flexDirection: 'row'}}>
                <Ionicons
                    name='ios-create-outline'
                    size={25}
                    style={{ color: white, marginRight: 15 }}
                    onPress={() => this.editOrSubmit()}
                />
                <Ionicons
                    name='ios-add-circle-outline'
                    size={25}
                    style={{ color: white }}
                    onPress={() => this.setState({ addingLocation: true })}
                />
              </View>
            </View>
          }
          <ScrollView style={styles.tripLocationsContainer}>
          {tripLocations.length > 0 &&
            tripLocations.map((location) =>
            <View key={location.index} style={styles.tripLocation}>
              {this.state.editing &&
                <TouchableOpacity
                  onPress={() => this.deleteLocation(location.index)}>
                  <Text style={{color: 'red'}}>Delete</Text>
                </TouchableOpacity>
              }

              {/* Location Name */}

              <View style={[this.state.editing && {width: '60%'}, styles.locationNameContainer]}>
                <TouchableOpacity style={!this.state.editing && {width: '75%'}}>
                  <Text style={{fontSize: 15}}>
                    {location.name.split(',')[0]}
                  </Text>
                </TouchableOpacity>
                {!this.state.editing &&
                  <TouchableOpacity
                    style={styles.progressIndicator}
                    onPress={() => this.toggleVisited(location.locId, location.index, location.visited)}>
                      <View style={[location.visited ? {backgroundColor : progress} : {backgroundColor : white}, styles.visitedButton]}>
                        <Text style={location.visited ? {color: white} : {color: progress}}>
                          {location.visited ? 'visited' : 'not visited'}
                        </Text>
                      </View>
                  </TouchableOpacity>
                }
              </View>

              {/* Editing */}

              {this.state.editing &&
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <TouchableOpacity style={[{marginRight: 10}, styles.moveTrip]}
                    onPress={() => this.increaseIndex(location.index)}>
                    <Ionicons
                        name='ios-arrow-round-down'
                        size={35}
                        style={{ color: primary, borderRadius: 50 }}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={[{marginLeft: 10}, styles.moveTrip]}
                    onPress={() => this.decreaseIndex(location.index)}>
                    <Ionicons
                        name='ios-arrow-round-up'
                        size={35}
                        style={{ color: primary }}
                    />
                  </TouchableOpacity>
                </View>
              }
            </View>
          )}
          {tripLocations.length === 0 &&
            <View style={{width: '100%', justifyContent: 'center', paddingTop: 10}}>
              <Text>You haven't added any locations yet!</Text>
            </View>
          }
          </ScrollView>
        </View>
        <View style={styles.distanceContainer}>
          <Text style={{color: white, fontSize: 16}}>Distance: {this.state.distance} miles</Text>
          {!this.state.editing &&
            <TouchableOpacity style={styles.optimizeButton}
              onPress={() => this.state.tripLocations.length > 2 &&
                this.props.nav.navigate(
                  'OptimizeTripPage',
                  {
                    nav: this.props.nav,
                    locs: this.state.tripLocations,
                    tripName: this.state.trip.name,
                    tripId: this.state.trip.tripId,
                    trip: this.state.trip,
                    uid: this.state.uid,
                    onGoBack: (newTripArray) => this.optimizeTripCallback(newTripArray)
                  }
                )
              }
            >
              <Text style={{color: white}}>Optimize Route</Text>
            </TouchableOpacity>
          }
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  profileContainer: {
    padding: 20
  },
  titleWrapper: {
    flexDirection: 'row'
  },
  name: {
    marginTop: 5,
    fontSize: 20,
    color: black,
    fontWeight: 'bold'
  },
  handle: {
    marginTop: 7,
    fontSize: 20,
    color: gray,
    fontWeight: 'bold',
    marginLeft: 10
  },
  subTitle: {
    marginTop: 10,
    color: black
  },
  tagsContainer: {
    flexDirection: 'row',
    marginTop: 20
  },
  tag: {
    alignItems: 'center',
    backgroundColor: primary + '77',
    borderColor: primary + '55',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
    marginRight: 6,
  },
  tagTitle: {
    color: black,
    fontSize: 15,
    fontWeight: 'normal',
  },
  editSubmitContainer: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: primary
  },
  tripLocationsContainer: {
    borderTopWidth: 1,
    borderColor: primary,
    marginBottom: 250,
  },
  tripLocation: {
    width: '96%',
    alignSelf: 'center',
    borderBottomColor: gray,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 15,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moveTrip: {
    padding: 5,
    borderWidth: 1,
    borderColor: primary,
    borderRadius: 50
  },
  toolbarContainer: {
		height: 50,
		width: '100%',
		backgroundColor: primary,
		alignSelf: 'center',
		alignItems: 'center',
		padding: 10,
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
  modalContent: {
		margin: 0,
    marginTop: STATUSBAR_HEIGHT,
		padding: 0,
		flex: 1,
		backgroundColor: white
	},
  searchBarContainer: {
		width: '100%',
		height: 50,
		backgroundColor: primary,
		justifyContent: 'space-between',
		alignItems: 'center',
		flexDirection: 'row'
	},
  location: {
		height: 44,
		width: '96%',
    alignSelf: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingLeft: 10,
		paddingRight: 10,
		borderBottomWidth: 1,
		borderColor: gray
	},
  searchBar: {
    width: '80%',
    height: 50,
    color: white,
    fontSize: 15,
    paddingLeft: 10
  },
  locationNameContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 5,
    paddingRight: 5,
    flexDirection: 'row'
  },
  distanceContainer: {
    height: 50,
    flexDirection: 'row',
    backgroundColor: primary,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 10
  },
  optimizeButton: {
    backgroundColor: primary,
    borderRadius: 5,
    borderColor: 'white',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    marginRight: 10
  },
  cancelSubmitButtonContainer: {
    backgroundColor: primary,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  progressIndicator: {
    width: '25%',
    justifyContent: 'center',
    alignItems: 'flex-end'
  },
  visitedButton: {
    padding: 5,
    borderWidth: 2,
    borderColor: progress,
    borderRadius: 5
  },
  toaster: {
    width: '100%',
    position: 'absolute',
    top: 155,
    zIndex: 3
  }
})
