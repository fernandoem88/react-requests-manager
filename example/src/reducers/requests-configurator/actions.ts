import { requestUtils } from './'
import * as requests from './requests'

export const reset = (requestName: keyof typeof requests) => {
  requestUtils.resetRequest(requestName)
}
export const clearError = (requestName: keyof typeof requests) => {
  requestUtils.clearErrors(requestName)
}
export const abort = (params: {
  requestName: keyof typeof requests
  id?: string
}) => {
  const { requestName, id } = params
  requestUtils.abort(requestName, (pcss) => pcss.id === id)
}
export const abortAll = () => {
  requestUtils.abort()
}
