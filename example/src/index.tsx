import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { configsUtils } from './configs'
import App from './components/App'
import { APP_STORE } from './store'

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
