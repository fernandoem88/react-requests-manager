import { configsUtils } from '../configs'
import { useDispatch } from 'react-redux'
import uniqid from 'uniqid'
import { ActionType } from '.'

const { getHookState } = configsUtils
export const dispatchError = (utils: any, error: any) =>
  console.log(
    'process #' + (utils.getProcessState().index + 1) + ' finished with error:',
    error?.message
  )

export const dispatchSuccess = async (utils: any, result: any) => {
  const dispatch = await getHookState(useDispatch)
  const id = uniqid()
  dispatch({ type: ActionType.ADD_USER, payload: { id } })
  console.log(
    'process #' +
      (utils.getProcessState().index + 1) +
      ' completed successfully with result =>',
    result
  )
}
