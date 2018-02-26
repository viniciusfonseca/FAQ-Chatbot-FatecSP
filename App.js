/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react'
import {
  StyleSheet,
  Text,
  View,
  Alert,
  AsyncStorage
} from 'react-native'
import Flex from './Flex'
import SQLite from 'react-native-sqlite-storage'
import { Container, Header, Left, Body, Right, Button, Icon, Title, Content } from 'native-base'
import accessToken from './accesstoken'
import DialogFlowClient from 'api-ai'

SQLite.enablePromise(true)

const dialogFlowClient = new DialogFlowClient(accessToken)

let db = null

async function query(db, sql) {
  let [qResult] = await db.executeSql(sql)
  let rows = []
  for (let i = 0; i < qResult.rows.length; i++) {
      rows.push(qResult.rows.item(i))
  }
  return rows
}

async function appInit() {
  db = await SQLite.openDatabase({ name : "msgs.db", createFromLocation : "~msgs.db" })

  const sessionId = await AsyncStorage.getItem('sessionId')
  if (!sessionId) {
    await db.executeSql("CREATE TABLE messages content TEXT, isUser INTEGER;")

    await AsyncStorage.setItem('sessionId', +(new Date()).toString(16))
  }

  const messages = (
    await query(db, "SELECT * FROM messages;")
  ).map(({ content, isUser }) => [ content, !!isUser ])

  return { sessionId }
}

function dialogFlowSendMessage(message, sessionId) {
  return new Promise((resolve, reject) => {
    const req = dialogFlowClient.textRequest(message, { sessionId })

    req.on('response', response => resolve(response))
    req.on('error', error => reject(error))

    req.end()
  })
}

export default class App extends Component {

  state = {
    sessionId: "",
    messages: [],
    sendingMessage: false,
    receivingMessage: false
  }

  async componentDidMount() {
    const { sessionId, messages } = await appInit()
    this.setState({ sessionId, messages })

    this.pushMessage("Olá! Em que posso ajudar?", false)
  }

  async onSendMessage(message) {
    const { sessionId } = this.state

    await this.pushMessage(message, true)

    const server_response = await dialogFlowSendMessage(message, sessionId)

    console.log(server_response)

    // const response = ""
    // this.pushMessage(response, false)
  }

  async pushMessage(message, isUser) {
    await db.executeSql(`INSERT INTO messages (content, isUser) VALUES ("${message}", ${+isUser})`)
    this.setState({ messages: [ ...this.state.messages, [ message, isUser ] ] })
  }

  renderMessage(message, isUser) {
    const messageStyle = {
      width: '60%',
      minWidth: 300,
      color: isUser ? '#FFF': '#000',
      backgroundColor: isUser ? '#1E88E5' : '#90CAF9',
      borderRadius: 15
    }
    return (
      <Flex.Row endA={isUser}>
        <View style={messageStyle}>
          <Text>{ message }</Text>
        </View>
      </Flex.Row>
    )
  }

  render() {
    return (
      <Container>
        <Header>
          <Body style={{ flex: 1 }}>
            <Title>FAQ Chatbot - FATEC SP</Title>
          </Body>
          <Button rounded transparent>
            <Icon name="information-circle" />
          </Button>
        </Header>
        <Content>
          <Flex.Column>
            {
              this.state.messages.map(
                ([ message, isUser ]) => renderMessage(message, isUser)
              )
            }
          </Flex.Column>
        </Content>
      </Container>
    )
  }
}
