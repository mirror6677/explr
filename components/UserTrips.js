import React, { Component } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Button, TextInput } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { white, primary } from '../utils/colors'
import Modal from 'react-native-modal'
import { createTrip, getTrips, addLocationToTrip } from '../network/Requests'
import TripContainer from './TripContainer'

export default class UserTrips extends Component {

	constructor (props) {
		super(props)
		this.state = {
			modalVisible: false,
			newTripName: '',
			trips: []
		}
	}

	componentDidMount () {
		this.retrieveTrips()
	}

	componentWillReceiveProps () {
		this.retrieveTrips()
	}

	retrieveTrips () {
		getTrips(this.props.uid)
		.then((trips) => {
			const updatedTrips = []
			Object.keys(trips).forEach((tripId) => {
				trips[tripId].tripId = tripId
				updatedTrips.push(trips[tripId])
			})
			this.setState({
				trips: updatedTrips
			})
		})
	}

	_keyExtractor = (item, index) => item.tripId

	promptNewTrip () {
		this.setState({ modalVisible: true })
	}

	addLocationToTrip (trip_id, location_id, location_name) {
		addLocationToTrip(this.props.uid, trip_id, location_id, location_name)
		.then(() => {
			this.retrieveTrips()
		})
	}

	finishNewTrip () {
		this.setState({ modalVisible: false, newTripName: '' })
		createTrip(this.props.uid, this.state.newTripName)
		.then(() => {
			this.retrieveTrips()
		})
	}

	render () {
		return (
			<View style={styles.tripsContainer}>
				<Modal
          isVisible={this.state.modalVisible}
					backdropColor={'black'}
					backdropOpacity={0}
					style={{margin: 0}}
        >
					<View style={styles.modalContent}>
						<Text>Enter Trip Name:</Text>
						<TextInput
							style={styles.newTripNameContainer}
							onChangeText={(newTripName) => this.setState({ newTripName })}
						/>
					<View style={styles.submitCancelContainer}>
							<TouchableOpacity  onPress={() => this.setState({ modalVisible: false })}>
								<Text style={{color: primary}}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => this.state.newTripName.length > 0 && this.finishNewTrip()}
							>
								<Text
									style={{color: this.state.newTripName.length > 0 ? primary : 'rgba(0, 0, 0, 0.5)'}}
								>
									Submit
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>
				<TouchableOpacity style={styles.createTripContainer} onPress={() => this.promptNewTrip()}>
					<Text style={{fontSize: 18, fontWeight: 'bold', color: white}}>Create new trip</Text>
					<Ionicons
							name='ios-add-circle-outline'
							size={25}
							style={{ color: white }}
					/>
				</TouchableOpacity>
				{this.state.trips.length > 0 &&
					<FlatList
						style={{width: '100%', paddingBottom: 3}}
						contentContainerStyle={{flexDirection: 'column'}}
						data={this.state.trips}
	  				renderItem={({item}) =>
							<TripContainer
								trip={item}
								navigate={this.props.navigate}
								uid={this.props.uid}
							/>}
						keyExtractor={this._keyExtractor}
					/>
				}
			</View>
		)
	}
}

const styles = StyleSheet.create({
	tripsContainer: {
		flex: 1,
		backgroundColor: white,
		alignItems: 'center',
	},
	createTripContainer: {
		height: 60,
		width: '100%',
		backgroundColor: primary,
		borderTopColor: white,
		borderTopWidth: 1,
		alignSelf: 'center',
		alignItems: 'center',
		padding: 12,
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	modalContent: {
		margin: 0,
		marginTop: 325,
		padding: 20,
		flex: 1,
		backgroundColor: white
	},
	newTripNameContainer: {
		height: 40,
		borderColor: 'gray',
		borderBottomWidth: 1,
		marginTop: 10,
		marginBottom: 10,
		paddingLeft: 5
	},
	submitCancelContainer: {
		justifyContent: 'space-between',
		flexDirection: 'row',
		width: '100%'
	}
})