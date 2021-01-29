import React from 'react'
import RequestItem from './components/RequestItem'

import {} from 'react-requests-manager'

const App = React.memo((props) => {
  return (
    <div>
      <RequestItem duration={3} /> {props.children}
    </div>
  )
})

export default App
