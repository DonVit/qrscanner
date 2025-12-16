import { createLogger } from 'redux-logger'

const loggerMiddleware = createLogger({
  collapsed: true,        // collapses logs for readability
  duration: true,         // shows action processing time
  diff: true,             // shows state diffs
})

export default loggerMiddleware
