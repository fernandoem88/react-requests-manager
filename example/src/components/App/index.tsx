import React from 'react'
import RequestItem from '../RequestItem'
import { useStoreAndRequests } from '../../store'
import { labels } from '../../constants'
import { Header, Result } from './styled'

const App = React.memo(() => {
  const users = useStoreAndRequests((state) => {
    return state.users
  })
  const type = useStoreAndRequests((state) => {
    console.log('useStoreAndRequests', state)
    return state.type
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
