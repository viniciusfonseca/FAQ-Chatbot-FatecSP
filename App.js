import React, { Component } from 'react'
import {
  StyleSheet, Text, View,
  Alert, AsyncStorage,
  TextInput, TouchableNativeFeedback,
  ScrollView
} from 'react-native'
import Flex from './Flex'
import SQLite from 'react-native-sqlite-storage'
import {
  Container, Header, Left,
  Body, Right, Button,
  Icon, Title,
  Footer, Fab
} from 'native-base'
import accessToken from './accesstoken'
import { ApiAiClient, ApiAiConstants } from 'api-ai-javascript'
import moment from 'moment'

const Indigo = "#3F51B5"

SQLite.enablePromise(true)
SQLite.DEBUG(true)

const dialogFlowClient = new ApiAiClient({
  accessToken,
  lang: ApiAiConstants.AVAILABLE_LANGUAGES.PT_BR
})

let db = null

async function query(db, sql) {
  sql = sql.replace(/"/g, '""')
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
    await db.executeSql("CREATE TABLE IF NOT EXISTS messages (content TEXT, date TEXT, isUser INTEGER);")
    await AsyncStorage.setItem('sessionId', (+(new Date())).toString(16))
  }
  
  const messages = (
    await query(db, "SELECT * FROM messages;")
  ).map(({ content, date, isUser }) => [ content, !!isUser, date ])

  return { sessionId, messages }
}

function confirm(title, message) {
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: 'OK', onPress: () => resolve(true) },
      { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' }
    ])
  })
}

export default class App extends Component {

  state = {
    sessionId: "",
    messages: [],
    sendingMessage: false,
    receivingMessage: false,
    inputText: ""
  }

  scrollView = null

  async componentDidMount() {

    const {
      sessionId,
      messages
    } = await appInit()

    this.setState({ sessionId, messages })

    console.log("DEBUG", JSON.stringify(messages))

    if (messages.length === 0) {
      this.pushMessage("Olá! Em que posso ajudar?", false, "")
    }

    setTimeout(() => this.scrollView.scrollToEnd(), 300)
  }

  async onSendMessage() {
    const { sessionId, inputText } = this.state
    
    this.setState({ inputText: "" })
    await this.pushMessage(inputText, true)

    this.setState({ receivingMessage: true })

    try {
      const dialogBotResponse = await dialogFlowClient.textRequest(inputText)

      const speech = dialogBotResponse.result.fulfillment.speech

      this.pushMessage(speech, false)
    }
    catch(e) {
      console.log(e)
      Alert.alert("Erro", "Houve um problema com a requisição. Tente novamente mais tarde.")
    }

    this.setState({ receivingMessage: false })    
  }

  async pushMessage(message, isUser) {
    const date = +new Date
    await db.executeSql(`INSERT INTO messages (content, isUser, date) VALUES ("${message}", ${+isUser}, "${date}");`)
    this.setState({ messages: [ ...this.state.messages, [ message, isUser, date ] ] }, () => setTimeout(() => this.scrollView.scrollToEnd(), 300))
  }

  renderMessage(message, isUser, date, i) {
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
        <TouchableNativeFeedback>
          <View style={messageStyle}>
            <Text style={{ color: isUser ? '#FFF': '#000' }}>{ message }</Text>
            <Text style={{ textAlign: isUser ? 'right' : 'left', fontStyle: 'italic', color: isUser? '#e0e0e0' : '#282828', fontSize: 10 }}>{ moment(+date).format("DD/MM/YYYY HH:mm") }</Text>
          </View>
        </TouchableNativeFeedback>
      </Flex.Row>
    )
  }

  async reset() {

    const confirm_reset = await confirm("Aviso", "Deseja mesmo limpar o histórico de conversa? Essa ação não poderá ser desfeita.")
    if (!confirm_reset) {
      return
    }

    await query(db, "DELETE FROM messages;")
    await this.componentDidMount()
  }

  render() {
    return (
      <Container>
        <Header backgroundColor={Indigo}>
          <Body style={{ flex: 1 }}>
            <Title>FAQ Chatbot - FATEC SP</Title>
          </Body>
          <Button rounded transparent onPress={() => this.reset()}>
            <Text style={{ color: '#FFF' }}>LIMPAR</Text>
          </Button>
        </Header>
        <ScrollView ref={scrollView => this.scrollView = scrollView}>
          <Flex.Column>
            {
              this.state.messages.map(
                ([ message, isUser, date ], i) => this.renderMessage(message, isUser, date, i)
              )
            }
          </Flex.Column>
        </ScrollView>
        <Flex.Row style={{ height: 70, borderWidth: 1, borderStyle: 'solid', borderColor: '#e0e0e0' }}>
          <Flex.Column centerA flex>
            <TextInput underlineColorAndroid={Indigo} value={this.state.inputText} onChangeText={inputText => this.setState({ inputText })}
              style={{ marginRight: 12, marginLeft: 6 }} placeholder="Digite sua mensagem..." onSubmitEditing={() => this.onSendMessage()} />
          </Flex.Column>
          <Fab containerStyle={{ position: 'relative' }} style={{ top: 25, left: 13, backgroundColor: this.state.inputText.length > 0 ? Indigo : '#CCC' }}
            onPress={() => this.state.inputText.length > 0 && this.onSendMessage()}>
            <Icon name="send" />
          </Fab>
        </Flex.Row>
      </Container>
    )
  }
}