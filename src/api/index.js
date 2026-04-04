import { createApiClient } from './client.js'

const API = createApiClient()

export function createApi() {
  return API
}

export function getApi() {
  return API
}
