import styled from 'styled-components'

export const Root = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--Root'
})<{ status: 'initial' | 'started' | 'stopped' | 'done' }>`
  & .request-slider {
    height: 25px;
  }
  & .request-track {
    height: 100%;
    pointer-events: none;
  }
  & .request-track-0 {
    background: ${(p) => (p.status !== 'done' ? '#9bd69b' : 'green')};
  }
  & .request-track-1 {
    background: ${(p) => (p.status === 'stopped' ? 'red' : '#ccc')};
  }
`
Root.displayName = 'RequestItemRoot'
