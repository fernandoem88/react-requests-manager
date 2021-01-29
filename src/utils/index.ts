import getSingle from './request-variants/Single'
import getMulti from './request-variants/Multi'
import getQueue from './request-variants/Queue'
import getCreateRequests from './requests'
import getCreateContext from './context'
import getCreateContextsGroup from './contexts'

export const createRequests = getCreateRequests()
export const createManager = getCreateContext()
export const createGroupManager = getCreateContextsGroup()
export const Single = getSingle()
export const Multi = getMulti()
export const Queue = getQueue()

// const x = createRequests(
//   { requests: { getX: Single(async (ut, id: string) => {}) } },
//   { actions: { abortX() {} } }
// )
