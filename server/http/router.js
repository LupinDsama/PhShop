/**
 * Router nhẹ cho HTTP: hỗ trợ path param, middleware auth theo route,
 * và error mapping chuẩn.
 */
import { ApiError, notFound } from '../lib/http.js'

export function createRouter() {
  const routes = []

  const add = (method, path, handler, opts = {}) => {
    const keys = []
    const pattern = path
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          keys.push(segment.slice(1))
          return '([^/]+)'
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      })
      .join('/')
    routes.push({
      method,
      regex: new RegExp(`^${pattern}$`),
      keys,
      handler,
      opts,
    })
  }

  return {
    get: (p, h, o) => add('GET', p, h, o),
    post: (p, h, o) => add('POST', p, h, o),
    put: (p, h, o) => add('PUT', p, h, o),
    patch: (p, h, o) => add('PATCH', p, h, o),
    delete: (p, h, o) => add('DELETE', p, h, o),
    routes,
    match(method, pathname) {
      let pathExists = false
      for (const route of routes) {
        const m = route.regex.exec(pathname)
        if (!m) continue
        pathExists = true
        if (route.method !== method) continue
        const params = {}
        route.keys.forEach((key, i) => { params[key] = decodeURIComponent(m[i + 1]) })
        return { route, params }
      }
      if (pathExists) {
        throw new ApiError(405, 'method_not_allowed', 'Phương thức HTTP không được hỗ trợ cho endpoint này.')
      }
      throw notFound('Endpoint không tồn tại.')
    },
  }
}
