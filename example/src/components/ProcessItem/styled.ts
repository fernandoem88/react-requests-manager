import styled from 'styled-components'
import { ProcessStatus } from 'react-requests-manager'

export const Root = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--Root'
})<{ status?: ProcessStatus }>`
  & .request-slider {
    height: 25px;
  }
  & .request-track {
    height: 100%;
    pointer-events: none;
  }
  & .request-track-0 {
    background: ${(p) =>
      p.status === 'processing'
        ? '#888'
        : p.status === 'suspended'
        ? 'purple'
        : p.status === 'aborted'
        ? 'orange'
        : p.status === 'success'
        ? 'green'
        : p.status === 'error'
        ? 'red'
        : '#ccc'};
  }
  & .request-track-1 {
    background: #ccc;
  }
`
Root.displayName = 'RequestItemRoot'
