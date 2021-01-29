import React, { useEffect, useState } from 'react'
import ReactSlider from 'react-slider'

import { Root } from './styled'

interface Props {
  duration: number
}
const RequestItem: React.FC<Props> = (props) => {
  const { duration } = props
  // const max = duration * 100
  const [value, setValue] = useState(0)
  const [timer, setTimer] = useState(0)
  const [timerStatus, setTimerStatus] = useState<
    'initial' | 'started' | 'stopped' | 'done'
  >('initial')
  useEffect(() => {
    if (timerStatus !== 'started') return
    let d = 0
    const ti = setInterval(() => {
      setTimer((t) => {
        const newT = t + 1
        if (newT > duration) {
          return t
        }
        return newT
      })
      if (d >= duration) {
        clearInterval(ti)
      }
    }, 1000)
    return () => clearInterval(ti)
  }, [duration, timerStatus])
  useEffect(() => {
    let d = 0
    if (timerStatus !== 'started') return
    const ti = setInterval(() => {
      setValue((v) => {
        const newV = v + 1
        d = newV
        if (newV > 100) {
          return v
        }

        return newV
      })
      if (d >= 100) {
        setTimerStatus('done')
        clearInterval(ti)
      }
    }, 10 * duration)
    return () => clearInterval(ti)
  }, [duration, timerStatus])
  return (
    <Root status={timerStatus}>
      <div>
        <ReactSlider
          className='request-slider'
          thumbClassName='request-thumb'
          trackClassName='request-track'
          value={[value, 100]}
          ariaLabel={['Lower thumb', 'Upper thumb']}
          ariaValuetext={(state) => `Thumb value ${state.valueNow}`}
          renderThumb={(thumbProps, state) => {
            if (thumbProps.key === 'request-thumb-1')
              return <div {...thumbProps} />
            return (
              <div {...thumbProps}>
                {timerStatus === 'stopped' || timerStatus === 'done'
                  ? state.valueNow + '%'
                  : ''}
              </div>
            )
          }}
          pearling
          minDistance={0}
        />
        {duration - timer}
      </div>
      <div>
        <div
          onClick={() => {
            setTimer(0)
            setValue(0)
            setTimerStatus('started')
          }}
        >
          start
        </div>
        <div
          onClick={() => {
            setTimerStatus('stopped')
          }}
        >
          abort
        </div>
      </div>
    </Root>
  )
}
export type RequestItemProps = Props
export default React.memo(RequestItem)
