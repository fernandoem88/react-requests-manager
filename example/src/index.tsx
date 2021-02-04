import React from 'react'
import ReactDOM from 'react-dom'
import { createStore, Store } from 'redux'
import { Provider } from 'react-redux'
// import { Provider } from './components/Provider'
import { reducer, State } from './reducers'
import { configsUtils } from './configs'
import App from './App'
import { $$ } from './RequestsManager'

const initialState = { title: 'title', users: [] }
export const APP_STORE: Store<State, any> = createStore(reducer, initialState)
export const { useSelector: useMixedSelectors } = $$.bindToStateManager(
  APP_STORE
)
const Root = React.memo((props) => {
  return (
    <Provider store={APP_STORE}>
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
