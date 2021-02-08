import React from 'react'
import { useStoreAndRequests } from '../../index'

import { ActionType, State } from '../../store/reducers'
import { useDispatch } from 'react-redux'
import { Root } from './styled'

interface Props {
  id: string
}
const User: React.FC<Props> = React.memo((props) => {
  const dispatch = useDispatch()

  const user = useStoreAndRequests((state: State) =>
    state.users.find((td) => td.id === props.id)
  )
  if (!user) return null
  return (
    <Root>
      <div>{user.id}</div>
      <div
        onClick={() => {
          dispatch({ type: ActionType.DELETE_USER, payload: user.id })
        }}
      >
        remove
      </div>
    </Root>
  )
})
export type IUserProps = Props
export default React.memo(User)