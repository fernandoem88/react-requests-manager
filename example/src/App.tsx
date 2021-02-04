import React from 'react'
import RequestItem from './components/RequestItem'

import { useStoreAndRequests } from './index'
import Todo from './components/ProcessItem/User'

const App = React.memo(() => {
  const users = useStoreAndRequests((state) => {
    return state.users
  })
  return (
    <div
      style={{ width: '100%', maxWidth: 580, margin: 'auto', marginTop: 50 }}
    >
      <RequestItem />
      <div>
        {users.map((user) => (
          <Todo key={user.id} {...user} />
        ))}
      </div>
    </div>
  )
})

export default App
