import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import Metadata from '../src/Types/Metadata'

export default class GirouetteProvider {
  public static needsApplication = true

  constructor(protected app: ApplicationContract) {}

  public register() {
    this.app.container.singleton('SoftwareCitadel/Girouette', () => {
      const { Middleware } = require('../src/Decorators/Middleware')
      const { Get, Post, Put, Patch, Delete } = require('../src/Decorators/RouteDecorators')

      return {
        Middleware,
        Get,
        Post,
        Put,
        Patch,
        Delete,
      }
    })
  }

  public async boot() {
    const Route = this.app.container.use('Adonis/Core/Route')
    const listOfHttpControllerPaths = this.getListOfHttpControllerPaths()

    for (const controllerPath of listOfHttpControllerPaths) {
      const { default: controller } = require(controllerPath)
      const routesMetadata = Reflect.getMetadata('__routes__', controller.prototype) as {
        [propertyKey: string]: Metadata
      }

      for (const [propertyKey, routeMetadata] of Object.entries(routesMetadata)) {
        const route = Route.route(
          routeMetadata.pattern,
          [routeMetadata.method],
          `${controller.name}.${propertyKey}`
        )

        if (routeMetadata.name) {
          route.as(routeMetadata.name)
        }

        if (routeMetadata.middleware) {
          route.middleware(routeMetadata.middleware)
        }
      }
    }
  }

  private getListOfHttpControllerPaths(): string[] {
    let httpControllerNamespace = this.app.namespacesMap.get('httpControllers')!

    for (const [key, value] of Object.entries(this.app.container.importAliases)) {
      if (httpControllerNamespace.startsWith(key)) {
        httpControllerNamespace = httpControllerNamespace.replace(key, value)
        break
      }
    }

    const controllerPaths = this.app.helpers
      .fsReadAll(httpControllerNamespace)
      .map((controller) => httpControllerNamespace + '/' + controller.replace('.ts', ''))

    return controllerPaths
  }
}