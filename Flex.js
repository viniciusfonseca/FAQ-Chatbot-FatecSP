import React from 'react'
import { View } from 'react-native'

const Row = ({ centerA, centerB, endA, flex, children, style = {} }) => {
    style.flexDirection = 'row'
    if (centerA) style.justifyContent = 'center'
    if (centerB) style.alignItems = 'center'
    if (endA) style.justifyContent = 'flex-end'
    if (flex) style.flex = 1
    return <View style={style}>{ children }</View>
}

const Column = ({ centerA, centerB, endA, flex, children, style = {} }) => {
    style.flexDirection = 'column'
    if (centerA) style.justifyContent = 'center'
    if (centerB) style.alignItems = 'center'
    if (endA) style.justifyContent = 'flex-end'
    if (flex) style.flex = 1
    return <View style={style}>{ children }</View>
}

export default { Row, Column }