export interface ServiceModule<Form, Config, Quote> {
  id: string;
  displayName: string;

  defaults: Form | (() => Form);
  staticConfig: Config;

  mapBackendConfig?: (raw: unknown) => Partial<Config> | null;
  applyConfigToForm?: (config: Config, form: Form) => Partial<Form>;

  computeQuote: (form: Form, config: Config) => Quote;

  isActive?: (form: Form) => boolean;

  pricingFields?: ReadonlyArray<keyof Form>;
  baseInputFields?: ReadonlyArray<keyof Form>;
  customOverrideFields?: ReadonlyArray<keyof Form>;
  autoClearRules?: ReadonlyArray<{
    when: keyof Form;
    clear: ReadonlyArray<keyof Form>;
  }>;

  priceChangeLog?: {
    productKeyPrefix: string;
    productNamePrefix: string;
    quantityField?: keyof Form;
    frequencyField?: keyof Form;
  };
}

export interface ServiceCalcResult<Form, Config, Quote> {
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
  updateForm: (patch: Partial<Form>) => void;
  setField: <K extends keyof Form>(field: K, value: Form[K]) => void;
  quote: Quote;
  config: Config;
  isLoadingConfig: boolean;
  refreshConfig: (force?: boolean) => void;
  setContractMonths: (months: number) => void;
}
