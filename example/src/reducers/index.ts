import { State } from '../components/Provider'

export enum ActionType {
  ADD_TODO,
  DELETE_TODO,
  SET_TODO_LIST
}

export const reducer = (
  state: State,
  action: { type: ActionType; payload: any }
) => {
  switch (action.type) {
    case ActionType.ADD_TODO:
      return { ...state, todoList: [...state.todoList, action.payload] }
    case ActionType.DELETE_TODO:
      return {
        ...state,
        todoList: state.todoList.filter((todo) => todo.id !== action.payload)
      }
    case ActionType.SET_TODO_LIST:
      return { ...state, todoList: action.payload }
    default:
      return state
  }
}
