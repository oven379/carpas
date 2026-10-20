import { createApiClient } from './client.js'

const API = createApiClient()


export function getApi() {
  return API
}
