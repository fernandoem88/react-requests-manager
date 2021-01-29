import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from './components/Provider'
import { reducer } from './reducers'
import { configsUtils } from './configs'
import App from './App'

const initialState = { title: 'title', todoList: [] }
const Root = React.memo((props) => {
  return (
    <Provider reducer={reducer} initialState={initialState}>
      <configsUtils.HooksWrapper />
      {props.children}
    </Provider>
  )
})

ReactDOM.render(
  <Root>
    <App />
  </Root>,
  document.getElementById('root')
)
