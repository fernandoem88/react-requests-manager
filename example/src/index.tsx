import React from 'react'
import ReactDOM from 'react-dom'
import { createStore, Store } from 'redux'
import { Provider } from 'react-redux'
import { reducer, State } from './store/reducers'
import { configsUtils } from './configs'
import App from './App'
import { $user } from './store/async'

const initialState = { title: 'title', users: [] }
export const APP_STORE: Store<State, any> = createStore(reducer, initialState)
export const { useSelector: useStoreAndRequests } = $user.bindToStateManager(
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
