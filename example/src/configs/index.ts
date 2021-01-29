import { createActionUtils } from 'react-hooks-in-callback'

// import uniqid from 'uniqid'
import { useDispatch } from '../components/Provider'

const getRandomType = () => {
  return getRandomNumber(10) > 3 ? 'success' : 'error'
}

const getRandomNumber = (max: number = 5) => {
  return Math.round(Math.random() * max)
}

const configureFakeRequest = (
  delay: number = getRandomNumber(2) + 0.5,
  type: 'success' | 'error' = getRandomType()
) => {
  const createFakeRequest = <V extends any>(resultData?: V) => {
    let to: any
    const execute = () =>
      new Promise<V>((resolve, reject) => {
        to = setTimeout(() => {
          if (type === 'error') {
            reject(resultData)
          } else {
            resolve(resultData)
          }
        }, delay * 1000)
      })

    return {
      abort: () => clearTimeout(to),
      execute
    }
  }
  return createFakeRequest
}

const api = {
  // getTodo: (delay: number = 1) => {
  //   const getTimer = configureFakeRequest(delay)
  //   const id = uniqid()
  //   const todo = {
  //     id,
  //     rate: 4 // random value
  //   }
  //   return getTimer(todo)
  // },
  // deleteTodo(delay: number = 1) {
  //   const fakeRequest = configureFakeRequest(delay)
  //   return fakeRequest<void>()
  // },
  testRequest(delay?: number) {
    const fakeRequest = configureFakeRequest(delay)
    return fakeRequest<void>()
  }
}

export const configsUtils = createActionUtils({ api })

export const useActionUtils = () => {
  const dispatch = useDispatch()
  return { dispatch }
}

export default null
