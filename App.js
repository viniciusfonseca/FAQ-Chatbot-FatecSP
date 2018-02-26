import React, { Component } from 'react'
import {
  StyleSheet, Text, View,
  Alert, AsyncStorage,
  TextInput
} from 'react-native'
import Flex from './Flex'
import SQLite from 'react-native-sqlite-storage'
import {
  Container, Header, Left,
  Body, Right, Button,
  Icon, Title, Content,
  Footer, Fab
} from 'native-base'
import accessToken from './accesstoken'
import { ApiAiClient, ApiAiConstants } from 'api-ai-javascript'

const Indigo = "#3F51B5"

SQLite.enablePromise(true)
SQLite.DEBUG(true)

const dialogFlowClient = new ApiAiClient({
  accessToken,
  lang: ApiAiConstants.AVAILABLE_LANGUAGES.PT_BR
})

let db = null

async function query(db, sql) {
  let [ qResult ] = await db.executeSql(sql)
  let rows = []
  for (let i = 0; i < qResult.rows.length; i++) {
      rows.push(qResult.rows.item(i))
  }
  return rows
}

async function appInit() {
  db = await SQLite.openDatabase({
    name : "msgs.db"
  })

  const sessionId = await AsyncStorage.getItem('sessionId')
  if (!sessionId) {
    await db.executeSql("CREATE TABLE IF NOT EXISTS messages (content TEXT, isUser INTEGER);")
    await AsyncStorage.setItem('sessionId', (+(new Date())).toString(16))
  }
  
  const messages = (
    await query(db, "SELECT * FROM messages;")
  ).map(({ content, isUser }) => [ content, !!isUser ])

  return { sessionId, messages }
}

export default class App extends Component {

  state = {
    sessionId: "",
    messages: [],
    sendingMessage: false,
    receivingMessage: false,
    inputText: ""
  }

  async componentDidMount() {

    const {
      sessionId,
      messages
    } = await appInit()

    this.setState({ sessionId, messages })

    console.log("DEBUG", JSON.stringify(messages))

    if (messages.length === 0) {
      this.pushMessage("Olá! Em que posso ajudar?", false)
    }
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

  renderMessage(message, isUser, i) {
    const messageStyle = {
      width: '60%',
      minWidth: 200,
      backgroundColor: isUser ? '#1E88E5' : '#90CAF9',
      borderRadius: 15,
      margin: 8,
      padding: 12
    }
    return (
      <Flex.Row endA={isUser} key={'msg-'+i}>
        <View style={messageStyle}>
          <Text style={{ color: isUser ? '#FFF': '#000' }}>{ message }</Text>
        </View>
      </Flex.Row>
    )
  }

  render() {
    return (
      <Container>
        <Header backgroundColor={Indigo}>
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
                ([ message, isUser ], i) => this.renderMessage(message, isUser, i)
              )
            }
          </Flex.Column>
        </Content>
        <Flex.Row style={{ height: 70, borderWidth: 1, borderStyle: 'solid', borderColor: '#e0e0e0' }}>
          <Flex.Column centerA flex>
            <TextInput underlineColorAndroid={Indigo} value={this.state.inputText} onChangeText={inputText => this.setState({ inputText })}
              style={{ marginRight: 12, marginLeft: 6 }} placeholder="Digite sua mensagem..." />
          </Flex.Column>
          <Fab containerStyle={{ position: 'relative' }} style={{ top: 25, left: 13, backgroundColor: Indigo }}>
            <Icon name="send" />
          </Fab>
        </Flex.Row>
      </Container>
    )
  }
}