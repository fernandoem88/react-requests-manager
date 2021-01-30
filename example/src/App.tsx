import React from 'react'
import RequestItem from './components/RequestItem'

// import {} from 'react-requests-manager'

const App = React.memo((props) => {
  return (
    <div>
      <RequestItem requestName={'queueRequest'} />
      {props.children}
    </div>
  )
})

export default App
