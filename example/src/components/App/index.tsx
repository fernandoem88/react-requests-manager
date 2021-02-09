import React from 'react'
import RequestItem from '../RequestItem'
import { useStoreAndRequests } from '../../store'
import { labels } from '../../constants'
import { Header, Result } from './styled'
// import { $user } from '../../store/async'

const App = React.memo(() => {
  const { type, users } = useStoreAndRequests((state) => {
    return state
  })

  return (
    <div
      style={{ width: '100%', maxWidth: 580, margin: 'auto', marginTop: 50 }}
    >
      <Header>{labels[type]?.descr}</Header>
      <RequestItem />
      <Result>success results dispatched to redux: {users.length}</Result>
    </div>
  )
})

export default App
