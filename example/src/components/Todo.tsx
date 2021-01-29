import React from 'react'
import { useDispatch, useStateSelector } from './Provider'
import { ActionType } from '../reducers'

interface Props {
  id: string
}
const Todo: React.FC<Props> = (props) => {
  const dispatch = useDispatch()
  const todo = useStateSelector((state) =>
    state.todoList.find((td) => td.id === props.id)
  )
  if (!todo) return null
  return (
    <div>
      <div>
        {todo.id} - ({todo.rate})
      </div>
      <div
        onClick={() => {
          dispatch({ type: ActionType.DELETE_TODO, payload: props.id })
        }}
      >
        remove
      </div>
    </div>
  )
}
export type ITodoProps = Props
export default React.memo(Todo)
