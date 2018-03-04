import React, { Component } from 'react'
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import firebase from 'firebase'
import { primary, white, liked } from '../utils/colors'

export default class MapMarkerCallout extends Component {
  constructor(props) {
    super(props)
    this.state = {
      liked: false
    }
  }

  componentDidMount() {
    this.checkLiked(this.props.id, this.props.uid)
  }

  async checkLiked(id, uid) {
    var ref = firebase.database().ref('users/main/' + uid + '/saved')
    var liked
    await ref.child(id).once("value", function(snapshot) {
      if (snapshot.val()) {
        liked = true
      } else {
        liked = false
      }
    });
    this.setState({ liked })
  }

  async addLiked() {
    this.setState({
      liked: true
    })

    await firebase.database().ref('users/main/' + this.props.uid + '/saved/' + this.props.id).set({
      name: this.props.title,
      image: this.props.imageUrl
    })
  }

  async removeLiked() {
    this.setState({
      liked: false
    })

    await firebase.database().ref('users/main/' + this.props.uid + '/saved/' + this.props.id).set(null)
  }

  render () {
    return (
      <View style={styles.callout}>
        <Image style={styles.image} source={{uri: this.props.imageUrl}} />
        <View style={styles.wrapper}>
          <TouchableOpacity
            style={styles.titleWrap}
            onPress={() => !this.props.trip && this.props.navigate('LocationPage', {location: this.props})}
          >
            <Text style={styles.title}>
              {this.props.title}
            </Text>
          </TouchableOpacity>
          {!this.props.trip &&
            <TouchableOpacity onPress={() => {this.state.liked ? this.removeLiked() : this.addLiked()}}>
              <FontAwesome name={this.state.liked ? "heart" : 'heart-o'} style={styles.icon}/>
            </TouchableOpacity>
          }
          {this.props.trip &&
            <TouchableOpacity
              onPress={() => this.props.locationPress()}
              style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flex: 1}}
            >
              <Text>Navigate</Text>
              <FontAwesome name='angle-right' style={{fontSize: 30, color: primary}}/>
            </TouchableOpacity>
          }
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  callout: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'white'
  },
  wrapper: {
    flex: 1,
    flexDirection: 'row'
  },
  titleWrap: {
    flex: 3,
  },
  title: {
    flex: 1,
    fontSize: 20,
    marginTop: 10,
    maxWidth: 175,
    color: '#3974d3'
  },
  icon: {
    marginTop: 10,
    fontSize: 25,
    color: liked
  },
  description: {
    fontSize: 12,
    color: 'lightskyblue'
  },
  image: {
    width: 200,
    height: 175,
    borderRadius: 5
  }
})
