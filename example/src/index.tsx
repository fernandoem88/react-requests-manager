import './index.css'
import { createStore } from 'redux'
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

const store = createStore(() => null)

ReactDOM.render(<App />, document.getElementById('root'))
