import React, { Component } from 'react'
import { StyleSheet, Text, View, Image, TouchableOpacity, TouchableHighlight } from 'react-native'
import { primary, white, gray, black, liked, transparentWhite } from '../utils/colors'

export default class SearchFilterOption extends Component {
  render () {
    return (
      <TouchableOpacity style={
          [
            styles.optionContainer,
            {borderColor: this.props.color},
            this.props.selected && {borderWidth: 0, backgroundColor: this.props.color}
          ]
      }
      onPress={this.props.handleFilterPress}
      >
        <Text style={this.props.selected ? {color: white} : { color: black }}>
          {this.props.filterName} ({this.props.quantity})
        </Text>
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  optionContainer: {
    borderRadius: 7,
    padding: 10,
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: gray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 1,
    backgroundColor: transparentWhite,
    borderWidth: 1
  },
  selectedContainer: {
    borderColor: white,
  }
})
