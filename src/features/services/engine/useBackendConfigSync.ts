import { useEffect, useState } from "react";
import { useServicesContextOptional } from "../../../components/services/ServicesContext";
import type { ServiceModule } from "./types";

export function useBackendConfigSync<Form, Config, Quote>(
  module: ServiceModule<Form, Config, Quote>,
  setForm: React.Dispatch<React.SetStateAction<Form>>,
  hasInitialData: boolean
): {
  config: Config;
  isLoadingConfig: boolean;
  refresh: (force?: boolean) => void;
} {
  const ctx = useServicesContextOptional();
  const [config, setConfig] = useState<Config>(module.staticConfig);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  const apply = (rawBackend: unknown, force: boolean = false) => {
    const partial = module.mapBackendConfig?.(rawBackend);
    if (!partial) return;
    const merged = { ...module.staticConfig, ...partial } as Config;
    setConfig(merged);
    if ((!hasInitialData || force) && module.applyConfigToForm) {
      setForm((prev) => ({ ...prev, ...module.applyConfigToForm!(merged, prev) }));
    }
  };

  const refresh = (force: boolean = false) => {
    if (!ctx?.getBackendPricingForService) return;
    setIsLoadingConfig(true);
    try {
      const data = ctx.getBackendPricingForService(module.id);
      if (data?.config) apply(data.config, force);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (!ctx?.getBackendPricingForService) return;
    const data = ctx.getBackendPricingForService(module.id);
    if (data?.config) apply(data.config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.backendPricingData]);

  return { config, isLoadingConfig, refresh };
}
