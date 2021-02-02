import React from 'react'
import RequestItem from './components/RequestItem'

// import {} from 'react-requests-manager'

const App = React.memo(() => {
  return (
    <div
      style={{ width: '100%', maxWidth: 580, margin: 'auto', marginTop: 50 }}
    >
      <RequestItem requestName={'singleFetch'} />
    </div>
  )
})

export default App
