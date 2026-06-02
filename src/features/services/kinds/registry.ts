import type { ServiceModule } from "../engine/types";

const REGISTRY = new Map<string, ServiceModule<any, any, any>>();

export function registerService<Form extends object, Config, Quote>(
  module: ServiceModule<Form, Config, Quote>
): ServiceModule<Form, Config, Quote> {
  REGISTRY.set(module.id, module as ServiceModule<any, any, any>);
  return module;
}

export function getServiceModule(id: string): ServiceModule<any, any, any> | undefined {
  return REGISTRY.get(id);
}

export function listServiceModules(): ServiceModule<any, any, any>[] {
  return Array.from(REGISTRY.values());
}

export function listServiceIds(): string[] {
  return Array.from(REGISTRY.keys());
}
