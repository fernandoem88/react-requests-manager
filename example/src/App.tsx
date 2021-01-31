import React from 'react'
import RequestItem from './components/RequestItem'

// import {} from 'react-requests-manager'

const App = React.memo(() => {
  return (
    <div>
      <RequestItem requestName={'singleRequest'} />
    </div>
  )
})

export default App
