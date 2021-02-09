import { createActionUtils } from 'react-hooks-in-callback'

// import uniqid from 'uniqid'
import { useDispatch } from 'react-redux'

const getRandomType = () => {
  return getRandomNumber(10) > 3 ? 'success' : 'error'
}

export const getRandomNumber = (max: number = 5) => {
  return Math.round(Math.random() * max)
}

const configureFakeRequest = (
  delay: number = getRandomNumber(2) + 0.5,
  type: 'success' | 'error' = getRandomType()
) => {
  const createFakeRequest = <V extends any>(resultData?: V) => {
    let innerAbort = () => {}
    const send = () =>
      new Promise<V>((resolve, reject) => {
        const to = setTimeout(() => {
          if (type === 'error') {
            reject(new Error('500: Server Error'))
          } else {
            resolve(resultData)
          }
        }, delay * 1000)
        innerAbort = () => {
          clearTimeout(to)
          reject(new Error('Request aborted'))
        }
      })

    return {
      abort: () => {
        innerAbort()
      },
      send
    }
  }
  return createFakeRequest
}

const api = {
  fetchData<Data = undefined>(delay?: number, data?: Data) {
    const fakeRequest = configureFakeRequest(delay)
    return fakeRequest<Data>(data)
  }
}

export const configsUtils = createActionUtils({ api })

export const useActionUtils = () => {
  const dispatch = useDispatch()
  return { dispatch }
}

export default null
