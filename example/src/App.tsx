import React from 'react'
import RequestItem from './components/RequestItem'

// import {} from 'react-requests-manager'

const App = React.memo(() => {
  return (
    <div style={{ width: '100%', maxWidth: 580, margin: 'auto' }}>
      <RequestItem requestName={'queueRequest'} />
    </div>
  )
})

export default App
