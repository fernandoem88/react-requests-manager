import React, { useState, useEffect } from 'react'
import uniqid from 'uniqid'

import { Root, Header } from './styled'

import { $$, useRequests } from '../../reducers/requests'
import ProcessItem from '../ProcessItem'

interface Props {
  requestName: keyof typeof $$.requests
  duration?: number
}
const RequestItem: React.FC<Props> = (props) => {
  const req = useRequests((reqs) => reqs[props.requestName])
  const [version, setVersion] = useState('')
  const [ids, setIds] = useState<string[]>([])
  useEffect(() => {
    if (req.isProcessing) {
      setVersion(uniqid())
    }
  }, [req.isProcessing])

  return (
    <Root>
      <Header>
        <div>{props.requestName}</div>
        <div>
          {req.isProcessing ? (
            ' is processing'
          ) : (
            <div onClick={() => $$.actions.reset(props.requestName)}>
              {' '}
              Reset
            </div>
          )}
        </div>
      </Header>
      <div>
        {ids.map((id, index) => (
          <ProcessItem
            key={id}
            requestName={props.requestName}
            index={index}
            duration={props.duration}
            version={version}
          />
        ))}
      </div>
      <div
        onClick={() => {
          setIds([...ids, uniqid()])
        }}
      >
        Add process
      </div>
    </Root>
  )
}
export type IRequestItemProps = Props
export default React.memo(RequestItem)
