import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

// MUI's useMediaQuery hooks uses window.matchMedia
// https://github.com/mui-org/material-ui/blob/next/packages/material-ui/src/useMediaQuery/useMediaQuery.js
beforeAll(() => {
  global.window.matchMedia = () => ({
    matches: true,
    addListener: () => {},
    removeListener: () => {},
  })
})

afterAll(() => {
  delete global.window.matchMedia
})

it('renders without crashing', () => {
  const div = document.createElement('div')
  ReactDOM.render(<App />, div)
  ReactDOM.unmountComponentAtNode(div)
})
