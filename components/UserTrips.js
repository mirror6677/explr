import React, { Component } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { white, primary } from '../utils/colors'
import { getTrips } from '../network/trips'
import TripContainer from './TripContainer'
import Tags from '../components/Tags'

export default class UserTrips extends Component {

	constructor (props) {
		super(props)
		this.state = {
			newTripName: '',
			trips: []
		}
	}

	componentDidMount () {
		this.retrieveTrips()
	}

	componentWillReceiveProps () {
		this.retrieveTrips()
		if (this.tripsRef && this.tripsRef.off) {
			this.tripsRef.off('value')
		}
	}

	componentWillUnmount() {
		this.tripsRef.off('value')
	}

	retrieveTrips = () => {
		this.tripsRef = getTrips(this.props.uid, this.loadTrips)
	}

	loadTrips = (trips) => {
		const updatedTrips = []
		const { isMyProfile, isFollowing } = this.props
		if (trips && Object.keys(trips).length > 0) {
			Object.keys(trips).forEach((tripId) => {
				if (!isMyProfile) {
					if (trips[tripId].permission === 'Only you') {
						return
					}
				}
				if (!isMyProfile && !isFollowing) {
					if (trips[tripId].permission === 'Followers') {
						return
					}
				}
				trips[tripId].tripId = tripId
				updatedTrips.push(trips[tripId])
			})
			this.setState({
				trips: updatedTrips
			})
		}
	}

	render () {
		let { adding, uid, locationId, locationName, closeModal } = this.props
		return (
			<View style={styles.tripsContainer}>
				{this.props.user &&
					<View style={{width: '100%'}}>
						<TouchableOpacity
							style={styles.createTripContainer}
							onPress={() => {
								adding && closeModal()
								this.props.navigate('CreateTripPage', { adding, uid, locationId, locationName })
							}}>
							<View style={{width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
								<View style={{width: '80%'}}>
								{!this.props.adding &&
									<Text style={{fontSize: 16, fontWeight: 'bold', color: white}}>Create new trip</Text>
								}
								{this.props.adding &&
									<Text style={{fontSize: 16, fontWeight: 'bold', color: white}}>
										Create new trip containing {this.props.locationName}
									</Text>
								}
								</View>
								<Ionicons
									name='ios-add-circle-outline'
									size={25}
									style={{ color: white }}
								/>
							</View>
						</TouchableOpacity>
					</View>
				}
				{this.state.trips && this.state.trips.length > 0 &&
					<View style={{width: '100%', paddingBottom: 3, marginTop: 15}}>
						{this.state.trips.map(item =>
							<TripContainer
								key={item.tripId}
								trip={item}
								navigate={this.props.navigate}
								adding={this.props.adding}
								selectLocation={() => this.props.addLocation(item)}
								user={this.props.user}
								currUser={this.props.currUser}
							/>
						)}
					</View>
				}
				{this.state.trips.length === 0 &&
					<View style={{padding: 10}}>
						<Text>No Trips Yet!</Text>
					</View>
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
		height: '100%'
	},
	createTripContainer: {
		width: '100%',
		backgroundColor: primary,
		alignSelf: 'center',
		alignItems: 'center',
		padding: 10,
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
})
